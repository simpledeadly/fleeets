import { serve } from 'std/http/server.ts'
import { createClient } from 'supabase'
import { logger } from 'logger'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { itemId, agentId, customInput } = await req.json()

    // 1. Получаем полные данные (Юзер + Агент + Задача + Родитель)
    const { data: item } = await supabase
      .from('items')
      .select(
        `*, profiles(manifesto), parent:parent_id(content, description, metadata)`
      )
      .eq('id', itemId)
      .single()

    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()

    // 2. Формируем контекст проекта (Манифест проекта)
    const projectManifesto =
      item.parent?.description ||
      item.metadata?.project_context ||
      'Общий контекст'

    // 3. Вызов Google Gemini
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const model = agent.model_settings.model

    const prompt = `
      ${agent.system_prompt}
      ---
      CONTEXT: ${projectManifesto}
      USER PREFERENCES: ${item.profiles.manifesto}
      ---
      ITEM: ${item.content}
      ${customInput ? `ADDITIONAL INFO: ${customInput}` : ''}
    `

    const aiStartTime = Date.now()

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )

    const rawData = await aiRes.json()
    if (rawData.error) throw new Error(`Gemini Error: ${rawData.error.message}`)

    const aiContent = rawData.candidates[0].content.parts[0].text
    const result = JSON.parse(aiContent)

    const usage = rawData.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
    }

    const aiDuration = Date.now() - aiStartTime

    // 4. Мутации базы (Выполнение интента)
    if (
      (result.intent === 'CREATE_CHILDREN' || result.data) &&
      Array.isArray(result.data)
    ) {
      console.log(`Inserting ${result.data.length} subtasks...`)

      const { error: insertError } = await supabase.from('items').insert(
        result.data.map((child: any) => ({
          content: child.content,
          priority: child.priority,
          parent_id: item.id,
          user_id: item.user_id,
          scope: item.scope,
          status: 'inbox',
          type: 'task',
          metadata: { agent_source: agent.name },
        }))
      )
      if (insertError) throw insertError
      console.log(result.data.log_message)
    }

    // 5. Единое логгирование через наш новый адаптер
    await Promise.all([
      logger.usage({
        userId: item.user_id,
        model: model,
        action: 'agent_decompose',
        inputTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
      }),
      logger.activity({
        userId: item.user_id,
        source: 'agent-adapter',
        category: 'item.decompose',
        details: {
          itemId: item.id,
          agentName: agent.name,
          intent: result.intent,
          msg: result.log_message,
          duration_ms: aiDuration,
        },
      }),
    ])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }
})

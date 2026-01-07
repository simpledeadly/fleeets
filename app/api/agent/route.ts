import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processAgentTask } from '@/features/agents'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const result = await processAgentTask({
      agentId: body.agentId,
      userId: user.id,
      isTest: body.isTest || false,
      context: {
        query: body.query || '',
        scope: body.scope || 'general',
        itemId: body.itemId,
        itemIds: body.itemIds,
      },
    })

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('AGENT ADAPTER ERROR:', e.message)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

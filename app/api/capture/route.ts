// app/api/capture/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await request.json()
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  // Прямой вызов "мозга"
  const { data, error } = await supabase.functions.invoke('process-item', {
    body: {
      user_id: user.id,
      raw_text: text,
      metadata: { source: 'web-input' },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

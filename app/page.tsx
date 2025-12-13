import { createClient } from "@/lib/supabase/server" // <-- Исправили путь
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

export default async function Home() {
  const supabase = await createClient()

  // 1. Получаем пользователя
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Получаем задачи (только INBOX)
  const { data: tasks } = user
    ? await supabase
      .from("items")
      .select("*")
      .eq("status", "inbox")
      .order("created_at", { ascending: false })
    : { data: null }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">

        {/* ЗАГОЛОВОК */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">
            Fleeets
          </h1>
          <p className="text-muted-foreground text-sm">
            Inbox Zero Protocol
          </p>
        </div>

        {/* СПИСОК ЗАДАЧ */}
        <div className="space-y-4">
          {!user ? (
            <div className="p-6 border rounded-xl text-center bg-secondary/20 space-y-4">
              <p>Система безопасности активна.</p>
              {/* Временная ссылка на логин для разработчика */}
              <a
                href="/login"
                className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                Войти (Dev)
              </a>
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground animate-pulse">
              📭 Инбокс пуст.
            </div>
          ) : (
            tasks?.map((task) => (
              <div
                key={task.id}
                className="group relative flex flex-col gap-2 p-4 border rounded-xl bg-card hover:bg-secondary/10 transition-all duration-200"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="uppercase tracking-widest font-mono text-[10px]">
                    {task.type}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(task.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>
                <p className="text-lg font-medium leading-snug">
                  {task.content}
                </p>
                {task.metadata?.source === 'voice' && (
                  <span className="text-xs text-blue-500 font-mono">🎤 AUDIO RECORD</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
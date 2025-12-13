import { createClient } from "@/lib/supabase/server"
import InboxDeck from "@/app/components/InboxDeck" // <-- Импорт

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Берем только статус 'inbox'
  const { data: tasks } = user
    ? await supabase
      .from("items")
      .select("*")
      .eq("status", "inbox")
      .order("created_at", { ascending: false }) // Свежие сверху
    : { data: null }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background overflow-hidden">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">

        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold tracking-tighter">Fleeets</h1>
          <p className="text-muted-foreground text-sm">Разбери хаос</p>
        </div>

        {/* Если не вошел */}
        {!user && (
          <a href="/login" className="btn btn-primary">Войти (Dev)</a>
        )}

        {/* КОЛОДА КАРТ */}
        {user && tasks && (
          <InboxDeck initialTasks={tasks} />
        )}

      </div>
    </main>
  )
}
import { AdminDashboard } from '@/features/admin'
import { createAdminClient } from '@/lib/supabase/admin' // 👈 ВАЖНО: Админский клиент
import { createClient } from '@/lib/supabase/server' // Обычный для проверки аутентификации
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  // 1. Проверка: А ты вообще админ? (Используем обычный клиент для проверки сессии)
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  // ⚠️ ХАРДКОД: Вставь сюда свой email или ID
  if (!user || user.email !== 'dsikachenko@gmail.com') {
    // redirect('/') 
  }

  // 2. Получение данных (Используем АДМИНСКИЙ клиент, чтобы видеть ВСЁ)
  const supabaseAdmin = createAdminClient()

  const { data: usageData } = await supabaseAdmin
    .from('usage_logs')
    .select('cost_usd, model, action, created_at, user_id')
    .order('created_at', { ascending: true })

  if (!usageData) return <div>Нет данных</div>

  // --- АНАЛИТИКА ---

  // 1. Общие цифры
  const totalCost = usageData.reduce((acc, curr) => acc + (curr.cost_usd || 0), 0)
  const totalRequests = usageData.length

  // 2. Группировка по Моделям
  const modelUsage: Record<string, number> = {}
  usageData.forEach(row => {
    modelUsage[row.model] = (modelUsage[row.model] || 0) + (row.cost_usd || 0)
  })

  // 3. Группировка по Юзерам (Кто тратит больше всех?)
  const userStats: Record<string, { cost: number, requests: number }> = {}

  usageData.forEach(row => {
    const uid = row.user_id || 'anonymous'
    if (!userStats[uid]) userStats[uid] = { cost: 0, requests: 0 }

    userStats[uid].cost += (row.cost_usd || 0)
    userStats[uid].requests += 1
  })

  // Превращаем в массив и сортируем
  const topUsers = Object.entries(userStats)
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10) // Топ 10 транжир

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Центр Управления (God Mode)</h1>
        <div className="text-xs font-mono bg-muted p-2 rounded">
          Admin: {user?.email}
        </div>
      </div>

      <AdminDashboard
        totalCost={totalCost}
        totalRequests={totalRequests}
        modelUsage={modelUsage}
        rawLogs={usageData}
        topUsers={topUsers}
      />
    </div>
  )
}
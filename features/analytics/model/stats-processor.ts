// features/analytics/model/stats-processor.ts

export function processStats(logs: any[]) {
  // 1. KPI
  const kpi = {
    totalEvents: logs.length,
    focusMinutes: 0,
    triageCount: 0,
    createdCount: 0,
  }

  // 2. ДЛЯ ГРАФИКОВ ПО ДНЯМ (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      dateObj: d,
      name: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' }),
      created: 0,
      completed: 0,
      focusMinutes: 0,
    }
  })

  // 3. ДЛЯ ЧАСОВ
  const activityByHour = Array(24)
    .fill(0)
    .map((_, i) => ({ hour: i, count: 0 }))

  // 4. ДЛЯ ТЕГОВ
  const tagStats: Record<string, number> = {}

  // 5. ДЛЯ ВОРОНКИ
  const triageStats = { planned: 0, today: 0, deleted: 0, archived: 0 }

  // --- ГЛАВНЫЙ ЦИКЛ ---
  logs.forEach((log) => {
    const logDate = new Date(log.created_at)
    const dayKey = logDate.toLocaleDateString('ru-RU', {
      weekday: 'short',
      day: 'numeric',
    })
    const dayStat = last7Days.find((d) => d.name === dayKey)
    const hour = logDate.getHours()

    // Activity Heatmap
    activityByHour[hour].count += 1

    // KPI Counters
    if (log.category === 'item.create') {
      kpi.createdCount++
      if (dayStat) dayStat.created++
    }

    if (log.category === 'item.triage' || log.category === 'inbox_triage') {
      kpi.triageCount++
      const dest = log.details.destination
      if (dest === 'planned') triageStats.planned++
      if (dest === 'today') triageStats.today++
      if (dest === 'deleted') triageStats.deleted++
      if (dest === 'archived') triageStats.archived++

      // Считаем закрытыми задачи, ушедшие в архив или удаленные
      if (dayStat && (dest === 'archived' || dest === 'deleted'))
        dayStat.completed++
    }

    if (
      log.category === 'item.status_change' &&
      (log.details.to === 'done' || log.details.to === 'archived')
    ) {
      if (dayStat) dayStat.completed++
    }

    if (log.category === 'focus.session' || log.category === 'deep_work') {
      const duration =
        log.details.duration_seconds ||
        (new Date(log.ended_at).getTime() -
          new Date(log.started_at).getTime()) /
          1000
      const minutes = Math.max(0, Math.round(duration / 60))

      kpi.focusMinutes += minutes
      if (dayStat) dayStat.focusMinutes += minutes

      // Tags
      if (log.details.tags) {
        log.details.tags.forEach((tag: string) => {
          tagStats[tag] = (tagStats[tag] || 0) + minutes
        })
      }
    }
  })

  // Финализация структур данных
  const radarData = Object.entries(tagStats)
    .map(([tag, mins]) => ({ subject: tag, A: mins }))
    .sort((a, b) => b.A - a.A)
    .slice(0, 6)

  const funnelData = [
    { name: 'В план', value: triageStats.planned, color: '#3b82f6' },
    { name: 'В фокус', value: triageStats.today, color: '#f59e0b' },
    { name: 'В архив', value: triageStats.archived, color: '#8b5cf6' },
    { name: 'Удалено', value: triageStats.deleted, color: '#ef4444' },
  ].filter((i) => i.value > 0)

  return { kpi, activityByHour, dailyStats: last7Days, radarData, funnelData }
}

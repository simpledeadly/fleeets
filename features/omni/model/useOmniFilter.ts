import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store'
import { useOmniStore } from './store'

export function useOmniFilter() {
  const { items } = useStore()
  const visibleLimit = useOmniStore((state) => state.visibleLimit)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [isQuick, setIsQuick] = useState<boolean | null>(false)
  const [isTask, setIsTask] = useState<boolean | null>(false)
  const [isThought, setIsThought] = useState<boolean | null>(false)
  const [isNote, setIsNote] = useState<boolean | null>(false)
  const [isResource, setIsResource] = useState<boolean | null>(false)

  // Топ теги
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {}
    items.forEach((item) => {
      item.ai_tags?.forEach(
        (tag) => (tagCounts[tag] = (tagCounts[tag] || 0) + 1)
      )
    })
    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])
  }, [items])

  // Фильтрация
  const visibleItems = useMemo(() => {
    // 1. Базовый фильтр (не во входящих и не удалено)
    let result = items.filter(
      (item) => item.status !== 'inbox' && item.status !== 'deleted'
    )

    // 2. Статус (Фокус, План и т.д.) - это жесткое условие (AND)
    if (activeStatus) {
      result = result.filter((item) => item.status === activeStatus)
    }

    // 3. Типы и Теги - между собой работают по ИЛИ
    const activeFilters = {
      isQuick,
      isTask,
      isThought,
      isNote,
      isResource,
      tags: activeTags,
    }

    const hasAnyTypeOrTagFilter =
      isQuick ||
      isTask ||
      isThought ||
      isNote ||
      isResource ||
      activeTags.length > 0

    if (hasAnyTypeOrTagFilter) {
      result = result.filter((item) => {
        const matchesQuick = isQuick && item.is_quick
        const matchesTask = isTask && item.type === 'task'
        const matchesThought = isThought && item.type === 'thought'
        const matchesNote = isNote && item.type === 'note'
        const matchesResource = isResource && item.type === 'resource'
        const matchesTags = activeTags.some((tag) =>
          item.ai_tags?.includes(tag)
        )

        return (
          matchesQuick ||
          matchesTask ||
          matchesThought ||
          matchesNote ||
          matchesResource ||
          matchesTags
        )
      })
    }

    // 4. Поиск - отдельный фильтр (AND)
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter((item) => {
        return (
          item.content.toLowerCase().includes(lowerQuery) ||
          (item.description &&
            item.description.toLowerCase().includes(lowerQuery)) ||
          (item.raw_content &&
            item.raw_content.toLowerCase().includes(lowerQuery)) ||
          (item.execution_log &&
            item.execution_log.toLowerCase().includes(lowerQuery)) ||
          item.ai_tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        )
      })
    }

    if (activeStatus === 'done') {
      result.sort((a, b) => {
        const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return dateB - dateA
      })
    } else {
      result.sort((a, b) => {
        const dateA = a.triaged_at ? new Date(a.triaged_at).getTime() : 0
        const dateB = b.triaged_at ? new Date(b.triaged_at).getTime() : 0
        return dateB - dateA
      })
    }

    const isInitialState =
      !searchQuery &&
      !activeStatus &&
      !isQuick &&
      !isTask &&
      !isThought &&
      !isNote &&
      !isResource &&
      activeTags.length === 0

    return !isInitialState ? result.slice(0, visibleLimit) : result.slice(0, 5)
  }, [
    items,
    activeStatus,
    isQuick,
    isTask,
    isThought,
    isNote,
    isResource,
    activeTags,
    searchQuery,
    visibleLimit,
  ])

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const setVisibleLimit = useOmniStore((state) => state.setVisibleLimit)

  return {
    searchQuery,
    setSearchQuery,
    activeStatus,
    setActiveStatus,
    isQuick,
    setIsQuick,
    isTask,
    setIsTask,
    isThought,
    setIsThought,
    isNote,
    setIsNote,
    isResource,
    setIsResource,
    activeTags,
    toggleTag,
    // foundItems,
    visibleItems,
    topTags,
    isDefaultView: !searchQuery && !activeStatus && activeTags.length === 0,
    visibleLimit,
    setVisibleLimit,
  }
}

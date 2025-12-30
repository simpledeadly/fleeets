import { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useOmniStore } from './store'

export function useOmniFilter() {
  const { items } = useStore()
  const { isPaletteOpen } = useOmniStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [isQuick, setIsQuick] = useState<boolean | null>(false)
  const [isTask, setIsTask] = useState<boolean | null>(false)
  const [isThought, setIsThought] = useState<boolean | null>(false)
  const [isNote, setIsNote] = useState<boolean | null>(false)
  const [isResource, setIsResource] = useState<boolean | null>(false)

  // Сброс при закрытии
  useEffect(() => {
    if (!isPaletteOpen) {
      const t = setTimeout(() => {
        setActiveStatus(null)
        setIsQuick(null)
        setIsThought(null)
        setActiveTags([])
        setSearchQuery('')
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isPaletteOpen])

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
    let result = items.filter(
      (item) => item.status !== 'inbox' && item.status !== 'deleted'
    )

    if (activeStatus)
      result = result.filter((item) => item.status === activeStatus)
    if (isQuick) result = result.filter((item) => item.is_quick === isQuick)
    if (isTask) result = result.filter((item) => item.type === 'task')
    if (isThought) result = result.filter((item) => item.type === 'thought')
    if (isNote) result = result.filter((item) => item.type === 'note')
    if (isResource) result = result.filter((item) => item.type === 'resource')

    if (activeTags.length > 0) {
      result = result.filter((item) => {
        if (!item.ai_tags) return false
        return activeTags.every((t) => item.ai_tags!.includes(t))
      })
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter((item) => {
        return (
          item.content.toLowerCase().includes(lowerQuery) ||
          (item.description &&
            item.description.toLowerCase().includes(lowerQuery)) ||
          (item.raw_content &&
            item.raw_content.toLowerCase().includes(lowerQuery)) ||
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

    return activeStatus || searchQuery.trim() !== ''
      ? result.slice(0, 50)
      : result.slice(0, 5)
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
  ])

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

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
  }
}

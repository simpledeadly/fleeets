import { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useCommandCenterStore } from './store'

export function useOmniFilter() {
  const { items } = useStore()
  const { isPaletteOpen } = useCommandCenterStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])

  // Сброс при закрытии
  useEffect(() => {
    if (!isPaletteOpen) {
      const t = setTimeout(() => {
        setActiveStatus(null)
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
    return Object.keys(tagCounts)
      .sort((a, b) => tagCounts[b] - tagCounts[a])
      .slice(0, 8)
  }, [items])

  // Фильтрация
  const filteredItems = useMemo(() => {
    let result = items

    if (activeStatus) result = result.filter((i) => i.status === activeStatus)

    if (activeTags.length > 0) {
      result = result.filter(
        (i) => i.ai_tags && activeTags.every((t) => i.ai_tags!.includes(t))
      )
    }

    if (searchQuery.trim() !== '') {
      const lower = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.content.toLowerCase().includes(lower) ||
          i.ai_tags?.some((t) => t.toLowerCase().includes(lower))
      )
    }

    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    return result.slice(0, 40)
  }, [items, activeStatus, activeTags, searchQuery])

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
    activeTags,
    toggleTag,
    filteredItems,
    topTags,
    isDefaultView: !searchQuery && !activeStatus && activeTags.length === 0,
  }
}

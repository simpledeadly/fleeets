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
  const visibleItems = useMemo(() => {
    let result = items.filter(
      (item) => item.status !== 'inbox' && item.status !== 'deleted'
    )

    // А. Фильтр по статусу
    if (activeStatus) {
      // Мы уже отфильтровали inbox и deleted, так что здесь всё ок
      result = result.filter((item) => item.status === activeStatus)
    }

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
          item.ai_tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
        )
      })
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
    visibleItems,
    topTags,
    isDefaultView: !searchQuery && !activeStatus && activeTags.length === 0,
  }
}

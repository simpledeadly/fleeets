'use client'

import { useState, useEffect } from 'react'
import { createScope, updateScope, deleteScope } from '../model/actions'
import { useScopeStore, Scope } from '../model/store'
import { toast } from 'sonner'
import {
  X,
  Trash2,
  Save,
  Box,
  Globe,
  Palette,
  Layout,
  FileText,
  Link2,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScopeDialogProps {
  isOpen: boolean
  onClose: () => void
  scopeToEdit?: Scope | null // Если null - режим создания
}

// Helper to HSL->Hex
function hslToHex(h: number, s: number, l: number) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Helper to Hex->HSL
function hexToHsl(hex: string) {
  let r = 0,
    g = 0,
    b = 0
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1])
    g = parseInt('0x' + hex[2] + hex[2])
    b = parseInt('0x' + hex[3] + hex[3])
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2])
    g = parseInt('0x' + hex[3] + hex[4])
    b = parseInt('0x' + hex[5] + hex[6])
  }
  r /= 255
  g /= 255
  b /= 255
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin
  let h = 0,
    s = 0,
    l = 0

  if (delta === 0) h = 0
  else if (cmax === r) h = ((g - b) / delta) % 6
  else if (cmax === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  h = Math.round(h * 60)
  if (h < 0) h += 360
  l = (cmax + cmin) / 2
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  s = +(s * 100).toFixed(1)
  l = +(l * 100).toFixed(1)

  return { h, s, l }
}

export function ScopeDialog({
  isOpen,
  onClose,
  scopeToEdit,
}: ScopeDialogProps) {
  const { addScope, updateScopeInStore, removeScopeFromStore } = useScopeStore()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [manifesto, setManifesto] = useState('')
  const [viewType, setViewType] = useState('roadmap')
  const [accent, setAccent] = useState('#3b82f6')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Is this the "General" scope?
  const isGeneral = slug === 'general' || scopeToEdit?.slug === 'general'

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setName(scopeToEdit?.name || '')
      setSlug(scopeToEdit?.slug || '')
      setDescription(scopeToEdit?.description || '')
      setManifesto(scopeToEdit?.manifesto || '')
      setViewType(scopeToEdit?.view_type || 'roadmap')
      setAccent(scopeToEdit?.theme_config?.accent || '#3b82f6')
    }
  }, [isOpen, scopeToEdit])

  // Logic: Generate completely random pastel color
  const generateRandomPastel = () => {
    // Hue: any
    const h = Math.floor(Math.random() * 360)
    // Saturation: 70-90% for vibrancy
    const s = 70 + Math.random() * 20
    // Lightness: 75-85% for pastel look
    const l = 75 + Math.random() * 10

    setAccent(hslToHex(h, s, l))
  }

  // Logic: Convert user picked color to pastel equivalent
  const handleColorChange = (hex: string) => {
    // 1. Get Hue from user's color
    const { h } = hexToHsl(hex)
    // 2. Force Pastel Saturation/Lightness
    const s = 80 // Fixed high saturation
    const l = 80 // Fixed high lightness

    // 3. Set the "Pastelized" version of their color
    setAccent(hslToHex(h, s, l))
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const updates = {
        name,
        slug,
        description,
        manifesto,
        view_type: viewType,
        theme_config: {
          ...scopeToEdit?.theme_config,
          accent,
        },
      }

      if (scopeToEdit) {
        // UPDATE
        const updated = await updateScope(scopeToEdit.id, updates)
        updateScopeInStore(scopeToEdit.id, updated)
        toast.success('Проект обновлен')
      } else {
        // CREATE
        const created = await createScope(name, viewType, updates)
        addScope(created)
        toast.success('Проект создан')
      }
      onClose()
    } catch (e: any) {
      toast.error('Ошибка: ' + (e.message || e))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!scopeToEdit || !confirm('Удалить проект безвозвратно?')) return
    setIsSubmitting(true)
    try {
      await deleteScope(scopeToEdit.id)
      removeScopeFromStore(scopeToEdit.id)
      toast.success('Проект удален')
      onClose()
    } catch (e) {
      toast.error(`Ошибка удаления: ${e}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: accent }}
            >
              <Box size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-none flex items-center gap-2">
                {scopeToEdit ? 'Настройки проекта' : 'Новый проект'}
                {isGeneral && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] uppercase font-bold">
                    General
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {scopeToEdit
                  ? `ID: ${scopeToEdit.id}`
                  : 'Создайте пространство для ваших идей'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-[70vh] max-h-[800px]"
        >
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* 1. БАЗОВАЯ ИНФО */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <FileText size={14} /> Название
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-medium"
                  placeholder="Например: Разработка Fleeets"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Link2 size={14} /> Slug (URL)
                </label>
                <div className="relative">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={isGeneral}
                    className={cn(
                      'w-full bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-mono',
                      isGeneral
                        ? 'opacity-50 cursor-not-allowed bg-muted'
                        : 'focus:border-primary focus:ring-1 focus:ring-primary'
                    )}
                    placeholder="fleeets-dev"
                    required
                  />
                  {isGeneral && (
                    <div className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-bold uppercase">
                      Locked
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. ОПИСАНИЕ */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Globe size={14} /> Краткое описание
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-muted/20 border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="В одной фразе: чем занимается этот проект?"
              />
            </div>

            {/* 3. МАНИФЕСТ */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <FileText size={14} /> Манифест Проекта
              </label>
              <textarea
                value={manifesto}
                onChange={(e) => setManifesto(e.target.value)}
                className="w-full bg-muted/20 border border-border rounded-xl px-4 py-3 text-sm h-32 resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all custom-scrollbar font-medium"
                placeholder="Опиши суть, цели и правила этого проекта для ИИ-агентов..."
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Этот текст передается всем Агентам как системная инструкция при
                работе в контексте данного проекта.
              </p>
            </div>

            {/* 4. ВИЗУАЛИЗАЦИЯ И ЦВЕТ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Layout size={14} /> Вид по умолчанию
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['roadmap', 'kanban', 'list', 'graph'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setViewType(t)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-bold capitalize transition-all',
                        viewType === t
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'border-border bg-muted/20 text-muted-foreground hover:border-border/80 hover:bg-muted/40'
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Palette size={14} /> Акцентный цвет
                </label>
                <div className="flex items-center gap-2">
                  {isGeneral ? (
                    <div className="text-xs text-muted-foreground italic px-2">
                      Системный цвет
                    </div>
                  ) : (
                    <>
                      <div className="relative group">
                        <input
                          type="color"
                          value={accent}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="w-12 h-12 rounded-xl bg-muted/20 border-0 cursor-pointer p-0 overflow-hidden"
                        />
                        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 pointer-events-none" />
                      </div>

                      <div className="flex-1 flex gap-2">
                        <input
                          value={accent}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="w-full bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-primary transition-all"
                        />
                        <button
                          type="button"
                          onClick={generateRandomPastel}
                          className="px-3 py-1 bg-linear-to-tr from-pink-500/20 to-blue-500/20 hover:from-pink-500/30 hover:to-blue-500/30 border border-border rounded-lg text-primary hover:text-foreground transition-all active:scale-95 flex items-center justify-center group"
                          title="Сгенерировать случайный пастельный цвет"
                        >
                          <Wand2
                            size={16}
                            className="group-hover:rotate-12 transition-transform"
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ФУТЕР */}
          <div className="shrink-0 px-8 py-5 border-t border-border bg-muted/10 flex items-center justify-between">
            {scopeToEdit ? (
              isGeneral ? (
                <div className="text-xs text-muted-foreground italic">
                  Системный проект нельзя удалить
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                  <Trash2 size={16} /> Удалить проект
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />{' '}
                {scopeToEdit ? 'Сохранить изменения' : 'Создать проект'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

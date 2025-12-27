import { Moon, Sun, Laptop, Zap } from 'lucide-react'

export interface ThemeOption {
  id: string
  label: string
  icon: React.ElementType
  previewClass: string
}

export const THEME_PRESETS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Светлая',
    icon: Sun,
    // Чистый белый с легкой тенью
    previewClass: 'bg-white text-black border border-gray-200',
  },
  {
    id: 'dark',
    label: 'Тёмная',
    icon: Moon,
    // Глубокий серый (не черный), как в iOS
    previewClass: 'bg-[#1C1C1E] text-white border border-white/10',
  },
  {
    id: 'system',
    label: 'Авто',
    icon: Laptop,
    // Элегантный градиент
    previewClass:
      'bg-linear-to-br from-gray-100 to-gray-800 text-gray-500 border border-white/10',
  },
  {
    id: 'cyberpunk',
    label: 'Неон',
    icon: Zap,
    // Ядовитый лайм, а не горчица
    previewClass: 'bg-[#CCFF00] text-black border-none font-bold',
  },
]

export type SubscriptionTier = 'free' | 'pro'

export interface FeatureConfig {
  tier: SubscriptionTier // Минимальный тариф для доступа
  limit?: number // Лимит для Free тарифа (если есть)
  title: string // Заголовок для модалки продаж
  description: string // Текст для модалки
}

// Ключи фич (для автокомплита в IDE)
export type FeatureKey = keyof typeof PAYWALL_CONFIG

export const PAYWALL_CONFIG = {
  // 1. Бинарные фичи (Доступно / Недоступно)
  ai_analysis: {
    tier: 'pro',
    title: 'Подключи Второй Мозг',
    description:
      'AI-анализ позволяет мгновенно выделять суть, теги и связи. Доступно в PRO.',
  },
  blitz_mode: {
    tier: 'pro',
    title: 'Войди в состояние потока',
    description:
      'Блиц-режим ускоряет разбор входящих в 3 раза. Доступно в PRO.',
  },
  proactive_semantic_search: {
    tier: 'pro',
    title: 'Узнай что ты уже добавил',
    description:
      'Получай информацию о похожих заметках прямо при вводе. Доступно в PRO.',
  },

  // 2. Количественные лимиты
  active_items: {
    tier: 'free',
    limit: 50, // На бесплатном - 50 задач. На PRO - безлимит.
    title: 'Лимит продуктивности',
    description:
      'Ты создал 50 активных задач. Разгреби завалы или переходи на безлимит.',
  },
} as const satisfies Record<string, FeatureConfig>

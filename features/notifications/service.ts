'use client'

import { toast } from 'sonner'
// import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
// import React from 'react'

type NotificationType = 'success' | 'error' | 'info' | 'warning'

// const getIcon = (type: NotificationType): React.ReactElement => {
//   switch (type) {
//     case 'success':
//       return <CheckCircle2 className="text-green-500" />
//     case 'error':
//       return <XCircle className="text-red-500" />
//     case 'info':
//       return <Info className="text-blue-500" />
//     case 'warning':
//       return <AlertTriangle className="text-amber-500" />
//     default:
//       // На случай, если что-то пойдет не так, вернем пустой фрагмент
//       return <></>
//   }
// }

interface ToastOptions {
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function notify(
  type: NotificationType,
  message: string,
  options: ToastOptions = {}
) {
  toast(message, {
    description: options.description,
    duration: options.duration || 4000,
    action: options.action,
    // icon: getIcon(type), // 👈 Вызываем функцию
    classNames: {
      toast: 'dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50',
      actionButton: 'dark:bg-primary dark:text-primary-foreground',
    },
  })
}

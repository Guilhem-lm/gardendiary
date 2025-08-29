import { createToaster } from '@melt-ui/svelte'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastData {
  type: ToastType
  title?: string
  description: string
  dismissible?: boolean
  progress?: number
  duration?: number
}

const toaster = createToaster<ToastData>()

export const toasts = toaster.states.toasts

type ToastOptions = {
  type?: ToastType
  title?: string
  duration?: number
}

export function toast(message: string, options: ToastOptions = {}) {
  const { type = 'info', title, duration = 5000 } = options

  toaster.helpers.addToast({
    data: {
      type,
      title,
      description: message,
      dismissible: true,
      duration,
    },
  })
}

export function removeToast(id: string) {
  toaster.helpers.removeToast(id)
}

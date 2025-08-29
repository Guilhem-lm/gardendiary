<script lang="ts">
  import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-svelte'
  import { melt } from '@melt-ui/svelte'
  import { fade, fly } from 'svelte/transition'
  import { toasts, removeToast } from './toast'
  import type { ToastType, ToastData } from './toast'

  const icons: Record<string, typeof Info> = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  }

  const colors: Record<string, string> = {
    info: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    success: 'bg-lime-50 dark:bg-lime-950 text-lime-600 dark:text-lime-400',
    warning: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    error: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
  }
</script>

<div class="fixed top-4 right-4 z-5000 flex flex-col gap-2">
  {#each $toasts as toast (toast.id)}
    {@const Icon = icons[toast.data?.type || 'info']}
    <div
      class="w-80 overflow-hidden rounded-lg shadow-lg"
      in:fly={{ x: 100, duration: 300 }}
      out:fade={{ duration: 200 }}
    >
      <div class="flex items-start gap-3 p-4 {colors[toast.data?.type || 'info']}">
        <Icon size={20} />
        <div class="flex-1 pt-0.5">
          {#if toast.data?.title}
            <p class="font-medium">{toast.data.title}</p>
          {/if}
          <p class="text-sm">{toast.data?.description}</p>
        </div>
        {#if toast.data?.dismissible}
          <button
            class="text-current opacity-50 hover:opacity-100 transition-opacity"
            onclick={() => removeToast(toast.id)}
          >
            <X size={16} />
          </button>
        {/if}
      </div>
      {#if toast.data?.progress !== undefined}
        <div class="h-1 w-full bg-black/10 dark:bg-white/10">
          <div
            class="h-full bg-current transition-all duration-300 ease-linear"
            style:width="{toast.data.progress * 100}%"
          ></div>
        </div>
      {/if}
    </div>
  {/each}
</div>

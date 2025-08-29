<script lang="ts">
  import { EllipsisVertical, Trash2, Droplets, TriangleAlert, Pen } from 'lucide-svelte'
  import { createDropdownMenu, createDialog, melt } from '@melt-ui/svelte'
  import { fade, scale } from 'svelte/transition'
  import type { Container } from './types'
  import { toast } from './toast'

  interface Props {
    container: Container
    onDelete: () => void
    onWater: () => void
  }

  const { container, onDelete, onWater }: Props = $props()

  const {
    elements: { trigger, menu, overlay, item: menuItem },
    states: { open },
  } = createDropdownMenu({
    positioning: {
      placement: 'bottom-end',
    },
    preventScroll: true,
    loop: true,
  })

  const {
    elements: {
      trigger: dialogTrigger,
      overlay: dialogOverlay,
      content: dialogContent,
      title,
      description,
      close,
    },
    states: { open: dialogOpen },
  } = createDialog({
    forceVisible: false,
    preventScroll: true,
  })
</script>

<button
  use:melt={$trigger}
  class="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
  aria-label="Container actions"
>
  <EllipsisVertical size={20} />
</button>

{#if $open}
  <div
    use:melt={$overlay}
    class="fixed inset-0 bg-black/20 dark:bg-black/50"
    transition:fade={{ duration: 100 }}
  ></div>
{/if}

<div
  use:melt={$menu}
  class="bg-white dark:bg-stone-800 rounded-lg shadow-lg py-1 w-36 z-50"
  transition:scale={{ duration: 150, start: 0.95 }}
>
  <button
    use:melt={$menuItem}
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700 outline-none focus:bg-stone-100 dark:focus:bg-stone-700"
    onclick={async () => {
      try {
        await onWater()
        toast('Plants watered successfully', { type: 'success' })
      } catch (error) {
        toast('Failed to update watering time', { type: 'error' })
      }
    }}
  >
    <Droplets size={16} />
    Water Plants
  </button>

  <button
    use:melt={$menuItem}
    use:melt={$dialogTrigger}
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700 outline-none focus:bg-stone-100 dark:focus:bg-stone-700"
  >
    <Trash2 size={16} />
    Delete
  </button>
</div>

{#if $dialogOpen}
  <div
    use:melt={$dialogOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$dialogContent}
    class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-50"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <TriangleAlert size={24} />
      <h2 use:melt={$title} class="text-lg font-semibold">Delete Container</h2>
    </div>

    <p use:melt={$description} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete "{container.name}"? This action cannot be undone.
    </p>

    <div class="flex justify-end gap-3 mt-6">
      <button
        use:melt={$close}
        class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        onclick={async () => {
          try {
            await onDelete()
            toast('Container deleted successfully', { type: 'success' })
          } catch (error) {
            toast('Failed to delete container', { type: 'error' })
          }
          $dialogOpen = false
        }}
      >
        Delete Container
      </button>
    </div>
  </div>
{/if}

<script lang="ts">
  import { MoreVertical, Edit2, Trash2, Droplets, AlertTriangle } from 'lucide-svelte'
  import { createPopover, createDialog, melt } from '@melt-ui/svelte'
  import { fade, scale } from 'svelte/transition'
  import type { Container } from './types'

  interface Props {
    container: Container
    onEdit: () => void
    onDelete: () => void
    onWater: () => void
  }

  const { container, onEdit, onDelete, onWater } = $props()

  const {
    elements: { trigger, content, arrow, overlay: popoverOverlay },
    states: { open: popoverOpen },
  } = createPopover({
    forceVisible: false,
    positioning: {
      placement: 'bottom-end',
    },
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
  })
</script>

<button
  use:melt={$trigger}
  class="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
  aria-label="Container actions"
>
  <MoreVertical size={20} />
</button>

{#if $popoverOpen}
  <div
    use:melt={$popoverOverlay}
    class="fixed inset-0 bg-black/20 dark:bg-black/50"
    transition:fade={{ duration: 100 }}
  ></div>
{/if}

<div use:melt={$content} class="bg-white dark:bg-stone-800 rounded-lg shadow-lg py-1 w-36 z-50">
  <div use:melt={$arrow}></div>
  <button
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
    onclick={() => {
      onWater()
      $popoverOpen = false
    }}
  >
    <Droplets size={16} />
    Water Plants
  </button>
  <button
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
    onclick={() => {
      onEdit()
      $popoverOpen = false
    }}
  >
    <Edit2 size={16} />
    Edit
  </button>
  <button
    use:melt={$dialogTrigger}
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700"
    onclick={() => {
      $popoverOpen = false
    }}
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
      <AlertTriangle size={24} />
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
        onclick={() => {
          onDelete()
          $dialogOpen = false
        }}
      >
        Delete Container
      </button>
    </div>
  </div>
{/if}

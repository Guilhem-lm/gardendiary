<script lang="ts">
  import { MoreVertical, Edit2, Trash2 } from 'lucide-svelte'
  import { createPopover, melt } from '@melt-ui/svelte'
  import { fade } from 'svelte/transition'
  import type { Container } from './types'

  interface Props {
    container: Container
    onEdit: () => void
    onDelete: () => void
  }

  const { container, onEdit, onDelete } = $props()

  const {
    elements: { trigger, content, arrow, overlay },
    states: { open },
  } = createPopover({
    forceVisible: false,
    positioning: {
      placement: 'bottom-end',
    },
  })
</script>

<button
  use:melt={$trigger}
  class="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
  aria-label="Container actions"
>
  <MoreVertical size={20} />
</button>

{#if $open}
  <div
    use:melt={$overlay}
    class="fixed inset-0 bg-black/20 dark:bg-black/50"
    transition:fade={{ duration: 100 }}
  ></div>
{/if}

<div use:melt={$content} class="bg-white dark:bg-stone-800 rounded-lg shadow-lg py-1 w-36 z-50">
  <div use:melt={$arrow}></div>
  <button
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
    onclick={() => {
      onEdit()
      $open = false
    }}
  >
    <Edit2 size={16} />
    Edit
  </button>
  <button
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700"
    onclick={() => {
      onDelete()
      $open = false
    }}
  >
    <Trash2 size={16} />
    Delete
  </button>
</div>

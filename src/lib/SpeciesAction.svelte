<script lang="ts">
  import { createDialog, createDropdownMenu, melt } from '@melt-ui/svelte'
  import { EllipsisVertical, Trash2 } from 'lucide-svelte'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { fade, scale } from 'svelte/transition'

  const { specie, onDelete } = $props()

  // Species actions dropdown
  const {
    elements: { trigger: dropdownTrigger, menu: dropdownMenu, item: menuItem },
    states: { open: dropdownOpen },
  } = createDropdownMenu({
    positioning: {
      placement: 'bottom-end',
    },
    preventScroll: true,
    loop: true,
    closeOnOutsideClick: false,
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
    preventScroll: true,
  })
</script>

<button
  use:melt={$dropdownTrigger}
  class="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
  aria-label="Species actions"
>
  <EllipsisVertical size={20} />
</button>

<div
  use:melt={$dropdownMenu}
  class="bg-white dark:bg-stone-800 rounded-lg shadow-sm py-1 w-36 z-50"
  transition:scale={{ duration: 150, start: 0.95 }}
>
  <button
    use:melt={$menuItem}
    use:melt={$dialogTrigger}
    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700 outline-none focus:bg-stone-100 dark:focus:bg-stone-700"
    onclick={() => {
      $dropdownOpen = false
    }}
  >
    <Trash2 size={16} />
    Delete
  </button>
</div>

{#if $dialogOpen}
  <div
    use:melt={$dialogOverlay}
    class="fixed inset-0 bg-black/10 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$dialogContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <Trash2 size={24} />
      <h2 use:melt={$title} class="text-lg font-semibold">Delete Species</h2>
    </div>

    <p use:melt={$description} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete "{specie.name}"? This action cannot be undone.
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
            await pb.collection('species').delete(specie.id)
            toast('Species deleted successfully', { type: 'success' })
            onDelete()
          } catch (error) {
            toast('Failed to delete species', { type: 'error' })
          }
          $dialogOpen = false
        }}
      >
        Delete Species
      </button>
    </div>
  </div>
{/if}

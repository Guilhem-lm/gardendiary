<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte'
  import { ArrowLeft } from 'lucide-svelte'
  import type { Snippet } from 'svelte'
  import { fly } from 'svelte/transition'

  interface Props {
    content: Snippet
    onOpenChange?: (open: boolean) => void
    actions: Snippet
    title: string
  }

  const { content, onOpenChange, actions, title }: Props = $props()

  // Create dialog for SpeciesDetails
  const {
    elements: { content: drawerContent, overlay, portalled, close },
    states: { open },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
    portal: '#app',
    onOpenChange: ({ next }) => {
      onOpenChange?.(next)
      return next
    },
  })
</script>

{#if $open}
  <div use:melt={$portalled}>
    <div use:melt={$overlay} class="hidden inset-0 bg-black/50 backdrop-blur-sm z-50"></div>
    <div use:melt={$drawerContent} class="z-50">
      <div
        class="fixed inset-0 bg-stone-50 dark:bg-stone-800 overflow-y-auto h-screen"
        transition:fly={{ x: '-100%', duration: 300 }}
      >
        <!-- Header -->
        <div
          class="sticky top-0 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 flex items-center justify-between px-4 h-12 py-2 z-10"
        >
          <button
            use:melt={$close}
            class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2"
          >
            <ArrowLeft size={24} />
          </button>

          <div class="flex gap-2 items-center whitespace-nowrap shrink min-w-0">
            <h1 class="text-2xl font-semibold truncate">{title}</h1>
          </div>

          <div class="flex gap-2 items-center">
            {@render actions()}
          </div>
        </div>

        <!-- Content -->
        <div class="max-w-4xl mx-auto p-4 flex flex-col gap-4">
          {@render content()}
        </div>
      </div>
    </div>
  </div>
{/if}

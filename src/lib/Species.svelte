<!-- Species.svelte -->
<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import { toast } from './toast'
  import type { Species } from './types'
  import AddSpecies from './AddSpecies.svelte'
  import { EllipsisVertical, Pen, Trash2 } from 'lucide-svelte'
  import { createDropdownMenu, createDialog, melt } from '@melt-ui/svelte'
  import { fade, scale } from 'svelte/transition'
  import SpeciesDetails from './SpeciesDetails.svelte'

  let species = $state<Species[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let editingSpecies = $state<Species | null>(null)
  let selectedSpecies = $state<Species | null>(null)

  async function fetchSpecies() {
    try {
      loading = true
      error = null
      species = await pb.collection('species').getFullList<Species>({
        sort: '-created',
      })
    } catch (err) {
      error = 'Failed to load species'
      toast('Failed to load species', { type: 'error' })
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchSpecies()
  })

  // Species actions dropdown
  const {
    elements: { trigger: menuTrigger, menu, overlay: menuOverlay, item: menuItem },
    states: { open: menuOpen },
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
    preventScroll: true,
  })
</script>

<div class="h-full flex flex-col">
  <div class="flex-1 overflow-auto p-4">
    {#if loading}
      <p class="text-center">Loading species...</p>
    {:else if error}
      <p class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 p-4 rounded-lg">
        {error}
      </p>
    {:else if species.length === 0}
      <p class="text-center">No species yet. Start by adding your first species!</p>
    {:else}
      <div class="flex flex-col gap-4 max-w-4xl mx-auto pb-20">
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        {#each species as specie}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            class="bg-white dark:bg-stone-700 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-xl transition-shadow w-full text-left"
            onclick={() => (selectedSpecies = specie)}
          >
            <div class="flex justify-between items-start">
              <h2 class="text-xl font-semibold">{specie.name}</h2>

              <!-- Actions dropdown -->
              <div role="presentation" onclick={(e) => e.stopPropagation()}>
                <button
                  use:melt={$menuTrigger}
                  class="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                  aria-label="Species actions"
                >
                  <EllipsisVertical size={20} />
                </button>

                {#if $menuOpen}
                  <div
                    use:melt={$menuOverlay}
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
                    onclick={() => {
                      editingSpecies = specie
                      $menuOpen = false
                    }}
                  >
                    <Pen size={16} />
                    Edit
                  </button>
                  <button
                    use:melt={$menuItem}
                    use:melt={$dialogTrigger}
                    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700 outline-none focus:bg-stone-100 dark:focus:bg-stone-700"
                    onclick={() => {
                      $menuOpen = false
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                {#if $dialogOpen}
                  <div
                    use:melt={$dialogOverlay}
                    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    transition:fade={{ duration: 150 }}
                  ></div>

                  <div
                    use:melt={$dialogContent}
                    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[51]"
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
                            fetchSpecies()
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
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Add button - floating on mobile, fixed on desktop -->
  <div class="fixed md:absolute right-4 {editingSpecies ? 'hidden' : ''} md:bottom-10 bottom-18">
    <AddSpecies
      species={editingSpecies}
      onSpeciesAdded={() => {
        fetchSpecies()
        editingSpecies = null
      }}
    />
  </div>
</div>

{#if selectedSpecies}
  <SpeciesDetails species={selectedSpecies} onClose={() => (selectedSpecies = null)} />
{/if}

<!-- Species.svelte -->
<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import { toast } from './toast'
  import type { Species } from './types'
  import AddSpecies from './AddSpecies.svelte'
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
        {#each species as specie}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            class="bg-white dark:bg-stone-700 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow w-full text-left"
            onclick={() => (selectedSpecies = specie)}
          >
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold">{specie.name}</h2>
              {#if specie.description}
                <p class="text-sm text-stone-600 dark:text-stone-300">{specie.description}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Add button - floating on mobile, fixed on desktop -->
  <div
    class="fixed md:absolute right-4 {editingSpecies
      ? 'hidden'
      : ''} md:top-6 md:right-10 bottom-18 h-fit"
  >
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

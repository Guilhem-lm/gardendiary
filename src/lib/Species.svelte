<!-- Species.svelte -->
<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import { toast } from './toast'
  import type { Species } from './types'

  let species = $state<Species[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  async function fetchSpecies() {
    try {
      loading = true
      error = null
      species = await pb.collection('species').getFullList<Species>()
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
      <p class="text-center">No species yet. Add your first species when creating a container!</p>
    {:else}
      <div class="flex flex-col gap-4 max-w-4xl mx-auto pb-20">
        {#each species as specie}
          <div class="bg-white dark:bg-stone-700 rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold">{specie.name}</h2>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

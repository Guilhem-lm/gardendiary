<!-- SpeciesDetails.svelte -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { ArrowLeft } from 'lucide-svelte'
  import type { Species } from './types'
  import { pb } from './pocketbase.svelte'

  interface Props {
    species: Species
    onClose: () => void
  }

  const { species, onClose }: Props = $props()

  let plants = $state<any[]>([])
  let loading = $state(true)

  async function fetchPlants() {
    try {
      loading = true
      const records = await pb.collection('plants').getFullList({
        filter: `species = "${species.id}"`,
        expand: 'container',
      })
      plants = records
    } catch (error) {
      console.error('Error fetching plants:', error)
    } finally {
      loading = false
    }
  }

  $effect(() => {
    fetchPlants()
  })
</script>

<div
  class="fixed inset-0 bg-stone-50 dark:bg-stone-900 z-[200] overflow-auto"
  transition:fly={{ y: '100%', duration: 300 }}
>
  <!-- Header -->
  <div
    class="sticky top-0 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700"
  >
    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
      <button
        onclick={onClose}
        class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
      >
        <ArrowLeft size={24} />
      </button>
      <h1 class="text-xl font-semibold">{species.name}</h1>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-4xl mx-auto p-4">
    <div class="bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6">
      <h2 class="text-lg font-semibold mb-4">Plants of this species</h2>

      {#if loading}
        <p class="text-stone-500 dark:text-stone-400">Loading plants...</p>
      {:else if plants.length === 0}
        <p class="text-stone-500 dark:text-stone-400">No plants of this species yet.</p>
      {:else}
        <div class="grid gap-4">
          {#each plants as plant}
            <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
              <p class="font-medium">
                In container: {plant.expand?.container?.name || 'Unknown container'}
              </p>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Location: {plant.expand?.container?.location || '-'}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

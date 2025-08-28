<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import type { RecordModel } from 'pocketbase'
  import AddContainer from './AddContainer.svelte'

  interface Species {
    id: string
    name: string
  }

  interface Plant {
    id: string
    species: string
    expand?: {
      species: Species
    }
  }

  interface Container extends RecordModel {
    name: string
    location: string
    size: string
    plants?: string[]
    last_watered?: string
    expand?: {
      plants: Plant[]
      user: any
    }
  }

  function getSpeciesCount(container: Container): string {
    if (!container.expand?.plants || container.expand.plants.length === 0) {
      return '0 plants'
    }

    const speciesCount = container.expand.plants.reduce(
      (acc, plant) => {
        const speciesName = plant.expand?.species.name || 'Unknown'
        acc[speciesName] = (acc[speciesName] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(speciesCount)
      .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
      .join(', ')
  }

  let containers = $state<Container[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  async function fetchContainers() {
    try {
      loading = true
      error = null
      const records = await pb.collection('containers').getFullList<Container>({
        sort: '-created',
        expand: 'plants.species, user',
      })
      containers = records
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchContainers()
  })

  $inspect('dbg containers', containers)
</script>

<div class="p-4 flex flex-col justify-between h-full">
  {#if loading}
    <p>Loading containers...</p>
  {:else if error}
    <p class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 p-4 rounded-lg">{error}</p>
  {:else if containers.length === 0}
    <p>No containers yet. Start by adding your first container!</p>
  {:else}
    <div class="flex flex-col gap-4">
      {#each containers as container}
        <div
          class="bg-white dark:bg-stone-700 rounded-lg shadow-md p-6 transform transition-all duration-200 flex flex-col gap-2"
        >
          <div class="flex flex-row gap-4 items-baseline">
            <h2 class="text-xl font-semibold">
              {container.name}
            </h2>
            <p>
              <span></span>
              {getSpeciesCount(container)}
            </p>
          </div>
          <div class="flex flex-row gap-4 text-sm">
            <p><span>Location:</span> {container.location}</p>
            <p><span>Size:</span> {container.size}</p>
            <p>
              <span>Last Watered:</span>
              {container.last_watered ? new Date(container.last_watered).toLocaleDateString() : '-'}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <div class="mx-auto">
    <AddContainer onContainerAdded={fetchContainers} />
  </div>
</div>

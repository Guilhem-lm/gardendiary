<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import type { RecordModel } from 'pocketbase'
  import AddContainer from './AddContainer.svelte'
  import ContainerActions from './ContainerActions.svelte'

  let editingContainer: Container | null = $state(null)

  import type { Container } from './types'

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
      .map(([species, count]) => `${count} ${species}`)
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
</script>

<div class="h-full flex flex-col">
  <div class="flex-1 overflow-auto p-4">
    {#if loading}
      <p class="text-center">Loading containers...</p>
    {:else if error}
      <p class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-100 p-4 rounded-lg">
        {error}
      </p>
    {:else if containers.length === 0}
      <p class="text-center">No containers yet. Start by adding your first container!</p>
    {:else}
      <div class="flex flex-col gap-4 max-w-4xl mx-auto pb-20">
        {#each containers as container}
          <div
            class="bg-white dark:bg-stone-700 rounded-lg shadow-md p-6 transform transition-all duration-200 flex flex-col gap-2"
          >
            <div class="flex flex-row gap-4 items-baseline justify-between">
              <div class="flex flex-row gap-4 items-baseline">
                <h2 class="text-xl font-semibold">
                  {container.name}
                </h2>
                <p class="text-stone-600 dark:text-stone-300">
                  {getSpeciesCount(container)}
                </p>
              </div>
              <ContainerActions
                {container}
                onEdit={() => (editingContainer = container)}
                onDelete={async () => {
                  await pb.collection('containers').delete(container.id)
                  fetchContainers()
                }}
                onWater={async () => {
                  await pb.collection('containers').update(container.id, {
                    last_watered: new Date().toISOString(),
                  })
                  fetchContainers()
                }}
              />
            </div>
            <div class="flex flex-row gap-4 text-sm text-stone-500 dark:text-stone-400">
              <p><span class="font-medium">Location:</span> {container.location}</p>
              <p><span class="font-medium">Size:</span> {container.size}</p>
              <p>
                <span class="font-medium">Last Watered:</span>
                {container.last_watered
                  ? new Date(container.last_watered).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <!-- Add button - floating on mobile, fixed on desktop -->
  <div class="fixed md:absolute right-4 {editingContainer ? 'hidden' : ''} md:bottom-20 bottom-24">
    <AddContainer
      onContainerAdded={() => {
        fetchContainers()
        editingContainer = null
      }}
      container={editingContainer}
    />
  </div>
</div>

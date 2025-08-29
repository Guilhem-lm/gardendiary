<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import AddContainer from './AddContainer.svelte'
  import ContainerDetails from './ContainerDetails.svelte'
  import { Droplets } from 'lucide-svelte'
  import { toast } from './toast'
  import { getContainerPlants } from './utils/container'
  import type { Container } from './types'

  let selectedContainer = $state<Container | null>(null)

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
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            class="bg-white dark:bg-stone-700 rounded-lg shadow-sm px-4 py-3 transform transition-all duration-200 cursor-pointer hover:shadow-md w-full text-left"
            onclick={() => (selectedContainer = container)}
          >
            <div class="flex gap-4 items-center">
              <!-- Thumbnail -->
              <div class="flex-shrink-0">
                {#if container.photos && container.photos.length > 0}
                  <img
                    src={pb.files.getURL(container, container.photos[container.photos.length - 1], {
                      thumb: '100x100',
                    })}
                    alt={`${container.name} thumbnail`}
                    class="w-16 h-16 object-cover rounded-lg"
                  />
                {:else}
                  <div
                    class="w-16 h-16 bg-stone-100 dark:bg-stone-600 rounded-lg flex items-center justify-center"
                  >
                    <span class="text-stone-400 dark:text-stone-500 text-xs">No photo</span>
                  </div>
                {/if}
              </div>

              <!-- Content -->
              <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                <!-- Header row -->
                <div class="flex justify-between items-start">
                  <div class="flex flex-row gap-2 items-baseline flex-wrap">
                    <h2 class="text-lg font-semibold">{container.name}</h2>

                    {#if getContainerPlants(container).length > 0}
                      <div class="mt-1 flex flex-wrap gap-1.5">
                        {#each getContainerPlants(container) as plant}
                          <div class="bg-stone-100 dark:bg-stone-600 px-2 py-0.5 rounded text-sm">
                            {#if plant.quantity > 1}
                              {plant.quantity}
                            {/if}
                            {plant.species}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>

                <!-- Details row -->
                <div
                  class="gap-4 text-sm text-stone-500 dark:text-stone-400 mt-2 dark:border-stone-600 pt-2 hidden md:flex"
                >
                  <p><span class="font-medium">Location:</span> {container.location}</p>
                  <p><span class="font-medium">Size:</span> {container.size}</p>
                  <div class="flex items-center gap-1">
                    <p>
                      <span class="font-medium">Last Watered:</span>
                      {container.last_watered
                        ? new Date(container.last_watered).toLocaleDateString()
                        : '-'}
                    </p>
                    <button
                      type="button"
                      class="text-stone-400 hover:text-lime-700 dark:text-stone-500 dark:hover:text-lime-700"
                      onclick={async (e) => {
                        e.stopPropagation()
                        await pb.collection('containers').update(container.id, {
                          last_watered: new Date().toISOString(),
                        })
                        fetchContainers()
                        toast('Plants watered successfully', { type: 'success' })
                      }}
                    >
                      <Droplets size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <!-- Add button - floating on mobile, fixed on desktop -->
  <div class="fixed md:absolute right-4 md:top-6 md:right-10 bottom-18">
    <AddContainer
      onContainerAdded={() => {
        fetchContainers()
      }}
    />
  </div>

  {#if selectedContainer}
    <ContainerDetails container={selectedContainer} onClose={() => (selectedContainer = null)} />
  {/if}
</div>

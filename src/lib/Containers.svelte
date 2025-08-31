<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount, onDestroy, untrack } from 'svelte'
  import AddContainer from './AddContainer.svelte'
  import ContainerDetails from './ContainerDetails.svelte'
  import { Droplets } from 'lucide-svelte'
  import { toast } from './toast'
  import { getContainerPlants } from './utils/container'
  import type { Container } from './types'
  import { getMostRecentPhoto, type Photo } from './utils/photos'
  import { push } from 'svelte-spa-router'
  import DaysToHarvest from './DaysToHarvest.svelte'

  interface Props {
    selectedContainerId: string | null
  }

  let { selectedContainerId = null }: Props = $props()

  let containers = $state<Container[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let unsubscribe: (() => void) | null = $state(null)
  let scrollContainer: HTMLElement | undefined = $state(undefined)

  let containerDetailDrawer: ContainerDetails | undefined = $state(undefined)

  async function fetchContainers() {
    try {
      loading = true
      error = null
      const records = await pb.collection('containers').getFullList<Container>({
        sort: '-created',
        expand: 'plants.species, user, photos_via_container',
      })
      containers = records
    } catch (e: any) {
      error = e.message
    } finally {
      loading = false
    }
  }

  onMount(async () => {
    await fetchContainers()
    await setupSubscription()
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  async function setupSubscription() {
    try {
      // Subscribe to photos collection for thumbnail updates
      const photosUnsubscribe = await pb
        .collection('photos')
        .subscribe('*', ({ record, action }) => {
          // Handle different types of events
          if (record.container) {
            // New photo added to a container - update the container's photos
            const container = containers.find((c) => c.id === record.container)

            if (container && action === 'create') {
              if (container.expand?.photos_via_container) {
                container.expand.photos_via_container.unshift(record)
              } else {
                container.expand = {
                  ...container.expand,
                  photos_via_container: [record],
                } as Container['expand']
              }
            } else if (container?.expand?.photos_via_container && action === 'delete') {
              container.expand.photos_via_container = container.expand.photos_via_container.filter(
                (p: Photo) => p.id !== record.id
              )
            } else if (container?.expand?.photos_via_container && action === 'update') {
              container.expand.photos_via_container = container.expand.photos_via_container.map(
                (p: Photo) => (p.id === record.id ? record : p)
              )
            }
          }
        })

      // Subscribe to containers collection for container updates (like watering time)
      const containersUnsubscribe = await pb
        .collection('containers')
        .subscribe('*', ({ record, action }) => {
          if (action === 'update') {
            // Update the container in the list
            const containerIndex = containers.findIndex((c) => c.id === record.id)
            if (containerIndex !== -1) {
              // Preserve the expanded photos data that are not fetched on subscribe
              const existingExpand = containers[containerIndex].expand
              containers[containerIndex] = {
                ...containers[containerIndex],
                ...record,
                expand: existingExpand,
              }
            }
          } else if (action === 'create') {
            // Add the new container to the top of the list
            containers = [record as Container, ...containers]
          } else if (action === 'delete') {
            containers = containers.filter((c) => c.id !== record.id)
          }
        })

      // Combine both unsubscribe functions
      unsubscribe = () => {
        photosUnsubscribe()
        containersUnsubscribe()
      }
    } catch (error) {
      console.error('Error setting up container subscriptions:', error)
    }
  }

  let thumbnails = $derived.by(getThumbnails)

  function getThumbnails() {
    const thumbnails: Record<string, Photo | null> = {}
    // Go through each container and get its most recent photo
    for (const container of containers) {
      if (
        container.expand?.photos_via_container &&
        container.expand.photos_via_container.length > 0
      ) {
        const mostRecent = getMostRecentPhoto(container.expand.photos_via_container)
        thumbnails[container.id] = mostRecent
      } else {
        thumbnails[container.id] = null
      }
    }
    return thumbnails
  }

  $effect(() => {
    if (selectedContainerId) {
      const found = containers.find((c) => c.id === selectedContainerId)
      if (found) {
        untrack(() => containerDetailDrawer?.openContainer(found))
      }
    } else {
      untrack(() => containerDetailDrawer?.closeDrawer())
    }
  })
</script>

<div class="flex flex-col">
  <div class="flex-1 p-4" bind:this={scrollContainer}>
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
            onclick={() => push(`/?view=containers&containerId=${container.id}`)}
          >
            <div class="flex gap-4 items-center">
              <!-- Thumbnail -->
              <div class="flex-shrink-0">
                {#if thumbnails[container.id]}
                  <img
                    src={pb.files.getURL(
                      thumbnails[container.id]!,
                      thumbnails[container.id]!.file,
                      {
                        thumb: '100x100',
                      }
                    )}
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
              <div class="flex flex-col gap-2 flex-1 min-w-0 max-h-16 h-fit">
                <!-- Header row -->

                <div class="flex flex-row gap-3 items-center flex-wrap">
                  <h2 class="text-lg font-semibold">{container.name}</h2>

                  {#if getContainerPlants(container).length > 0}
                    {#each getContainerPlants(container) as plant}
                      <div class="bg-stone-100 dark:bg-stone-600 px-2 py-0.5 rounded text-sm">
                        {#if plant.quantity > 1}
                          {plant.quantity}
                        {/if}
                        {plant.species}
                      </div>
                    {/each}
                  {/if}

                  <DaysToHarvest {container} />
                </div>

                <!-- Details row -->
                <div class="gap-4 text-sm text-stone-500 dark:text-stone-400 hidden md:flex">
                  <p><span class="font-medium">Location:</span> {container.location}</p>
                  <p><span class="font-medium">Size:</span> {container.size}</p>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <!-- Add button - floating on mobile, fixed on desktop -->
  <div class="fixed right-4 md:top-6 md:right-10 bottom-18 h-fit">
    <AddContainer
      onContainerAdded={() => {
        // Scroll to top of the container
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }}
    />
  </div>

  <ContainerDetails bind:this={containerDetailDrawer} />
</div>

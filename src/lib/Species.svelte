<!-- Species.svelte -->
<script lang="ts">
  import { pb } from './pocketbase.svelte'
  import { onMount, onDestroy } from 'svelte'
  import { toast } from './toast'
  import type { Species } from './types'
  import AddSpecies from './AddSpecies.svelte'
  import SpeciesDetails from './SpeciesDetails.svelte'
  import type { Photo } from './utils/photos'

  let species = $state<Species[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let selectedSpecies = $state<Species | null>(null)
  let unsubscribe: (() => void) | null = $state(null)

  async function fetchSpecies() {
    try {
      loading = true
      error = null
      species = await pb.collection('species').getFullList<Species>({
        sort: '-created',
        expand: 'photos_via_species',
      })
    } catch (err) {
      error = 'Failed to load species'
      toast('Failed to load species', { type: 'error' })
    } finally {
      loading = false
    }
  }

  onMount(async () => {
    await fetchSpecies()
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
          if (record.species) {
            // New photo added to a species - update the species's photos
            const speciesItem = species.find((s) => s.id === record.species)

            if (speciesItem && action === 'create') {
              if (speciesItem.expand?.photos_via_species) {
                speciesItem.expand.photos_via_species.unshift(record)
              } else {
                speciesItem.expand = {
                  photos_via_species: [record],
                }
              }
            } else if (speciesItem?.expand?.photos_via_species && action === 'delete') {
              speciesItem.expand.photos_via_species = speciesItem.expand.photos_via_species.filter(
                (p: any) => p.id !== record.id
              )
            } else if (speciesItem?.expand?.photos_via_species && action === 'update') {
              speciesItem.expand.photos_via_species = speciesItem.expand.photos_via_species.map(
                (p: any) => (p.id === record.id ? record : p)
              )
            }
          }
        })

      // Subscribe to species collection for species updates
      const speciesUnsubscribe = await pb
        .collection('species')
        .subscribe('*', ({ record, action }) => {
          if (action === 'update') {
            // Update the species in the list
            const speciesIndex = species.findIndex((s) => s.id === record.id)
            if (speciesIndex !== -1) {
              // Preserve the expanded photos data that are not fetched on subscribe
              const existingExpand = species[speciesIndex].expand
              species[speciesIndex] = {
                ...species[speciesIndex],
                ...record,
                expand: existingExpand,
              }
            }
          } else if (action === 'create') {
            // Add the new species to the top of the list
            species = [record as Species, ...species]
          } else if (action === 'delete') {
            species = species.filter((s) => s.id !== record.id)
          }
        })

      // Combine both unsubscribe functions
      unsubscribe = () => {
        photosUnsubscribe()
        speciesUnsubscribe()
      }
    } catch (error) {
      console.error('Error setting up species subscriptions:', error)
    }
  }

  let thumbnails = $derived.by(getThumbnails)

  function getThumbnails() {
    const thumbnails: Record<string, Photo | null> = {}
    // Go through each species and get the latest photo (first element of the array)
    for (const specie of species) {
      if (specie.expand?.photos_via_species && specie.expand.photos_via_species.length > 0) {
        thumbnails[specie.id] = specie.expand.photos_via_species[0]
      } else {
        thumbnails[specie.id] = null
      }
    }
    return thumbnails
  }

  let scrollContainer: HTMLElement | undefined = $state(undefined)
</script>

<div class="h-full flex flex-col">
  <div class="flex-1 overflow-auto p-4" bind:this={scrollContainer}>
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
            <div class="flex gap-4">
              <!-- Thumbnail -->
              <div class="flex-shrink-0">
                {#if thumbnails[specie.id]}
                  <img
                    src={pb.files.getURL(thumbnails[specie.id]!, thumbnails[specie.id]!.file, {
                      thumb: '100x100',
                    })}
                    alt={`${specie.name} thumbnail`}
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
              <div class="flex flex-col gap-1 flex-1 min-w-0">
                <h2 class="text-lg font-semibold">{specie.name}</h2>
                {#if specie.description}
                  <p class="text-sm text-stone-600 dark:text-stone-300 line-clamp-2">
                    {specie.description}
                  </p>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Add button - floating on mobile, fixed on desktop -->
  <div class="fixed md:absolute right-4 md:top-6 md:right-10 bottom-18 h-fit">
    <AddSpecies
      onSpeciesAdded={() => {
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }}
    />
  </div>
</div>

{#if selectedSpecies}
  <SpeciesDetails species={selectedSpecies} onClose={() => (selectedSpecies = null)} />
{/if}

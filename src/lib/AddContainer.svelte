<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import { createDialog, melt } from '@melt-ui/svelte'
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import type { Container, Plant } from './types'
  import { fade, scale } from 'svelte/transition'
  import { toast } from './toast'

  // Auto-focus action for inputs
  function autoFocus(node: HTMLElement) {
    node.focus()
  }

  interface Species {
    id: string
    name: string
  }

  interface Props {
    onContainerAdded: () => void
    container?: Container | null
  }

  const { onContainerAdded, container = null }: Props = $props()

  let name = $state('')
  let location = $state('')
  let size = $state('')
  let plants = $state<{ species: string; speciesName?: string; quantity: number }[]>([])
  let species = $state<Species[]>([])
  let loading = $state(false)

  const {
    elements: { trigger, content, overlay, title, portalled },
    states: { open },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  $effect(() => {
    if (container) {
      name = container.name
      location = container.location
      size = container.size
      if (container.expand?.plants) {
        plants = container.expand.plants.map((plant: Plant) => ({
          species: plant.species,
          speciesName: plant.expand?.species.name,
          quantity: plant.quantity || 1,
        }))
      }
      $open = true
    }
  })

  async function fetchSpecies() {
    try {
      const records = await pb.collection('species').getFullList<Species>()
      species = records
    } catch (error) {
      console.error('Error fetching species:', error)
    }
  }

  async function addNewSpecies(speciesName: string) {
    try {
      // Check if species already exists
      const existing = species.find((s) => s.name.toLowerCase() === speciesName.toLowerCase())
      if (existing) {
        return existing
      }

      const record = await pb.collection('species').create<Species>({
        name: speciesName.trim(),
        created_by: pb.authStore.record?.id,
      })
      species = [...species, record]
      return record
    } catch (error) {
      console.error('Error creating species:', error)
      throw new Error('Failed to create new species')
    }
  }

  async function handleSubmit() {
    try {
      loading = true

      // Create or update container
      const containerData = {
        name,
        location,
        size,
        user: pb.authStore.record?.id,
      }

      // Create or update the container
      const result = container?.id
        ? await pb.collection('containers').update(container.id, containerData)
        : await pb.collection('containers').create(containerData)

      // Handle plants and species
      const plantIds = []
      for (const plant of plants) {
        try {
          // Skip empty selections
          if (!plant.species && plant.species !== 'new') continue

          let speciesId = plant.species

          // If it's a new species, create it first
          if (plant.species === 'new') {
            if (!plant.speciesName?.trim()) {
              toast('Please enter a name for the new species', { type: 'error' })
              return
            }
            const newSpecies = await addNewSpecies(plant.speciesName)
            speciesId = newSpecies.id
          }

          if (speciesId) {
            // Create a single plant with quantity
            const newPlant = await pb.collection('plants').create({
              container: result.id,
              species: speciesId,
              quantity: plant.quantity || 1,
              user: pb.authStore.record?.id,
            })
            plantIds.push(newPlant.id)
          }
        } catch (error) {
          console.error('Error processing plant:', error)
          toast('Failed to add plant: ' + ((error as Error)?.message || 'Unknown error'), {
            type: 'error',
          })
          return
        }
      }

      // Update container with plant IDs
      await pb.collection('containers').update(result.id, {
        plants: plantIds,
      })

      // Reset form
      name = ''
      location = ''
      size = ''
      plants = []
      $open = false

      // Dispatch event to refresh container list
      onContainerAdded()
    } catch (error) {
      console.error('Error creating container:', error)
    } finally {
      loading = false
    }
  }

  function addPlant() {
    plants = [...plants, { species: '', speciesName: undefined, quantity: 1 }]
  }

  function removePlant(index: number) {
    plants = plants.filter((_, i) => i !== index)
  }

  onMount(() => {
    fetchSpecies()
  })
</script>

<button
  use:melt={$trigger}
  class="bg-lime-700 hover:bg-lime-800 text-white rounded-full p-3 shadow-lg transition-colors duration-200 w-fit"
  aria-label="Add container"
>
  <Plus size={24} />
</button>

{#if $open}
  <div class="" use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 bg-black/50 backdrop-blur-sm"
      transition:fade={{ duration: 150 }}
    ></div>

    <div
      use:melt={$content}
      class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] bg-white dark:bg-stone-800 rounded-none sm:rounded-lg shadow-lg p-4 sm:p-6 w-full h-full sm:w-[430px] sm:h-auto sm:max-h-[90vh] overflow-y-auto"
      transition:scale={{ start: 0.95, duration: 150 }}
    >
      <h2 use:melt={$title} class="text-xl font-semibold mb-4">Add New Container</h2>

      <form
        onsubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        class="space-y-4"
      >
        <div class="space-y-2">
          <label for="name" class="block text-sm font-medium">Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            required
            class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
          />
        </div>

        <div class="space-y-2">
          <label for="location" class="block text-sm font-medium">Location</label>
          <input
            type="text"
            id="location"
            bind:value={location}
            required
            class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
          />
        </div>

        <div class="space-y-2">
          <label for="size" class="block text-sm font-medium">Size</label>
          <input
            type="text"
            id="size"
            bind:value={size}
            required
            class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
          />
        </div>

        <div class="space-y-2">
          {#each plants as plant, i}
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <label for="species-{i}" class="block text-sm font-medium mb-1">Plant {i + 1}</label
                >
                <div class="flex flex-col sm:flex-row gap-2">
                  <div class="flex-1">
                    {#if plant.species === 'new'}
                      <input
                        type="text"
                        id="new-species-{i}"
                        placeholder="Enter new species name"
                        bind:value={plant.speciesName}
                        class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
                        use:autoFocus
                      />
                    {:else}
                      <select
                        id="species-{i}"
                        bind:value={plant.species}
                        onchange={(e) => {
                          if ((e.target as HTMLSelectElement).value === 'new') {
                            plant.speciesName = ''
                          }
                        }}
                        class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
                      >
                        <option value="">Select a species</option>
                        {#each species as s}
                          <option value={s.id}>{s.name}</option>
                        {/each}
                        <option value="new">+ Add new species</option>
                      </select>
                    {/if}
                  </div>
                  <div class="flex gap-2 items-center">
                    <div class="w-24 sm:w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        bind:value={plant.quantity}
                        class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
                      />
                    </div>
                    <button
                      type="button"
                      onclick={() => removePlant(i)}
                      class="text-red-500 hover:text-red-600 text-2xl font-bold leading-none"
                      aria-label="Remove plant"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
          <button
            type="button"
            onclick={addPlant}
            class="text-lime-700 hover:text-lime-800 text-sm"
          >
            + Add Plant
          </button>
        </div>

        <div class="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
          <button
            type="button"
            onclick={() => ($open = false)}
            class="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Container'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

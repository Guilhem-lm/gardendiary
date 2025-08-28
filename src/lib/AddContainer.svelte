<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import { createPopover, melt } from '@melt-ui/svelte'
  import { pb } from './pocketbase.svelte'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  interface Species {
    id: string
    name: string
  }

  interface Props {
    onContainerAdded: () => void
  }

  const { onContainerAdded }: Props = $props()

  let name = $state('')
  let location = $state('')
  let size = $state('')
  let plants = $state<{ species: string; speciesName?: string }[]>([])
  let species = $state<Species[]>([])
  let loading = $state(false)

  const {
    elements: { trigger, content, arrow, overlay },
    states: { open },
  } = createPopover({
    forceVisible: false,
    positioning: {
      placement: 'bottom',
    },
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
      const record = await pb.collection('species').create<Species>({
        name: speciesName,
      })
      species = [...species, record]
      return record
    } catch (error) {
      console.error('Error creating species:', error)
      return null
    }
  }

  async function handleSubmit() {
    try {
      loading = true

      // Create container
      const container = await pb.collection('containers').create({
        name,
        location,
        size,
        user: pb.authStore.record?.id,
      })

      // Handle plants and species
      const plantIds = []
      for (const plant of plants) {
        let speciesId = plant.species

        // If it's a new species, create it first
        if (!speciesId && plant.speciesName) {
          const newSpecies = await addNewSpecies(plant.speciesName)
          if (newSpecies) {
            speciesId = newSpecies.id
          }
        }

        if (speciesId) {
          const newPlant = await pb.collection('plants').create({
            container: container.id,
            species: speciesId,
            user: pb.authStore.record?.id,
          })
          plantIds.push(newPlant.id)
        }
      }

      // Update container with plant IDs
      await pb.collection('containers').update(container.id, {
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
    plants = [...plants, { species: '' }]
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
  <div
    use:melt={$overlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
  ></div>
{/if}

<div use:melt={$content} class="bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 w-[400px] z-50">
  <div use:melt={$arrow}></div>
  <h2 class="text-xl font-semibold mb-4">Add New Container</h2>

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
            <label for="species-{i}" class="block text-sm font-medium">Plant {i + 1}</label>
            <select
              id="species-{i}"
              bind:value={plant.species}
              class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
            >
              <option value="">Select or add new species</option>
              {#each species as s}
                <option value={s.id}>{s.name}</option>
              {/each}
            </select>
            {#if plant.species === ''}
              <label for="new-species-{i}" class="block text-sm font-medium mt-2"
                >New Species Name</label
              >
              <input
                type="text"
                id="new-species-{i}"
                placeholder="Enter new species name"
                bind:value={plant.speciesName}
                class="mt-1 w-full px-3 py-2 border rounded-md dark:bg-stone-700"
              />
            {/if}
          </div>
          <button
            type="button"
            onclick={() => removePlant(i)}
            class="px-2 py-1 text-red-500 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      {/each}
      <button type="button" onclick={addPlant} class="text-lime-700 hover:text-lime-600 text-sm">
        + Add Plant
      </button>
    </div>

    <div class="flex justify-end gap-2 pt-4">
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
        class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-600 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Container'}
      </button>
    </div>
  </form>
</div>

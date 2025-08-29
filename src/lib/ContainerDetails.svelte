<!-- ContainerDetails.svelte -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition'
  import { ArrowLeft, Droplets, Pen, Check, X, Plus } from 'lucide-svelte'
  import type { Container, Species } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { getContainerPlants, formatPlantsCount } from './utils/container'
  import { createDialog, melt } from '@melt-ui/svelte'

  interface Props {
    container: Container
    onClose: () => void
  }

  const { container, onClose }: Props = $props()

  // Editing states
  let editingField = $state<'name' | 'location' | 'size' | 'plant' | null>(null)
  let editValue = $state('')
  let editingPlantId = $state<string | null>(null)
  let editingPlantQuantity = $state(1)

  // Add plant dialog
  const {
    elements: { trigger: addPlantTrigger, content: addPlantContent, overlay: addPlantOverlay },
    states: { open: addPlantOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  let species = $state<Species[]>([])
  let newPlantSpecies = $state('')
  let newPlantQuantity = $state(1)

  async function fetchSpecies() {
    try {
      const records = await pb.collection('species').getFullList<Species>()
      species = records
    } catch (error) {
      console.error('Error fetching species:', error)
      toast('Failed to load species', { type: 'error' })
    }
  }

  async function addPlant() {
    if (!newPlantSpecies) {
      toast('Please select a species', { type: 'error' })
      return
    }

    try {
      // Create the new plant
      const newPlant = await pb.collection('plants').create({
        container: container.id,
        species: newPlantSpecies,
        quantity: newPlantQuantity,
        user: pb.authStore.record?.id,
      })

      // Get the current container's plants
      const currentPlants = container.plants || []

      // Update the container with the new plant
      await pb.collection('containers').update(container.id, {
        plants: [...currentPlants, newPlant.id],
      })

      // Refresh container to get updated plants
      const updated = await pb.collection('containers').getOne<Container>(container.id, {
        expand: 'plants.species',
      })
      Object.assign(container, updated)

      // Reset form and close dialog
      newPlantSpecies = ''
      newPlantQuantity = 1
      $addPlantOpen = false
      toast('Plant added successfully', { type: 'success' })
    } catch (error) {
      console.error('Error adding plant:', error)
      toast('Failed to add plant', { type: 'error' })
    }
  }

  $effect(() => {
    if ($addPlantOpen) {
      fetchSpecies()
    }
  })

  function formatDate(date: string | null | undefined) {
    if (!date) return '-'
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function waterPlants() {
    try {
      await pb.collection('containers').update(container.id, {
        last_watered: new Date().toISOString(),
      })
      toast('Plants watered successfully', { type: 'success' })
    } catch (error) {
      toast('Failed to update watering time', { type: 'error' })
    }
  }

  function startEditing(field: 'name' | 'location' | 'size') {
    editingField = field
    editValue = container[field]
  }

  async function saveEdit() {
    if (!editingField) return

    try {
      if (editingField === 'plant') {
        if (!editingPlantId) return
        await pb.collection('plants').update(editingPlantId, {
          quantity: editingPlantQuantity,
        })
        // Refresh container to get updated plants
        const updated = await pb.collection('containers').getOne<Container>(container.id, {
          expand: 'plants.species',
        })
        container.expand = updated.expand
      } else {
        await pb.collection('containers').update(container.id, {
          [editingField]: editValue,
        })
        container[editingField] = editValue
      }
      toast('Container updated successfully', { type: 'success' })
    } catch (error) {
      toast('Failed to update container', { type: 'error' })
    } finally {
      editingField = null
      editingPlantId = null
    }
  }

  function cancelEdit() {
    editingField = null
    editingPlantId = null
  }

  function startEditingPlant(plant: any) {
    editingField = 'plant'
    editingPlantId = plant.id
    editingPlantQuantity = plant.quantity || 1
  }
</script>

<div
  class="fixed inset-0 bg-stone-50 dark:bg-stone-900 z-[200] overflow-auto"
  transition:fly={{ y: '100%', duration: 300 }}
>
  <!-- Header -->
  <div
    class="sticky top-0 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700"
  >
    <div class="max-w-4xl mx-auto px-4 py-4">
      <button
        onclick={onClose}
        class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
      >
        <ArrowLeft size={24} />
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-4xl mx-auto p-4">
    <div class="bg-white dark:bg-stone-800 rounded-lg shadow-sm p-6">
      <div class="flex justify-between items-start">
        {#if editingField === 'name'}
          <div class="flex gap-2 items-center">
            <input
              type="text"
              bind:value={editValue}
              class="text-2xl font-semibold bg-transparent border-b border-stone-300 dark:border-stone-600 focus:border-lime-700 dark:focus:border-lime-700 focus:outline-none px-1"
            />
            <div class="flex gap-1">
              <button
                onclick={saveEdit}
                class="text-lime-700 hover:text-lime-800"
                aria-label="Save"
              >
                <Check size={20} />
              </button>
              <button
                onclick={cancelEdit}
                class="text-stone-500 hover:text-stone-600"
                aria-label="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        {:else}
          <div class="flex gap-2 items-center group">
            <h1 class="text-2xl font-semibold">{container.name}</h1>
            <button
              onclick={() => startEditing('name')}
              class="text-stone-400 opacity-0 group-hover:opacity-100 hover:text-stone-600 transition-opacity"
              aria-label="Edit name"
            >
              <Pen size={16} />
            </button>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-3 mt-4 text-sm text-stone-500 dark:text-stone-400">
        <p class="text-stone-600 dark:text-stone-300">{formatPlantsCount(container)}</p>

        <div class="flex flex-col gap-2">
          <!-- Location -->
          <div class="flex items-center gap-2">
            {#if editingField === 'location'}
              <div class="flex gap-2 items-center flex-1">
                <div class="flex items-center gap-1">
                  <span class="font-medium">Location</span>
                  <div class="flex gap-1">
                    <button
                      onclick={saveEdit}
                      class="text-lime-700 hover:text-lime-800"
                      aria-label="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onclick={cancelEdit}
                      class="text-stone-500 hover:text-stone-600"
                      aria-label="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  bind:value={editValue}
                  class="flex-1 bg-transparent border-b border-stone-300 dark:border-stone-600 focus:border-lime-700 dark:focus:border-lime-700 focus:outline-none px-1"
                />
              </div>
            {:else}
              <div class="flex items-center gap-1">
                <span class="font-medium">Location</span>
                <button
                  onclick={() => startEditing('location')}
                  class="text-stone-400 hover:text-stone-600 sm:opacity-60 sm:hover:opacity-100"
                  aria-label="Edit location"
                >
                  <Pen size={14} />
                </button>
              </div>
              <p class="flex-1">{container.location}</p>
            {/if}
          </div>

          <!-- Size -->
          <div class="flex items-center gap-2">
            {#if editingField === 'size'}
              <div class="flex gap-2 items-center flex-1">
                <div class="flex items-center gap-1">
                  <span class="font-medium">Size</span>
                  <div class="flex gap-1">
                    <button
                      onclick={saveEdit}
                      class="text-lime-700 hover:text-lime-800"
                      aria-label="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onclick={cancelEdit}
                      class="text-stone-500 hover:text-stone-600"
                      aria-label="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  bind:value={editValue}
                  class="flex-1 bg-transparent border-b border-stone-300 dark:border-stone-600 focus:border-lime-700 dark:focus:border-lime-700 focus:outline-none px-1"
                />
              </div>
            {:else}
              <div class="flex items-center gap-1">
                <span class="font-medium">Size</span>
                <button
                  onclick={() => startEditing('size')}
                  class="text-stone-400 hover:text-stone-600 sm:opacity-60 sm:hover:opacity-100"
                  aria-label="Edit size"
                >
                  <Pen size={14} />
                </button>
              </div>
              <p class="flex-1">{container.size}</p>
            {/if}
          </div>

          <div class="flex items-center gap-2">
            <p>
              <span class="font-medium">Last Watered:</span>
              {formatDate(container.last_watered)}
            </p>
            <button
              type="button"
              class="text-stone-400 hover:text-lime-700 dark:text-stone-500 dark:hover:text-lime-700"
              onclick={waterPlants}
            >
              <Droplets size={16} />
            </button>
          </div>
        </div>

        <!-- Plants List -->
        <div class="mt-6">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-lg font-semibold">Plants</h2>
            <button
              use:melt={$addPlantTrigger}
              class="text-stone-400 hover:text-lime-700 dark:text-stone-500 dark:hover:text-lime-700"
              aria-label="Add plant"
            >
              <Plus size={16} />
            </button>
          </div>

          {#if $addPlantOpen}
            <div
              use:melt={$addPlantOverlay}
              class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              transition:fade={{ duration: 150 }}
            ></div>

            <div
              use:melt={$addPlantContent}
              class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[51]"
              transition:scale={{ duration: 150, start: 0.95 }}
            >
              <h2 class="text-lg font-semibold mb-4">Add Plant</h2>

              <form
                onsubmit={(e) => {
                  e.preventDefault()
                  addPlant()
                }}
                class="space-y-4"
              >
                <div class="space-y-2">
                  <label for="species" class="block text-sm font-medium">Species</label>
                  <select
                    id="species"
                    bind:value={newPlantSpecies}
                    class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
                  >
                    <option value="">Select a species</option>
                    {#each species as s}
                      <option value={s.id}>{s.name}</option>
                    {/each}
                  </select>
                </div>

                <div class="space-y-2">
                  <label for="quantity" class="block text-sm font-medium">Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    bind:value={newPlantQuantity}
                    min="1"
                    class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
                  />
                </div>

                <div class="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onclick={() => ($addPlantOpen = false)}
                    class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800"
                  >
                    Add Plant
                  </button>
                </div>
              </form>
            </div>
          {/if}
          {#if !container.expand?.plants || container.expand.plants.length === 0}
            <p class="text-stone-500 dark:text-stone-400">No plants in this container yet.</p>
          {:else}
            <div class="grid gap-3">
              {#each container.expand.plants as plant}
                <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
                  <div class="flex items-baseline justify-between">
                    <div class="flex items-baseline gap-2">
                      <p class="font-medium">{plant.expand?.species.name}</p>
                      {#if editingField === 'plant' && editingPlantId === plant.id}
                        <div class="flex items-center gap-2">
                          <input
                            type="number"
                            bind:value={editingPlantQuantity}
                            min="1"
                            class="w-16 bg-transparent border-b border-stone-300 dark:border-stone-600 focus:border-lime-700 dark:focus:border-lime-700 focus:outline-none px-1"
                          />
                          <div class="flex gap-1">
                            <button
                              onclick={saveEdit}
                              class="text-lime-700 hover:text-lime-800"
                              aria-label="Save quantity"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onclick={cancelEdit}
                              class="text-stone-500 hover:text-stone-600"
                              aria-label="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      {:else}
                        <div class="flex items-center gap-1">
                          <p class="text-sm text-stone-500 dark:text-stone-400">
                            {plant.quantity || 1} plants
                          </p>
                          <button
                            onclick={() => startEditingPlant(plant)}
                            class="text-stone-400 hover:text-stone-600 sm:opacity-60 sm:hover:opacity-100"
                            aria-label="Edit quantity"
                          >
                            <Pen size={14} />
                          </button>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

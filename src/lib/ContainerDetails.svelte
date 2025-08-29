<!-- ContainerDetails.svelte -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition'
  import { ArrowLeft, Droplets, Settings, X, Plus, EllipsisVertical, Trash2 } from 'lucide-svelte'
  import type { Container, Species } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { createDialog, createDropdownMenu, melt } from '@melt-ui/svelte'
  import PhotoCarousel from './PhotoCarousel.svelte'
  import { getTotalPlantsCount } from './utils/container'

  interface Props {
    container: Container
    onClose: () => void
  }

  const { container, onClose }: Props = $props()

  // Container actions dropdown
  const {
    elements: {
      trigger: containerActionsTrigger,
      menu: containerActionsMenu,
      overlay: containerActionsOverlay,
      item: containerActionsItem,
    },
    states: { open: containerActionsOpen },
  } = createDropdownMenu({
    positioning: {
      placement: 'bottom-end',
    },
    preventScroll: true,
    loop: true,
  })

  // Delete container dialog
  const {
    elements: {
      trigger: deleteContainerTrigger,
      content: deleteContainerContent,
      overlay: deleteContainerOverlay,
      title: deleteContainerTitle,
      description: deleteContainerDescription,
      close: deleteContainerClose,
    },
    states: { open: deleteContainerOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  async function deleteContainer() {
    try {
      await pb.collection('containers').delete(container.id)
      toast('Container deleted successfully', { type: 'success' })
      onClose()
    } catch (error) {
      console.error('Error deleting container:', error)
      toast('Failed to delete container', { type: 'error' })
    }
  }

  // Edit container dialog
  const {
    elements: {
      trigger: editContainerTrigger,
      content: editContainerContent,
      overlay: editContainerOverlay,
      close: editContainerClose,
    },
    states: { open: editContainerOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  // Form state
  let formData = $state({
    name: container.name,
    location: container.location,
    size: container.size,
  })

  let hasChanges = $derived(
    formData.name !== container.name ||
      formData.location !== container.location ||
      formData.size !== container.size
  )

  async function saveContainerChanges() {
    try {
      await pb.collection('containers').update(container.id, formData)

      // Refresh container
      const updated = await pb.collection('containers').getOne<Container>(container.id)
      Object.assign(container, updated)

      $editContainerOpen = false
      toast('Container updated successfully', { type: 'success' })
    } catch (error) {
      console.error('Error updating container:', error)
      toast('Failed to update container', { type: 'error' })
    }
  }

  let editingPlantId = $state<string | null>(null)
  let editingPlantQuantity = $state(1)
  let deletingPlantId = $state<string | null>(null)

  // Delete plant dialog
  const {
    elements: {
      trigger: deletePlantTrigger,
      content: deletePlantContent,
      overlay: deletePlantOverlay,
      title: deletePlantTitle,
      description: deletePlantDescription,
      close: deletePlantClose,
    },
    states: { open: deletePlantOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  async function deletePlant(plantId: string) {
    try {
      // Delete the plant
      await pb.collection('plants').delete(plantId)

      // Get the current container's plants
      const currentPlants = container.plants || []

      // Update the container's plants array
      await pb.collection('containers').update(container.id, {
        plants: currentPlants.filter((id) => id !== plantId),
      })

      // Refresh container to get updated plants
      const updated = await pb.collection('containers').getOne<Container>(container.id, {
        expand: 'plants.species',
      })
      Object.assign(container, updated)

      toast('Plant deleted successfully', { type: 'success' })
    } catch (error) {
      console.error('Error deleting plant:', error)
      toast('Failed to delete plant', { type: 'error' })
    } finally {
      deletingPlantId = null
      $deletePlantOpen = false
    }
  }

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

  async function handlePhotoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()

      // Add the new photo
      formData.append('photos+', file)
      formData.append(
        'photos_taken_at',
        JSON.stringify([
          ...(container.photos_taken_at || []),
          new Date(file.lastModified).toISOString(),
        ])
      )

      // Update the container
      await pb.collection('containers').update(container.id, formData)

      // Refresh container to get updated photos
      const updated = await pb.collection('containers').getOne<Container>(container.id)
      Object.assign(container, updated)

      toast('Photo added successfully', { type: 'success' })
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast('Failed to upload photo', { type: 'error' })
    }

    // Reset the input
    input.value = ''
  }
</script>

<div
  class="fixed inset-0 bg-stone-100 dark:bg-stone-800 z-[200] overflow-auto"
  transition:fly={{ x: '-100%', duration: 150 }}
>
  <!-- Header -->
  <div
    class="sticky top-0 bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 flex items-center justify-between px-4 h-12"
  >
    <button
      onclick={onClose}
      class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
    >
      <ArrowLeft size={24} />
    </button>

    <div class="flex gap-2 items-center">
      <h1 class="text-2xl font-semibold">{container.name}</h1>
    </div>

    <div class="flex gap-2">
      {#if container.photos && container.photos.length > 0}
        <label
          for="photo-upload"
          class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 cursor-pointer"
        >
          Add Photo
        </label>
        <input
          type="file"
          id="photo-upload"
          accept="image/*"
          class="hidden"
          onchange={handlePhotoUpload}
        />
      {/if}

      <button
        use:melt={$containerActionsTrigger}
        class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2"
        aria-label="Container actions"
      >
        <EllipsisVertical size={20} />
      </button>

      {#if $containerActionsOpen}
        <div
          use:melt={$containerActionsOverlay}
          class="fixed inset-0 z-[300]"
          transition:fade={{ duration: 100 }}
        ></div>

        <div
          use:melt={$containerActionsMenu}
          class="absolute right-0 mt-1 w-36 bg-white dark:bg-stone-800 rounded-lg shadow-lg py-1 z-[301]"
          transition:scale={{ duration: 150, start: 0.95 }}
        >
          <button
            use:melt={$containerActionsItem}
            use:melt={$editContainerTrigger}
            class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
            onclick={() => {
              $containerActionsOpen = false
            }}
          >
            <Settings size={16} />
            Edit
          </button>
          <button
            use:melt={$containerActionsItem}
            use:melt={$deleteContainerTrigger}
            class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700"
            onclick={() => {
              $containerActionsOpen = false
            }}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-4xl mx-auto">
    <div class="p-4 flex flex-col gap-4">
      <div class="flex flex-col md:flex-row md:items-start md:justify-start gap-4">
        <!-- Container Photo Section -->
        <PhotoCarousel
          record={container}
          collectionName="containers"
          onDelete={async () => {
            const updated = await pb.collection('containers').getOne<Container>(container.id)
            Object.assign(container, updated)
          }}
          onUpload={handlePhotoUpload}
        />

        <!-- Container Details -->
        <div
          class="flex flex-col gap-3 text-sm text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-700 rounded-lg p-4 md:grow min-w-0 md:h-96 shadow-sm"
        >
          <div class="flex flex-col gap-2">
            <!-- Location -->
            <div class="flex items-center gap-2">
              <span class="font-medium">Location:</span>
              <p class="flex-1">{container.location}</p>
            </div>

            <!-- Size -->
            <div class="flex items-center gap-2">
              <span class="font-medium">Size:</span>
              <p class="flex-1">{container.size}</p>
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
        </div>
      </div>
      <!-- Plants List -->
      <div class="w-full mt-2">
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-semibold">Plants ({getTotalPlantsCount(container)})</h2>
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
              <div class="bg-white dark:bg-stone-700 rounded-lg p-4 shadow-sm">
                <div class="flex items-baseline justify-between">
                  <div class="flex items-baseline gap-2">
                    <p class="font-medium">{plant.expand?.species.name}</p>
                    <div class="flex items-center gap-1">
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        {plant.quantity || 1} plants
                      </p>
                    </div>
                  </div>
                  <button
                    use:melt={$deletePlantTrigger}
                    onclick={() => {
                      deletingPlantId = plant.id
                    }}
                    class="text-stone-400 hover:text-red-600 sm:opacity-60 sm:hover:opacity-100"
                    aria-label="Delete plant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Delete Container Dialog -->
{#if $deleteContainerOpen}
  <div
    use:melt={$deleteContainerOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$deleteContainerContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <Trash2 size={24} />
      <h2 use:melt={$deleteContainerTitle} class="text-lg font-semibold">Delete Container</h2>
    </div>

    <p use:melt={$deleteContainerDescription} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete "{container.name}"? This will also delete all plants in this
      container. This action cannot be undone.
    </p>

    <div class="flex justify-end gap-3 mt-6">
      <button
        use:melt={$deleteContainerClose}
        class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        onclick={() => {
          deleteContainer()
          $deleteContainerOpen = false
        }}
      >
        Delete Container
      </button>
    </div>
  </div>
{/if}

{#if $editContainerOpen}
  <div
    use:melt={$editContainerOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$editContainerContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Edit Container</h2>
      <button use:melt={$editContainerClose} class="text-stone-400 hover:text-stone-600">
        <X size={20} />
      </button>
    </div>

    <form
      onsubmit={(e) => {
        e.preventDefault()
        if (hasChanges) {
          saveContainerChanges()
        }
      }}
      class="mt-4 space-y-4"
    >
      <div class="space-y-2">
        <label for="name" class="block text-sm font-medium">Name</label>
        <input
          type="text"
          id="name"
          bind:value={formData.name}
          class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
        />
      </div>

      <div class="space-y-2">
        <label for="location" class="block text-sm font-medium">Location</label>
        <input
          type="text"
          id="location"
          bind:value={formData.location}
          class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
        />
      </div>

      <div class="space-y-2">
        <label for="size" class="block text-sm font-medium">Size</label>
        <input
          type="text"
          id="size"
          bind:value={formData.size}
          class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
        />
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button
          type="button"
          use:melt={$editContainerClose}
          class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 disabled:opacity-50 disabled:hover:bg-lime-700"
          disabled={!hasChanges}
        >
          Save Changes
        </button>
      </div>
    </form>
  </div>
{/if}

{#if $deletePlantOpen}
  <div
    use:melt={$deletePlantOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$deletePlantContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <Trash2 size={24} />
      <h2 use:melt={$deletePlantTitle} class="text-lg font-semibold">Delete Plant</h2>
    </div>

    <p use:melt={$deletePlantDescription} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete this plant? This action cannot be undone.
    </p>

    <div class="flex justify-end gap-3 mt-6">
      <button
        use:melt={$deletePlantClose}
        class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        onclick={() => {
          if (deletingPlantId) {
            deletePlant(deletingPlantId)
          }
        }}
      >
        Delete Plant
      </button>
    </div>
  </div>
{/if}

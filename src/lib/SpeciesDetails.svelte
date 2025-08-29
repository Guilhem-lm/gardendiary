<!-- SpeciesDetails.svelte -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition'
  import { ArrowLeft, Settings, EllipsisVertical, Trash2, X } from 'lucide-svelte'
  import type { Species } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { createDialog, createDropdownMenu, melt } from '@melt-ui/svelte'
  import PhotoCarousel from './PhotoCarousel.svelte'

  interface Props {
    species: Species
    onClose: () => void
  }

  const { species, onClose }: Props = $props()

  // Species actions dropdown
  const {
    elements: {
      trigger: speciesActionsTrigger,
      menu: speciesActionsMenu,
      overlay: speciesActionsOverlay,
      item: speciesActionsItem,
    },
    states: { open: speciesActionsOpen },
  } = createDropdownMenu({
    positioning: {
      placement: 'bottom-end',
    },
    preventScroll: true,
    loop: true,
  })

  // Delete species dialog
  const {
    elements: {
      trigger: deleteSpeciesTrigger,
      content: deleteSpeciesContent,
      overlay: deleteSpeciesOverlay,
      title: deleteSpeciesTitle,
      description: deleteSpeciesDescription,
      close: deleteSpeciesClose,
    },
    states: { open: deleteSpeciesOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  // Edit species dialog
  const {
    elements: {
      trigger: editSpeciesTrigger,
      content: editSpeciesContent,
      overlay: editSpeciesOverlay,
      close: editSpeciesClose,
    },
    states: { open: editSpeciesOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  // Form state
  let formData = $state({
    name: species.name,
    description: species.description || '',
  })

  let hasChanges = $derived(
    formData.name !== species.name || formData.description !== (species.description || '')
  )

  async function saveSpeciesChanges() {
    try {
      await pb.collection('species').update(species.id, formData)

      // Refresh species
      const updated = await pb.collection('species').getOne<Species>(species.id)
      Object.assign(species, updated)

      $editSpeciesOpen = false
      toast('Species updated successfully', { type: 'success' })
    } catch (error) {
      console.error('Error updating species:', error)
      toast('Failed to update species', { type: 'error' })
    }
  }

  async function handlePhotoUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('photos+', file) // Using the + operator to append to the array

      // Update the species with the new photo
      await pb.collection('species').update(species.id, formData)

      // Refresh species to get updated photos
      const updated = await pb.collection('species').getOne<Species>(species.id)
      Object.assign(species, updated)

      toast('Photo added successfully', { type: 'success' })
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast('Failed to upload photo', { type: 'error' })
    }

    // Reset the input
    input.value = ''
  }

  async function deleteSpecies() {
    try {
      await pb.collection('species').delete(species.id)
      toast('Species deleted successfully', { type: 'success' })
      onClose()
    } catch (error) {
      console.error('Error deleting species:', error)
      toast('Failed to delete species', { type: 'error' })
    }
  }

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
      toast('Failed to load plants', { type: 'error' })
    } finally {
      loading = false
    }
  }

  $effect(() => {
    fetchPlants()
  })
</script>

<div
  class="fixed inset-0 bg-stone-50 dark:bg-stone-800 z-[200] overflow-auto"
  transition:fly={{ y: '100%', duration: 300 }}
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
      <h1 class="text-2xl font-semibold">{species.name}</h1>
    </div>

    <button
      use:melt={$speciesActionsTrigger}
      class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2"
      aria-label="Species actions"
    >
      <EllipsisVertical size={20} />
    </button>

    {#if $speciesActionsOpen}
      <div
        use:melt={$speciesActionsOverlay}
        class="fixed inset-0 z-[300]"
        transition:fade={{ duration: 100 }}
      ></div>

      <div
        use:melt={$speciesActionsMenu}
        class="absolute right-0 mt-1 w-36 bg-white dark:bg-stone-800 rounded-lg shadow-lg py-1 z-[301]"
        transition:scale={{ duration: 150, start: 0.95 }}
      >
        <button
          use:melt={$speciesActionsItem}
          use:melt={$editSpeciesTrigger}
          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-700"
          onclick={() => {
            $speciesActionsOpen = false
          }}
        >
          <Settings size={16} />
          Edit
        </button>
        <button
          use:melt={$speciesActionsItem}
          use:melt={$deleteSpeciesTrigger}
          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-stone-100 dark:hover:bg-stone-700"
          onclick={() => {
            $speciesActionsOpen = false
          }}
        >
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    {/if}
  </div>

  <!-- Content -->
  <div class="max-w-4xl mx-auto p-4 flex flex-col gap-4">
    <div class="flex flex-col md:flex-row md:items-start md:justify-start gap-4">
      <!-- Photo Carousel -->
      <PhotoCarousel
        record={species}
        collectionName="species"
        onDelete={async () => {
          const updated = await pb.collection('species').getOne<Species>(species.id)
          Object.assign(species, updated)
        }}
        onUpload={handlePhotoUpload}
      />

      <!-- Species Details -->
      <div class="bg-white dark:bg-stone-700 rounded-lg p-4 shadow-sm md:grow min-w-0 md:h-80">
        <div class="flex flex-col gap-3 text-sm text-stone-500 dark:text-stone-400">
          <!-- Description -->
          <div class="flex items-start gap-2">
            <span class="font-medium">Description:</span>
            <p class="flex-1">{species.description || 'No description'}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Plants List -->
    <div>
      <h2 class="text-lg font-semibold mb-3">Plants of this species</h2>
      {#if loading}
        <p class="text-stone-500 dark:text-stone-400">Loading plants...</p>
      {:else if plants.length === 0}
        <p class="text-stone-500 dark:text-stone-400">No plants of this species yet.</p>
      {:else}
        <div class="grid gap-3">
          {#each plants as plant}
            <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
              <div class="flex items-baseline justify-between">
                <div class="flex items-baseline gap-2">
                  <p class="font-medium">
                    In container: {plant.expand?.container?.name || 'Unknown container'}
                  </p>
                  <p class="text-sm text-stone-500 dark:text-stone-400">
                    {plant.quantity || 1} plants
                  </p>
                </div>
              </div>
              <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Location: {plant.expand?.container?.location || '-'}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if $editSpeciesOpen}
  <div
    use:melt={$editSpeciesOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$editSpeciesContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Edit Species</h2>
      <button use:melt={$editSpeciesClose} class="text-stone-400 hover:text-stone-600">
        <X size={20} />
      </button>
    </div>

    <form
      onsubmit={(e) => {
        e.preventDefault()
        if (hasChanges) {
          saveSpeciesChanges()
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
        <label for="description" class="block text-sm font-medium">Description</label>
        <textarea
          id="description"
          bind:value={formData.description}
          rows="3"
          class="w-full px-3 py-2 border rounded-md dark:bg-stone-700 resize-none"
        ></textarea>
      </div>

      <div class="flex justify-end gap-2 pt-4">
        <button
          type="button"
          use:melt={$editSpeciesClose}
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

{#if $deleteSpeciesOpen}
  <div
    use:melt={$deleteSpeciesOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$deleteSpeciesContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[301]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <Trash2 size={24} />
      <h2 use:melt={$deleteSpeciesTitle} class="text-lg font-semibold">Delete Species</h2>
    </div>

    <p use:melt={$deleteSpeciesDescription} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete "{species.name}"? This will also delete all plants of this
      species. This action cannot be undone.
    </p>

    <div class="flex justify-end gap-3 mt-6">
      <button
        use:melt={$deleteSpeciesClose}
        class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        onclick={() => {
          deleteSpecies()
          $deleteSpeciesOpen = false
        }}
      >
        Delete Species
      </button>
    </div>
  </div>
{/if}

<!-- SpeciesDetails.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition'
  import { Settings, EllipsisVertical, Trash2, X, Camera } from 'lucide-svelte'
  import type { Plant, Species } from './types'
  import { getCurrentUser, pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { createDialog, createDropdownMenu, melt } from '@melt-ui/svelte'
  import PhotoCarousel from './PhotoCarousel.svelte'
  import DrawerOrPage from './components/DrawerOrPage.svelte'
  import { push } from 'svelte-spa-router'

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
      portalled: editSpeciesPortalled,
    },
    states: { open: editSpeciesOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
    forceVisible: true,
    portal: '#app',
  })

  // Form state
  let formData: Species | null = $state(null)
  let species: Species | null = $state(null)

  let hasChanges = $derived.by(() => {
    if (!species || !formData) return false
    formData.name !== species.name ||
      formData.description !== (species.description || '') ||
      formData.days_to_harvest !== (species.days_to_harvest || 0) ||
      formData.spacing !== (species.spacing || 0) ||
      JSON.stringify(formData.sowing) !== JSON.stringify(species.sowing || []) ||
      JSON.stringify(formData.transplanting) !== JSON.stringify(species.transplanting || []) ||
      formData.direct_sowing !== (species.direct_sowing || false) ||
      formData.tag !== (species.tag || '')
  })

  async function saveSpeciesChanges() {
    if (!species || !formData) return

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
    if (!species) return

    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('species', species.id)
      formData.append('taken_at', new Date(file.lastModified).toISOString())
      formData.append('created_by', getCurrentUser()?.id || '')

      // Create new photo record
      const photo = await pb.collection('photos').create(formData)

      toast('Photo added successfully', { type: 'success' })

      photoCarousel?.navigateToPhoto(photo.id)
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast('Failed to upload photo', { type: 'error' })
    }

    // Reset the input
    input.value = ''
  }

  async function deleteSpecies() {
    if (!species) return
    try {
      await pb.collection('species').delete(species.id)
      toast('Species deleted successfully', { type: 'success' })
      push('/')
    } catch (error) {
      console.error('Error deleting species:', error)
      toast('Failed to delete species', { type: 'error' })
    }
  }

  let plants: Plant[] = $state([])
  let loadingPlants = $state(true)

  async function fetchPlants(speciesId: string) {
    try {
      loadingPlants = true
      const records = await pb.collection('plants').getFullList({
        filter: `species = "${speciesId}"`,
        expand: 'containers_via_plants',
      })
      plants = records as Plant[]
    } catch (error) {
      console.error('Error fetching plants:', error)
      toast('Failed to load plants', { type: 'error' })
    } finally {
      loadingPlants = false
    }
  }

  export async function openSpecies(newSpecies: Species, isPage?: boolean) {
    species = newSpecies
    fetchPlants(species.id)
    formData = species
    if (isPage) {
      drawer?.openPage()
    } else {
      drawer?.openDrawer()
    }
  }

  let photoCarousel: PhotoCarousel | undefined = $state(undefined)

  let drawer: DrawerOrPage | undefined = $state(undefined)
</script>

{#snippet actions()}
  <div class="flex gap-2 items-center">
    <label
      for="photo-upload"
      class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 cursor-pointer"
    >
      <Camera size={16} />
    </label>
    <input
      type="file"
      id="photo-upload"
      accept="image/*"
      class="hidden"
      onchange={handlePhotoUpload}
    />

    <button
      use:melt={$speciesActionsTrigger}
      class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2"
      aria-label="Species actions"
    >
      <EllipsisVertical size={20} />
    </button>
  </div>

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
{/snippet}

{#snippet content()}
  {#if species}
    <!-- Content -->
    <div class="max-w-4xl mx-auto p-4 flex flex-col gap-4">
      <div class="flex flex-col md:flex-row md:items-start md:justify-start gap-4">
        <!-- Photo Carousel -->
        <PhotoCarousel speciesId={species.id} bind:this={photoCarousel} />

        <!-- Species Details -->
        <div class="bg-white dark:bg-stone-700 rounded-lg p-4 shadow-sm md:grow min-w-0 md:h-96">
          <div class="flex flex-col gap-3 text-sm text-stone-500 dark:text-stone-400">
            <!-- Description -->
            <div class="flex items-start gap-2">
              <span class="font-semibold text-stone-600 dark:text-stone-300">Description:</span>
              <p class="flex-1">{species.description || 'No description'}</p>
            </div>

            <!-- Days to Harvest -->
            {#if species.days_to_harvest}
              <div class="flex items-center gap-2">
                <span class="font-semibold text-stone-600 dark:text-stone-300"
                  >Days to Harvest:</span
                >
                <p>{species.days_to_harvest} days</p>
              </div>
            {/if}

            <!-- Spacing -->
            {#if species.spacing}
              <div class="flex items-center gap-2">
                <span class="font-semibold text-stone-600 dark:text-stone-300">Spacing:</span>
                <p>{species.spacing} cm</p>
              </div>
            {/if}

            <!-- Sowing Months -->
            {#if species.sowing && species.sowing.length > 0}
              <div class="flex items-start gap-2">
                <span class="font-semibold text-stone-600 dark:text-stone-300">Sowing:</span>

                <div class="flex flex-wrap gap-1">
                  {#each species.sowing as month}
                    <div
                      class="h-6 rounded-md bg-lime-100 dark:bg-lime-900 flex items-center justify-center text-xs px-1 font-medium text-stone-700 dark:text-stone-100"
                    >
                      {month.slice(0, 3)}
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <span class="font-semibold text-stone-600 dark:text-stone-300">No direct sowing</span>
            {/if}

            <!-- Transplanting Months -->
            {#if species.transplanting && species.transplanting.length > 0}
              <div class="flex items-start gap-2">
                <span class="font-medium">Transplanting:</span>

                <div class="flex flex-wrap gap-1">
                  {#each species.transplanting as month}
                    <div
                      class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300"
                    >
                      {month.slice(0, 3)}
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <span class="font-semibold text-stone-600 dark:text-stone-300">Direct sowing</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Plants List -->
      <div>
        <h2 class="text-lg font-semibold mb-3">Plants of this species</h2>
        {#if loadingPlants}
          <p class="text-stone-500 dark:text-stone-400">Loading plants...</p>
        {:else if plants.length === 0}
          <p class="text-stone-500 dark:text-stone-400">
            No plants of this species in containers yet.
          </p>
        {:else}
          <div class="grid gap-3">
            {#each plants as plant}
              <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
                {#if plant.expand?.containers_via_plants && plant.expand?.containers_via_plants.length > 0}
                  {@const container = plant.expand?.containers_via_plants[0]}
                  <div class="flex items-baseline justify-between">
                    <div class="flex items-baseline gap-2">
                      <p class="font-medium">
                        In container: {container.name || 'Unknown container'}
                      </p>
                      <p class="text-sm text-stone-500 dark:text-stone-400">
                        {plant.quantity || 1} plants
                      </p>
                    </div>
                  </div>
                  <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
                    Location: {container.location || '-'}
                  </p>
                {:else}
                  <p class="font-medium">Not in a container</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-stone-500 dark:text-stone-400">Loading species...</p>
  {/if}
{/snippet}

<DrawerOrPage title={species?.name || 'Loading...'} bind:this={drawer} {actions} {content} />

{#if $editSpeciesOpen && formData}
  <div class="" use:melt={$editSpeciesPortalled}>
    <div
      use:melt={$editSpeciesOverlay}
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      transition:fade={{ duration: 150 }}
    ></div>

    <div
      use:melt={$editSpeciesContent}
      class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-50 max-h-[90vh] overflow-y-auto"
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

        <div class="space-y-2">
          <label for="days_to_harvest" class="block text-sm font-medium">Days to Harvest</label>
          <input
            type="number"
            id="days_to_harvest"
            bind:value={formData.days_to_harvest}
            min="0"
            class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
          />
        </div>

        <div class="space-y-2">
          <label for="spacing" class="block text-sm font-medium">Spacing (cm)</label>
          <input
            type="number"
            id="spacing"
            bind:value={formData.spacing}
            min="0"
            class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
          />
        </div>

        <div class="space-y-2">
          <span class="block text-sm font-medium">Sowing Months</span>
          <div class="grid grid-cols-3 gap-2">
            {#each ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as month}
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={month}
                  checked={formData.sowing.includes(month)}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement
                    if (target.checked) {
                      formData!.sowing = [...formData!.sowing, month]
                    } else {
                      formData!.sowing = formData!.sowing.filter((m: string) => m !== month)
                    }
                  }}
                  class="rounded"
                />
                <span class="text-sm">{month.slice(0, 3)}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="space-y-2">
          <span class="block text-sm font-medium">Transplanting Months</span>
          <div class="grid grid-cols-3 gap-2">
            {#each ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as month}
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={month}
                  checked={formData.transplanting.includes(month)}
                  onchange={(e) => {
                    const target = e.target as HTMLInputElement
                    if (target.checked) {
                      formData!.transplanting = [...formData!.transplanting, month]
                    } else {
                      formData!.transplanting = formData!.transplanting.filter(
                        (m: string) => m !== month
                      )
                    }
                  }}
                  class="rounded"
                />
                <span class="text-sm">{month.slice(0, 3)}</span>
              </label>
            {/each}
          </div>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={formData.direct_sowing} class="rounded" />
            <span class="text-sm font-medium">Direct Sowing</span>
          </label>
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
  </div>
{/if}

{#if $deleteSpeciesOpen && species}
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

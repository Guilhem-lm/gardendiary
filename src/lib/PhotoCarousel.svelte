<!-- PhotoCarousel.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition'
  import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-svelte'
  import { createDialog, melt } from '@melt-ui/svelte'
  import { getCurrentUser, pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { onMount, onDestroy } from 'svelte'

  interface Props {
    containerId?: string
    speciesId?: string
  }

  const { containerId, speciesId }: Props = $props()

  // Photo carousel state
  let photos = $state<any[]>([])
  let loading = $state(true)
  let currentPhotoIndex = $state(0)
  let touchStartX = $state(0)
  let touchStartY = $state(0)
  let isDragging = $state(false)
  let unsubscribe: (() => void) | null = $state(null)

  // Fetch photos based on container or species ID
  export async function fetchPhotos() {
    try {
      loading = true
      let filter = ''

      if (containerId) {
        filter = `container = "${containerId}"`
      } else if (speciesId) {
        filter = `species = "${speciesId}"`
      } else {
        photos = []
        return
      }

      const records = await pb.collection('photos').getFullList({
        filter,
        sort: '-taken_at',
      })

      photos = records

      // Set current index to the newest photo (index 0 since we sort by -taken_at)
      currentPhotoIndex = photos.length > 0 ? 0 : 0
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast('Failed to load photos', { type: 'error' })
    } finally {
      loading = false
    }
  }

  onMount(async () => {
    await fetchPhotos()
    await setupSubscription()
  })

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })

  async function setupSubscription() {
    if (!containerId && !speciesId) return

    try {
      unsubscribe = await pb.collection('photos').subscribe('*', ({ record, action }) => {
        // Handle different types of events
        if (
          action === 'create' &&
          (record.container === containerId || record.species === speciesId)
        ) {
          // New photo added - refresh the list
          // Find the right position based on taken_at
          const index = photos.findIndex(
            (photo) => new Date(photo.taken_at) < new Date(record.taken_at)
          )
          if (index === -1) {
            photos.push(record) // Add to end if it's the oldest
          } else {
            photos.splice(index, 0, record) // Insert at correct position
            if (index <= currentPhotoIndex) {
              currentPhotoIndex++ // Increment index if photo was inserted before current view
            }
          }
        } else if (action === 'delete') {
          // Photo deleted - update the list and adjust the index safely
          const removedIndex = photos.findIndex((photo) => photo.id === record.id)
          photos = photos.filter((photo) => photo.id !== record.id)
          if (removedIndex !== -1) {
            if (currentPhotoIndex > removedIndex) {
              currentPhotoIndex--
            } else if (currentPhotoIndex === removedIndex) {
              // If we deleted the currently displayed photo, clamp to a valid index
              if (currentPhotoIndex >= photos.length) {
                currentPhotoIndex = Math.max(0, photos.length - 1)
              }
            }
          }
        } else if (action === 'update') {
          // Photo updated - refresh the list
          const index = photos.findIndex((photo) => photo.id === record.id)
          if (index !== -1) {
            photos[index] = record
          }
        }
      })
    } catch (error) {
      console.error('Error setting up photo subscription:', error)
    }
  }

  function nextPhoto() {
    if (photos.length > 0 && currentPhotoIndex < photos.length - 1) {
      currentPhotoIndex++
    }
  }

  function previousPhoto() {
    if (photos.length > 0 && currentPhotoIndex > 0) {
      currentPhotoIndex--
    }
  }

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    isDragging = false
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartX)
      const deltaY = Math.abs(touch.clientY - touchStartY)

      if (deltaX > 10 && deltaX > deltaY) {
        isDragging = true
        event.preventDefault()
      }
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (!isDragging) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartX
    const deltaY = Math.abs(touch.clientY - touchStartY)

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        previousPhoto()
      } else {
        nextPhoto()
      }
    }
    isDragging = false
  }

  // Full screen photo dialog
  const {
    elements: {
      trigger: fullscreenPhotoTrigger,
      content: fullscreenPhotoContent,
      overlay: fullscreenPhotoOverlay,
      close: fullscreenPhotoClose,
    },
    states: { open: fullscreenPhotoOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  // Delete photo dialog
  const {
    elements: {
      trigger: deletePhotoTrigger,
      content: deletePhotoContent,
      overlay: deletePhotoOverlay,
      title: deletePhotoTitle,
      description: deletePhotoDescription,
      close: deletePhotoClose,
    },
    states: { open: deletePhotoOpen },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  async function deleteCurrentPhoto() {
    if (!photos.length || currentPhotoIndex >= photos.length) return

    try {
      const photoToDelete = photos[currentPhotoIndex]

      // Delete the photo record
      await pb.collection('photos').delete(photoToDelete.id)

      toast('Photo deleted successfully', { type: 'success' })
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast('Failed to delete photo', { type: 'error' })
    }
  }

  async function uploadPhoto(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (containerId) {
        formData.append('container', containerId)
      }
      if (speciesId) {
        formData.append('species', speciesId)
      }
      formData.append('taken_at', new Date(file.lastModified).toISOString())
      formData.append('created_by', getCurrentUser()?.id || '')

      // Create new photo record
      await pb.collection('photos').create(formData)

      toast('Photo added successfully', { type: 'success' })
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast('Failed to upload photo', { type: 'error' })
    }

    // Reset the input
    input.value = ''
  }

  export function navigateToPhoto(photoId: string) {
    const index = photos.findIndex((photo) => photo.id === photoId)
    if (index !== -1) {
      currentPhotoIndex = index
    }
  }
</script>

<div class="w-full max-w-96 aspect-square shrink-0 relative group mx-auto md:mx-0">
  {#if loading}
    <div
      class="w-full h-full bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center"
    >
      <p class="text-stone-500 dark:text-stone-400">Loading photos...</p>
    </div>
  {:else if photos.length > 0}
    <div
      class="w-full h-full touch-pan-y"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    >
      <div class="absolute inset-0 cursor-zoom-in z-10" use:melt={$fullscreenPhotoTrigger}></div>
      <img
        src={pb.files.getURL(photos[currentPhotoIndex], photos[currentPhotoIndex].file, {
          thumb: '800x800',
        })}
        alt={`Photo ${currentPhotoIndex + 1} of ${photos.length}`}
        class="w-full h-full object-cover rounded-lg select-none"
        draggable="false"
      />

      <!-- Navigation buttons -->
      {#if photos.length > 1}
        <button
          class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20 touch-manipulation"
          onclick={(e) => {
            e.stopPropagation()
            previousPhoto()
          }}
          disabled={currentPhotoIndex === 0}
          aria-label="Previous photo"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20 touch-manipulation"
          onclick={(e) => {
            e.stopPropagation()
            nextPhoto()
          }}
          disabled={currentPhotoIndex === photos.length - 1}
          aria-label="Next photo"
        >
          <ChevronRight size={24} />
        </button>

        <!-- Photo indicators -->
        <div class="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-20">
          {#each photos as _, i}
            <button
              class="w-2 h-2 rounded-full transition-colors touch-manipulation {i ===
              currentPhotoIndex
                ? 'bg-white'
                : 'bg-white/50 hover:bg-white/75'}"
              onclick={() => (currentPhotoIndex = i)}
              aria-label="Go to photo {i + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div
      class="w-full h-full bg-stone-100 dark:bg-stone-700 rounded-lg flex flex-col items-center justify-center gap-4"
    >
      <p class="text-stone-500 dark:text-stone-400 px-4">No photo added yet</p>

      <label
        for="photo-upload"
        class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 cursor-pointer"
      >
        Add Photo
      </label>
      <input type="file" id="photo-upload" accept="image/*" class="hidden" onchange={uploadPhoto} />
    </div>
  {/if}
</div>

{#if $fullscreenPhotoOpen && photos.length > 0}
  <div
    use:melt={$fullscreenPhotoOverlay}
    class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[400]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$fullscreenPhotoContent}
    class="fixed inset-0 z-[401] flex items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <div class="relative w-full h-full flex items-center justify-center">
      <!-- Close button -->
      <button
        use:melt={$fullscreenPhotoClose}
        class="absolute top-4 right-2 text-white/75 hover:text-white dark:bg-stone-700/50 rounded-lg p-2"
      >
        <X size={24} />
      </button>

      <div
        class="absolute bottom-2 right-2 flex items-center gap-4 text-stone-600 dark:text-stone-200 dark:bg-stone-700/50 bg-stone-50/50 rounded-lg p-2"
      >
        {#if photos[currentPhotoIndex]?.taken_at}
          <p class="text-lg">
            {new Date(photos[currentPhotoIndex].taken_at).toLocaleDateString()}
          </p>
        {/if}
        <button
          use:melt={$deletePhotoTrigger}
          class="text-stone-600 dark:text-stone-200 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
        >
          <Trash2 size={24} />
        </button>
      </div>

      <!-- Navigation buttons -->
      {#if photos.length > 1}
        <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between">
          <button
            class="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50"
            onclick={(e) => {
              e.stopPropagation()
              previousPhoto()
            }}
            disabled={currentPhotoIndex === 0}
            aria-label="Previous photo"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            class="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50"
            onclick={(e) => {
              e.stopPropagation()
              nextPhoto()
            }}
            disabled={currentPhotoIndex === photos.length - 1}
            aria-label="Next photo"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      {/if}

      <!-- Full screen image -->
      <img
        src={pb.files.getURL(photos[currentPhotoIndex], photos[currentPhotoIndex].file, {
          thumb: '800x800',
        })}
        alt={`Photo ${currentPhotoIndex + 1} of ${photos.length}`}
        class="max-h-full max-w-full object-contain"
      />

      <!-- Photo indicators -->
      {#if photos.length > 1}
        <div class="absolute bottom-4 inset-x-0 flex justify-center gap-1">
          {#each photos as _, i}
            <button
              class="w-2 h-2 rounded-full transition-colors {i === currentPhotoIndex
                ? 'bg-white'
                : 'bg-white/50 hover:bg-white/75'}"
              onclick={() => (currentPhotoIndex = i)}
              aria-label="Go to photo {i + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if $deletePhotoOpen}
  <div
    use:melt={$deletePhotoOverlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500]"
    transition:fade={{ duration: 150 }}
  ></div>

  <div
    use:melt={$deletePhotoContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[501]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div class="flex items-center gap-3 text-red-600">
      <Trash2 size={24} />
      <h2 use:melt={$deletePhotoTitle} class="text-lg font-semibold">Delete Photo</h2>
    </div>

    <p use:melt={$deletePhotoDescription} class="mt-4 text-stone-600 dark:text-stone-300">
      Are you sure you want to delete this photo? This action cannot be undone.
    </p>

    <div class="flex justify-end gap-3 mt-6">
      <button
        use:melt={$deletePhotoClose}
        class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        onclick={() => {
          deleteCurrentPhoto()
          $deletePhotoOpen = false
        }}
      >
        Delete Photo
      </button>
    </div>
  </div>
{/if}

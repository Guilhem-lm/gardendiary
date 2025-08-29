<!-- PhotoCarousel.svelte -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition'
  import { ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-svelte'
  import { createDialog, melt } from '@melt-ui/svelte'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'

  interface Props {
    record: any
    collectionName: string
    onDelete?: () => void
    onUpload?: (event: Event) => void
  }

  const { record, collectionName, onDelete, onUpload }: Props = $props()

  // Photo carousel state
  let currentPhotoIndex = $state(0)

  function nextPhoto() {
    if (record.photos && currentPhotoIndex < record.photos.length - 1) {
      currentPhotoIndex++
    }
  }

  function previousPhoto() {
    if (currentPhotoIndex > 0) {
      currentPhotoIndex--
    }
  }

  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0]
    touchStartX = touch.clientX
  }

  function handleTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartX

    if (Math.abs(deltaX) > 50) {
      // minimum swipe distance
      if (deltaX > 0) {
        previousPhoto()
      } else {
        nextPhoto()
      }
    }
  }

  let touchStartX = 0

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
    if (!record.photos || !record.photos.length) return

    try {
      // Create new arrays without the current photo and its metadata
      const updatedPhotos = record.photos.filter(
        (_: string, index: number) => index !== currentPhotoIndex
      )
      const updatedPhotosTakenAt = (record.photos_taken_at || []).filter(
        (_: any, index: number) => index !== currentPhotoIndex
      )

      // Update the record with the new photos array and metadata
      await pb.collection(collectionName).update(record.id, {
        photos: updatedPhotos,
        photos_taken_at: updatedPhotosTakenAt,
      })

      // Adjust current photo index if needed
      if (currentPhotoIndex >= updatedPhotos.length) {
        currentPhotoIndex = Math.max(0, updatedPhotos.length - 1)
      }

      // Call onDelete callback if provided
      if (onDelete) {
        onDelete()
      }

      toast('Photo deleted successfully', { type: 'success' })
    } catch (error) {
      console.error('Error deleting photo:', error)
      toast('Failed to delete photo', { type: 'error' })
    }
  }
</script>

<div class="w-full max-w-80 aspect-square shrink-0 relative group mx-auto md:mx-0">
  {#if record.photos && record.photos.length > 0}
    <div class="w-full h-full" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
      <div class="absolute inset-0 cursor-zoom-in z-10" use:melt={$fullscreenPhotoTrigger}></div>
      <img
        src={pb.files.getURL(record, record.photos[currentPhotoIndex])}
        alt={`Photo ${currentPhotoIndex + 1} of ${record.photos.length}`}
        class="w-full h-full object-cover rounded-lg"
      />

      <!-- Navigation buttons -->
      {#if record.photos.length > 1}
        <button
          class="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          onclick={(e) => {
            e.stopPropagation()
            nextPhoto()
          }}
          disabled={currentPhotoIndex === record.photos.length - 1}
          aria-label="Next photo"
        >
          <ChevronRight size={24} />
        </button>

        <!-- Photo indicators -->
        <div class="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-20">
          {#each record.photos as _, i}
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
  {:else}
    <div
      class="w-full h-full bg-stone-100 dark:bg-stone-700 rounded-lg flex flex-col items-center justify-center gap-4"
    >
      <p class="text-stone-500 dark:text-stone-400 px-4">No photo added yet</p>
      {#if onUpload}
        <label
          for="photo-upload"
          class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 cursor-pointer"
        >
          Add Photo
        </label>
        <input type="file" id="photo-upload" accept="image/*" class="hidden" onchange={onUpload} />
      {/if}
    </div>
  {/if}
</div>

{#if $fullscreenPhotoOpen}
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
        <p class="text-lg">
          {record.photos_taken_at?.[currentPhotoIndex]
            ? new Date(record.photos_taken_at[currentPhotoIndex]).toLocaleDateString()
            : 'No date available'}
        </p>
        <button
          use:melt={$deletePhotoTrigger}
          class="0 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
        >
          <Trash2 size={24} />
        </button>
      </div>

      <!-- Navigation buttons -->
      {#if record.photos && record.photos.length > 1}
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
            disabled={currentPhotoIndex === record.photos.length - 1}
            aria-label="Next photo"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      {/if}

      <!-- Full screen image -->
      <img
        src={pb.files.getURL(record, record.photos[currentPhotoIndex])}
        alt={`Photo ${currentPhotoIndex + 1} of ${record.photos.length}`}
        class="max-h-full max-w-full object-contain"
      />

      <!-- Photo indicators -->
      {#if record.photos && record.photos.length > 1}
        <div class="absolute bottom-4 inset-x-0 flex justify-center gap-1">
          {#each record.photos as _, i}
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

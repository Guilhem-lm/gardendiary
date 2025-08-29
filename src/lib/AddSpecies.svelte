<!-- AddSpecies.svelte -->
<script lang="ts">
  import { Plus } from 'lucide-svelte'
  import { createDialog, melt } from '@melt-ui/svelte'
  import { pb } from './pocketbase.svelte'
  import type { Species } from './types'
  import { fade, scale } from 'svelte/transition'
  import { toast } from './toast'

  interface Props {
    onSpeciesAdded: () => void
    species?: Species | null
  }

  const { species, onSpeciesAdded }: Props = $props()

  let name = $state(species?.name || '')
  let loading = $state(false)

  const {
    elements: { trigger, content: dialogContent, overlay, title, description, close },
    states: { open },
  } = createDialog({
    role: 'dialog',
    preventScroll: true,
  })

  async function handleSubmit() {
    if (!name.trim()) {
      toast('Please enter a species name', { type: 'error' })
      return
    }

    loading = true
    try {
      // Check if species already exists
      const existingSpecies = await pb.collection('species').getFullList<Species>({
        filter: `name = "${name.trim()}"`,
      })

      if (existingSpecies.length > 0) {
        toast('This species already exists', { type: 'error' })
        return
      }

      if (species?.id) {
        // Update existing species
        await pb.collection('species').update(species.id, {
          name: name.trim(),
        })
        toast('Species updated successfully', { type: 'success' })
      } else {
        // Create new species
        await pb.collection('species').create({
          name: name.trim(),
          created_by: pb.authStore.record?.id,
        })
        toast('Species added successfully', { type: 'success' })
      }

      // Reset form and close dialog
      name = ''
      $open = false
      onSpeciesAdded()
    } catch (error) {
      console.error('Error saving species:', error)
      toast('Failed to save species', { type: 'error' })
    } finally {
      loading = false
    }
  }
</script>

<!-- Add button -->
<button
  use:melt={$trigger}
  class="bg-lime-700 hover:bg-lime-800 text-white rounded-full p-3 shadow-lg transition-colors duration-200 w-fit"
  aria-label="Add species"
>
  <Plus size={24} />
</button>

{#if $open}
  <!-- Overlay -->
  <div
    use:melt={$overlay}
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
    transition:fade={{ duration: 150 }}
  ></div>

  <!-- Dialog -->
  <div
    use:melt={$dialogContent}
    class="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-[90vw] max-w-[400px] bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6 z-[51]"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <h2 use:melt={$title} class="text-lg font-semibold mb-4">
      {species ? 'Edit' : 'Add'} Species
    </h2>

    <form
      onsubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      class="flex flex-col gap-4"
    >
      <div>
        <label for="name" class="block text-sm font-medium mb-1">Name</label>
        <input
          type="text"
          id="name"
          bind:value={name}
          placeholder="Enter species name"
          class="w-full px-3 py-2 border rounded-md dark:bg-stone-700"
        />
      </div>

      <div class="flex justify-end gap-3 mt-2">
        <button
          type="button"
          use:melt={$close}
          class="px-4 py-2 text-sm border rounded-md hover:bg-stone-100 dark:hover:bg-stone-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          class="px-4 py-2 text-sm bg-lime-700 text-white rounded-md hover:bg-lime-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : species ? 'Update' : 'Add'} Species
        </button>
      </div>
    </form>
  </div>
{/if}

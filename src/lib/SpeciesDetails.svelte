<!-- SpeciesDetails.svelte -->
<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition'
  import { ArrowLeft, Pen, Check, X } from 'lucide-svelte'
  import type { Species } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'

  interface Props {
    species: Species
    onClose: () => void
  }

  const { species, onClose }: Props = $props()

  // Editing states
  let editingField = $state<'name' | 'description' | null>(null)
  let editValue = $state('')

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

  function startEditing(field: 'name' | 'description') {
    editingField = field
    editValue = species[field] || ''
  }

  async function saveEdit() {
    if (!editingField) return

    try {
      await pb.collection('species').update(species.id, {
        [editingField]: editValue,
      })
      species[editingField] = editValue
      toast('Species updated successfully', { type: 'success' })
    } catch (error) {
      toast('Failed to update species', { type: 'error' })
    } finally {
      editingField = null
    }
  }

  function cancelEdit() {
    editingField = null
  }

  $effect(() => {
    fetchPlants()
  })
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
      <!-- Name -->
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
            <h1 class="text-2xl font-semibold">{species.name}</h1>
            <button
              onclick={() => startEditing('name')}
              class="text-stone-400 hover:text-stone-600 sm:opacity-60 sm:hover:opacity-100"
              aria-label="Edit name"
            >
              <Pen size={16} />
            </button>
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-3 mt-4 text-sm text-stone-500 dark:text-stone-400">
        <!-- Description -->
        <div class="flex items-start gap-2">
          {#if editingField === 'description'}
            <div class="flex gap-2 items-start flex-1">
              <div class="flex items-center gap-1">
                <span class="font-medium mt-2">Description</span>
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
              <textarea
                bind:value={editValue}
                rows="3"
                class="flex-1 bg-transparent border rounded-md border-stone-300 dark:border-stone-600 focus:border-lime-700 dark:focus:border-lime-700 focus:outline-none p-2 resize-none"
              ></textarea>
            </div>
          {:else}
            <div class="flex items-center gap-1">
              <span class="font-medium">Description</span>
              <button
                onclick={() => startEditing('description')}
                class="text-stone-400 hover:text-stone-600 sm:opacity-60 sm:hover:opacity-100"
                aria-label="Edit description"
              >
                <Pen size={14} />
              </button>
            </div>
            <p class="flex-1">{species.description || 'No description'}</p>
          {/if}
        </div>

        <!-- Plants List -->
        <div class="mt-6">
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
  </div>
</div>

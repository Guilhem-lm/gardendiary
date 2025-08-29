<!-- ContainerDetails.svelte -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { ArrowLeft, Droplets } from 'lucide-svelte'
  import type { Container } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'

  interface Props {
    container: Container
    onClose: () => void
  }

  const { container, onClose }: Props = $props()

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
</script>

<div
  class="fixed inset-0 bg-stone-50 dark:bg-stone-900 z-[200] overflow-auto"
  transition:fly={{ y: '100%', duration: 300 }}
>
  <!-- Header -->
  <div
    class="sticky top-0 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700"
  >
    <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
      <button
        onclick={onClose}
        class="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
      >
        <ArrowLeft size={24} />
      </button>
      <button
        onclick={waterPlants}
        class="flex items-center gap-2 px-4 py-2 bg-lime-700 hover:bg-lime-800 text-white rounded-lg transition-colors"
      >
        <Droplets size={16} />
        Water Plants
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="max-w-4xl mx-auto p-4">
    <div class="bg-white dark:bg-stone-800 rounded-lg shadow-lg p-6">
      <h1 class="text-2xl font-bold mb-6">{container.name}</h1>

      <div class="grid gap-6">
        <!-- Basic Info -->
        <div>
          <h2 class="text-lg font-semibold mb-3">Details</h2>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-stone-500 dark:text-stone-400">Location</p>
              <p class="font-medium">{container.location}</p>
            </div>
            <div>
              <p class="text-sm text-stone-500 dark:text-stone-400">Size</p>
              <p class="font-medium">{container.size}</p>
            </div>
            <div>
              <p class="text-sm text-stone-500 dark:text-stone-400">Last Watered</p>
              <p class="font-medium">{formatDate(container.last_watered)}</p>
            </div>
          </div>
        </div>

        <!-- Plants -->
        <div>
          <h2 class="text-lg font-semibold mb-3">Plants</h2>
          {#if !container.expand?.plants || container.expand.plants.length === 0}
            <p class="text-stone-500 dark:text-stone-400">No plants in this container yet.</p>
          {:else}
            <div class="grid gap-3">
              {#each container.expand.plants as plant}
                <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
                  <p class="font-medium">{plant.expand?.species.name}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

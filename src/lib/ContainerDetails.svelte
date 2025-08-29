<!-- ContainerDetails.svelte -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { ArrowLeft, Droplets } from 'lucide-svelte'
  import type { Container } from './types'
  import { pb } from './pocketbase.svelte'
  import { toast } from './toast'
  import { getContainerPlants, formatPlantsCount } from './utils/container'

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
        <h1 class="text-2xl font-semibold">{container.name}</h1>
      </div>

      <div class="flex flex-col gap-3 mt-4 text-sm text-stone-500 dark:text-stone-400">
        <p class="text-stone-600 dark:text-stone-300">{formatPlantsCount(container)}</p>

        <div class="flex flex-col gap-2">
          <p><span class="font-medium">Location:</span> {container.location}</p>
          <p><span class="font-medium">Size:</span> {container.size}</p>
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
          <h2 class="text-lg font-semibold mb-3">Plants</h2>
          {#if !container.expand?.plants || container.expand.plants.length === 0}
            <p class="text-stone-500 dark:text-stone-400">No plants in this container yet.</p>
          {:else}
            <div class="grid gap-3">
              {#each container.expand.plants as plant}
                <div class="bg-stone-50 dark:bg-stone-700 rounded-lg p-4">
                  <div class="flex items-baseline gap-2">
                    <p class="font-medium">{plant.expand?.species.name}</p>
                    {#if plant.quantity > 1}
                      <p class="text-sm text-stone-500 dark:text-stone-400">× {plant.quantity}</p>
                    {/if}
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

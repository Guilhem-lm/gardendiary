<script lang="ts">
  import type { Container, Plant, Species } from './types'
  import { HandCoins } from 'lucide-svelte'

  interface Props {
    container?: Container
    plant?: Plant
  }

  let { container = undefined, plant = undefined }: Props = $props()

  type ComputedHarvest = {
    remainingDays: number
    totalDays: number
  }

  let harvest: ComputedHarvest | null = $derived.by(() => computeDaysToHarvest(container, plant))

  function computeDaysToHarvest(
    targetContainer?: Container,
    targetPlant?: Plant
  ): ComputedHarvest | null {
    const list: Plant[] = targetPlant ? [targetPlant] : targetContainer?.expand?.plants || []
    const candidates: ComputedHarvest[] = []

    const now = new Date()

    for (const plantItem of list) {
      const sp: Species | undefined = plantItem.expand?.species
      const totalDays = sp?.days_to_harvest
      if (!totalDays || totalDays <= 0) continue

      // Prefer explicit sowing date if present, else fall back to record creation date
      const sowingDateStr = (plantItem as any).sown_at || plantItem.created
      if (!sowingDateStr) continue

      const sowingDate = new Date(sowingDateStr)
      if (isNaN(sowingDate.getTime())) continue

      const harvestDate = new Date(sowingDate)
      harvestDate.setDate(harvestDate.getDate() + totalDays)

      const diffMs = harvestDate.getTime() - now.getTime()
      const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      candidates.push({ remainingDays, totalDays })
    }

    if (candidates.length === 0) return null

    // First harvest is the minimum remaining days
    const first = candidates.reduce((min, cur) =>
      cur.remainingDays < min.remainingDays ? cur : min
    )
    return first
  }

  function pctDone(h: ComputedHarvest): number {
    const done = h.totalDays - Math.max(h.remainingDays, 0)
    return Math.max(0, Math.min(100, Math.round((done / h.totalDays) * 100)))
  }
</script>

<style>
  :global(:root) {
    --lime-600: #65a30d;
  }
</style>

{#if harvest}
  <div class="flex items-center gap-3 text-stone-600 dark:text-stone-300">
    <div class="flex items-center gap-2">
      <div
        class="relative inline-flex items-center justify-center h-6 w-28 rounded-md border border-stone-300 dark:border-stone-600"
        style={`background: linear-gradient(to right, var(--lime-600) 0%, var(--lime-600) ${pctDone(harvest)}%, transparent ${pctDone(harvest)}%, transparent 100%)`}
        aria-label="Days to harvest progress"
      >
        <div
          class="absolute inset-[1px] bg-white dark:bg-stone-700 rounded-sm text-xs flex items-center justify-center gap-2 px-1"
        >
          {#if harvest.remainingDays > 0}
            <HandCoins size={12} />
            <span class="text-xs"
              >in
              {harvest.remainingDays} days
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

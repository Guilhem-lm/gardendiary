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
    isPerennial: boolean
  }

  let harvest: ComputedHarvest | null = $derived.by(() => computeDaysToHarvest(container, plant))

  function getHarvestPeriodInfo(species: Species): {
    currentlyHarvesting: boolean
    nextMonth: string | null
  } {
    if (!species.harvesting?.length) return { currentlyHarvesting: false, nextMonth: null }

    const now = new Date()
    const currentMonth = now.toLocaleString('default', { month: 'long' })
    const currentlyHarvesting = species.harvesting.includes(currentMonth)

    // Convert months to dates for proper comparison
    const monthDates = species.harvesting.map((month) => {
      const date = new Date(`${month} 1, ${now.getFullYear()}`)
      // If month is before current month, it's next year
      if (date < now && !currentlyHarvesting) {
        date.setFullYear(date.getFullYear() + 1)
      }
      return { month, date }
    })

    // Sort by closest future date
    monthDates.sort((a, b) => a.date.getTime() - b.date.getTime())

    // If we're harvesting now, no need for next month
    if (currentlyHarvesting) {
      return { currentlyHarvesting: true, nextMonth: null }
    }

    // Find the next month that's in the future
    const nextDate = monthDates.find((m) => m.date > now)
    return {
      currentlyHarvesting: false,
      nextMonth: nextDate ? nextDate.month : monthDates[0].month,
    }
  }

  function computeDaysToHarvest(
    targetContainer?: Container,
    targetPlant?: Plant
  ): ComputedHarvest | null {
    const list: Plant[] = targetPlant ? [targetPlant] : targetContainer?.expand?.plants || []
    const candidates: ComputedHarvest[] = []

    const now = new Date()

    for (const plantItem of list) {
      const sp: Species | undefined = plantItem.expand?.species
      if (!sp) continue

      // Check for perennial first
      if (sp.harvesting?.length) {
        const { currentlyHarvesting, nextMonth } = getHarvestPeriodInfo(sp)
        if (currentlyHarvesting) {
          // Currently in harvest period
          candidates.push({ remainingDays: 0, totalDays: 30, isPerennial: true })
          continue
        } else if (nextMonth) {
          // Calculate days until next harvest month
          const nextHarvestDate = new Date(`${nextMonth} 1, ${now.getFullYear()}`)
          // If the next harvest month is earlier in the year, it's next year
          if (nextHarvestDate < now) {
            nextHarvestDate.setFullYear(now.getFullYear() + 1)
          }
          const diffMs = nextHarvestDate.getTime() - now.getTime()
          const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          candidates.push({ remainingDays, totalDays: remainingDays, isPerennial: true }) // Use actual days for better progress
          continue
        }
      }

      // Fall back to days_to_harvest for annuals
      const totalDays = sp.days_to_harvest
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

      candidates.push({ remainingDays, totalDays, isPerennial: false })
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
          <HandCoins size={12} />
          <span class="text-xs">
            {#if plant?.expand?.species?.harvesting}
              {#if harvest.remainingDays <= 0}
                harvest now
              {:else}
                {new Date(Date.now() + harvest.remainingDays * 24 * 60 * 60 * 1000).toLocaleString(
                  'default',
                  { month: 'short' }
                )}
              {/if}
            {:else if container}
              {#if harvest.isPerennial}
                {#if harvest.remainingDays <= 0}
                  harvest now
                {:else}
                  {new Date(
                    Date.now() + harvest.remainingDays * 24 * 60 * 60 * 1000
                  ).toLocaleString('default', { month: 'short' })}
                {/if}
              {:else if harvest.remainingDays <= 0}
                ready
              {:else}
                in {harvest.remainingDays}d
              {/if}
            {:else if harvest.remainingDays <= 0}
              ready
            {:else}
              in {harvest.remainingDays}d
            {/if}
          </span>
        </div>
      </div>
    </div>
  </div>
{/if}

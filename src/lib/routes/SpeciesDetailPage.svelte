<script lang="ts">
  import SpeciesDetailDrawer from '../SpeciesDetail.svelte'
  import { pb } from '../pocketbase.svelte'
  import { querystring } from 'svelte-spa-router'
  import type { Species } from '../types'
  import { untrack } from 'svelte'

  let speciesDetailDrawer: SpeciesDetailDrawer | undefined = $state(undefined)
  let loading = $state(true)
  let error = $state<string | null>(null)

  const queryParams = $derived(new URLSearchParams($querystring || ''))
  const speciesId = $derived(queryParams.get('speciesId'))

  async function fetchSpecies(speciesId: string) {
    loading = true
    error = null
    try {
      const species = await pb.collection('species').getOne<Species>(speciesId, {
        expand: 'photos_via_species',
      })

      // Open the species detail drawer in page mode
      if (speciesDetailDrawer) {
        await speciesDetailDrawer.openSpecies(species, true)
      }
    } catch (err) {
      error = 'Failed to load species'
      console.error('Error fetching species:', err)
    } finally {
      loading = false
    }
  }

  // Fetch species when query string changes
  $effect(() => {
    if (speciesId) {
      untrack(() => fetchSpecies(speciesId))
    } else {
      error = 'No species ID provided'
    }
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p>{error}</p>
{/if}

<SpeciesDetailDrawer bind:this={speciesDetailDrawer} />

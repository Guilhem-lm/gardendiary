<script lang="ts">
  import SpeciesDetailDrawer from '../SpeciesDetail.svelte'
  import { pb } from '../pocketbase.svelte'
  import { querystring } from 'svelte-spa-router'
  import type { Species } from '../types'
  import { untrack } from 'svelte'

  let species: Species | undefined = $state(undefined)
  let loading = $state(true)
  let error = $state<string | null>(null)

  const queryParams = $derived(new URLSearchParams($querystring || ''))
  const speciesId = $derived(queryParams.get('speciesId'))

  async function fetchSpecies(speciesId: string) {
    loading = true
    error = null
    try {
      const selectedSpecies = await pb.collection('species').getOne<Species>(speciesId, {
        expand: 'photos_via_species',
      })
      species = selectedSpecies
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

<SpeciesDetailDrawer {species} isPage />

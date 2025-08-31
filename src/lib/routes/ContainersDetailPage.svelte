<script lang="ts">
  import ContainerDetails from '../ContainerDetails.svelte'
  import { pb } from '../pocketbase.svelte'
  import { querystring } from 'svelte-spa-router'
  import type { Container } from '../types'
  import { onMount } from 'svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let container: Container | undefined = $state(undefined)

  async function fetchContainer() {
    loading = true
    error = null
    try {
      const queryParams = new URLSearchParams($querystring || '')
      const containerId = queryParams.get('containerId')

      if (!containerId) {
        error = 'No container ID provided'
        return
      }

      const selectedContainer = await pb.collection('containers').getOne<Container>(containerId, {
        expand: 'plants.species, user, photos_via_container',
      })

      container = selectedContainer
    } catch (err) {
      error = 'Failed to load container'
      console.error('Error fetching container:', err)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchContainer()
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else if error}
  <p>{error}</p>
{:else if container}
  <ContainerDetails {container} isPage />
{/if}

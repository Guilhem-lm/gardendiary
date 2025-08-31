<script lang="ts">
  import ContainerDetailsDrawer from '../ContainerDetails.svelte'
  import { pb } from '../pocketbase.svelte'
  import { querystring } from 'svelte-spa-router'
  import type { Container } from '../types'
  import { onMount } from 'svelte'

  let containerDetailDrawer: ContainerDetailsDrawer | undefined = $state(undefined)
  let loading = $state(true)
  let error = $state<string | null>(null)

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

      const container = await pb.collection('containers').getOne<Container>(containerId, {
        expand: 'plants.species, user, photos_via_container',
      })

      if (containerDetailDrawer) {
        await containerDetailDrawer.openContainer(container, true)
      }
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
{/if}

<ContainerDetailsDrawer bind:this={containerDetailDrawer} />

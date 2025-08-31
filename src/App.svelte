<script lang="ts">
  import Toast from './lib/Toast.svelte'
  import { routes } from './lib/router'
  import Router from 'svelte-spa-router'
</script>

<main class="bg-stone-50 dark:bg-stone-800" id="app">
  <Router {routes} />
  <Toast />
</main>

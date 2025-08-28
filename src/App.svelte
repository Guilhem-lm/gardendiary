<script lang="ts">
  import Login from './lib/Login.svelte'
  import { Sprout } from 'lucide-svelte'
</script>

<style>
  .logo {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
</style>

<main>
  <div class="logo">
    <Sprout size={48} color="#4CAF50" />
  </div>
  <h1>Welcome to the garden !</h1>

  <Login />
</main>

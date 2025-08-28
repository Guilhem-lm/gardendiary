<script lang="ts">
  import { LogOut, Sprout } from 'lucide-svelte'
  import { pb, getCurrentUser } from './pocketbase.svelte'
  import Container from './Containers.svelte'

  let email = $state('')
  let password = $state('')

  function login() {
    try {
      pb.collection('users').authWithPassword(email, password)
    } catch (error) {
      console.error(error)
    }
  }

  function logout() {
    pb.authStore.clear()
  }

  let currentUser = $derived.by(getCurrentUser)
</script>

<style>
  .logo {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
</style>

{#if currentUser}
  <div class="flex flex-col h-ful w-full justify-start">
    <!-- Top bar -->
    <div class="flex justify-between gap-2 items-center w-full h-10 px-4">
      <div class="flex items-center gap-2">
        <Sprout size={24} color="#4CAF50" />
      </div>
      <h1 class="text-sm dark:text-stone-100">My containers</h1>
      <button type="button" onclick={logout} class="text-sm">
        <LogOut size={16} />
      </button>
    </div>
    <Container />
  </div>
{:else}
  <div class="flex flex-col h-full w-full justify-center items-center">
    <div class="logo">
      <Sprout size={48} color="#4CAF50" />
    </div>
    <div class="flex flex-col gap-4">
      <form onsubmit={(e) => e.preventDefault()} class="flex flex-col gap-4">
        <input type="text" name="email" placeholder="Email" bind:value={email} />
        <input type="password" name="password" placeholder="Password" bind:value={password} />
        <button type="submit" onclick={login}>Login</button>
      </form>
    </div>
  </div>
{/if}

<script lang="ts">
  import { pb, getCurrentUser } from './pocketbase.svelte'

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

{#if currentUser}
  <p>Logged in as {currentUser.name}</p>
  <button type="button" onclick={logout}>Logout</button>
{:else}
  <form onsubmit={(e) => e.preventDefault()} class="flex flex-col gap-4">
    <input type="text" name="email" placeholder="Email" bind:value={email} />
    <input type="password" name="password" placeholder="Password" bind:value={password} />
    <button type="submit" onclick={login}>Login</button>
  </form>
{/if}

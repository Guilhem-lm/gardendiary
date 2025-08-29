<script lang="ts">
  import { Sprout } from 'lucide-svelte'
  import { pb, getCurrentUser } from './pocketbase.svelte'
  import Container from './Containers.svelte'
  import Species from './Species.svelte'
  import Navigation from './Navigation.svelte'
  import { toast } from './toast'

  let currentView = $state<'containers' | 'species'>('containers')

  let email = $state('')
  let password = $state('')
  let loading = $state(false)

  async function login() {
    if (!email || !password) {
      toast('Please enter your email and password', { type: 'error' })
      return
    }

    loading = true
    try {
      await pb.collection('users').authWithPassword(email, password)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid email or password'
      toast(message, { type: 'error' })
    } finally {
      loading = false
    }
  }

  function logout() {
    pb.authStore.clear()
    toast('Logged out successfully', { type: 'info' })
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
  <div class="flex min-h-screen h-screen bg-stone-50 dark:bg-stone-800">
    <Navigation bind:currentView />

    <!-- Main content -->
    <main class="flex-1 h-full overflow-hidden">
      <div class="h-full">
        {#if currentView === 'containers'}
          <Container />
        {:else if currentView === 'species'}
          <Species />
        {/if}
      </div>
    </main>
  </div>
{:else}
  <div class="flex flex-col min-h-screen justify-center items-center">
    <div class="logo">
      <Sprout size={48} class="text-lime-700" />
    </div>
    <div class="flex flex-col gap-4">
      <form onsubmit={(e) => e.preventDefault()} class="flex flex-col gap-4">
        <input
          type="text"
          name="email"
          placeholder="Email"
          bind:value={email}
          class="px-3 py-2 border rounded-md dark:bg-stone-700 focus:border-lime-700 focus:ring-1 focus:ring-lime-700"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          bind:value={password}
          class="px-3 py-2 border rounded-md dark:bg-stone-700 focus:border-lime-700 focus:ring-1 focus:ring-lime-700"
        />
        <button
          type="submit"
          onclick={login}
          disabled={loading}
          class="bg-lime-700 hover:bg-lime-800 text-white rounded-md py-2 px-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  </div>
{/if}

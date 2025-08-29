<!-- Navigation.svelte -->
<script lang="ts">
  import { Sprout, Leaf, LogOut } from 'lucide-svelte'
  import { pb } from './pocketbase.svelte'

  export let currentView: 'containers' | 'species' = 'containers'

  function logout() {
    pb.authStore.clear()
  }
</script>

<!-- Mobile bottom navigation -->
<nav
  class="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 md:hidden"
>
  <div class="flex justify-around items-center h-16">
    <button
      class="flex flex-col items-center justify-center flex-1 h-full {currentView === 'containers'
        ? 'text-lime-700'
        : 'text-stone-600 dark:text-stone-400'}"
      onclick={() => (currentView = 'containers')}
    >
      <Sprout size={20} />
      <span class="text-xs mt-1">Containers</span>
    </button>
    <button
      class="flex flex-col items-center justify-center flex-1 h-full {currentView === 'species'
        ? 'text-lime-700'
        : 'text-stone-600 dark:text-stone-400'}"
      onclick={() => (currentView = 'species')}
    >
      <Leaf size={20} />
      <span class="text-xs mt-1">Species</span>
    </button>
  </div>
</nav>

<!-- Desktop side navigation -->
<nav
  class="hidden md:flex flex-col w-48 bg-white dark:bg-stone-800 border-r border-stone-200 dark:border-stone-700 h-full"
>
  <div class="p-4 flex items-center gap-2">
    <Sprout size={24} class="text-lime-700" />
    <h1 class="font-semibold">Garden Diary</h1>
  </div>

  <div class="flex-1 flex flex-col gap-2 p-2">
    <button
      class="flex items-center gap-2 px-3 py-2 rounded-lg {currentView === 'containers'
        ? 'bg-lime-100 dark:bg-lime-900 text-lime-700'
        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}"
      onclick={() => (currentView = 'containers')}
    >
      <Sprout size={20} />
      <span>Containers</span>
    </button>
    <button
      class="flex items-center gap-2 px-3 py-2 rounded-lg {currentView === 'species'
        ? 'bg-lime-100 dark:bg-lime-900 text-lime-700'
        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}"
      onclick={() => (currentView = 'species')}
    >
      <Leaf size={20} />
      <span>Species</span>
    </button>
  </div>

  <div class="p-2">
    <button
      onclick={logout}
      class="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
    >
      <LogOut size={20} />
      <span>Logout</span>
    </button>
  </div>
</nav>

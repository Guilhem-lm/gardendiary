import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
import { preprocessMeltUI, sequence } from '@melt-ui/pp'

export default {
  preprocess: sequence([
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    vitePreprocess(),
    preprocessMeltUI(),
  ]),
}

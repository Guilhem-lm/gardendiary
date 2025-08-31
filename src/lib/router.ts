import Home from './routes/Home.svelte'
import SpeciesDetailPage from './routes/SpeciesDetailPage.svelte'
import ContainersDetailPage from './routes/ContainersDetailPage.svelte'

export const routes = {
  '/': Home,
  '/species': SpeciesDetailPage,
  '/containers': ContainersDetailPage,
}

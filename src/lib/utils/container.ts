import type { Container } from '../types'

export interface SpeciesCount {
  species: string
  count: number
}

export function getContainerSpecies(container: Container): SpeciesCount[] {
  if (!container.expand?.plants || container.expand.plants.length === 0) {
    return []
  }

  const speciesCount = container.expand.plants.reduce(
    (acc, plant) => {
      const speciesName = plant.expand?.species.name || 'Unknown'
      acc[speciesName] = (acc[speciesName] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return Object.entries(speciesCount).map(([species, count]) => ({
    species,
    count,
  }))
}

export function formatSpeciesCount(container: Container): string {
  const species = getContainerSpecies(container)
  if (species.length === 0) {
    return '0 plants'
  }
  return species.map(({ species, count }) => `${count} ${species}`).join(', ')
}

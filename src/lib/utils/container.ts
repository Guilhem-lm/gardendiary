import type { Container } from '../types'

export interface PlantWithQuantity {
  id: string
  species: string
  quantity: number
}

export function getContainerPlants(container: Container): PlantWithQuantity[] {
  if (!container.expand?.plants) {
    return []
  }

  return container.expand.plants.map((plant) => ({
    id: plant.id,
    species: plant.expand?.species.name || 'Unknown',
    quantity: plant.quantity || 1,
  }))
}

export function getTotalPlantsCount(container: Container): number {
  return getContainerPlants(container).reduce((total, plant) => total + plant.quantity, 0)
}

export function formatPlantsCount(container: Container): string {
  const totalPlants = getTotalPlantsCount(container)
  return totalPlants === 0 ? 'No plants' : `${totalPlants} plants`
}

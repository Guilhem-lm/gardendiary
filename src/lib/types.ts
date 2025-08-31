import type { RecordModel } from 'pocketbase'

export interface Species extends RecordModel {
  id: string
  name: string
  description?: string
  days_to_harvest?: number
  spacing?: number
  sowing?: string[]
  transplanting?: string[]
  direct_sowing?: boolean
  tag?: string
  expand?: {
    photos_via_species: any
  }
}

export interface Plant extends RecordModel {
  id: string
  species: string
  quantity: number
  sown_at?: string
  expand?: {
    species: Species
    containers_via_plants: Container
  }
}

export interface Container extends RecordModel {
  name: string
  location: string
  size: string
  plants?: string[]
  last_watered?: string
  expand?: {
    plants: Plant[]
    user: any
    photos_via_container: any
  }
}

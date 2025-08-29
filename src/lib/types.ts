import type { RecordModel } from 'pocketbase'

export interface Species {
  id: string
  name: string
}

export interface Plant {
  id: string
  species: string
  expand?: {
    species: Species
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
  }
}

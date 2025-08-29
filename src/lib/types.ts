import type { RecordModel } from 'pocketbase'

export interface Species extends RecordModel {
  id: string
  name: string
  description?: string
}

export interface Plant {
  id: string
  species: string
  quantity: number
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

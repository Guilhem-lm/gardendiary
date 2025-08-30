import type { RecordModel } from 'pocketbase'

export interface Photo extends RecordModel {
  id: string
  taken_at: string
  file: string
  created_by: string
  container?: string
  species?: string
}

export function getMostRecentPhoto(photos: Photo[]): Photo {
  return photos.reduce((mostRecent, current) => {
    const mostRecentDate = new Date(mostRecent.taken_at).getTime()
    const currentDate = new Date(current.taken_at).getTime()

    return currentDate > mostRecentDate ? current : mostRecent
  })
}

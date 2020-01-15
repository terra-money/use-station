export interface API<T = undefined> {
  loading: boolean
  error?: Error
  data?: T
  execute?: () => void
}

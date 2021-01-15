import axios from 'axios'

const instance = axios.create()

export const intercept = ({ height }: { height: string }) => {
  instance.interceptors.request.use((config) => {
    const BLOCK_HEIGHT = 'block-height'
    const prev = config.headers[BLOCK_HEIGHT]

    // Use current value when possible or use previous value
    const next =
      prev || height
        ? Math.max(Number(prev) || 0, Number(height) || 0)
        : undefined

    return { ...config, headers: { ...config.headers, [BLOCK_HEIGHT]: next } }
  })
}

export default instance

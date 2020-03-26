import { useState, useEffect } from 'react'
import { ChainOptions, ChainConfig } from '../types'
import fcd from '../api/fcd'

export default (initial: ChainOptions): ChainConfig => {
  const [current, setCurrent] = useState<ChainOptions>(initial)

  const set = (options: ChainOptions) => {
    const baseURL = getURL(options)
    fcd.defaults.baseURL = baseURL
    setCurrent(options)
  }

  useEffect(() => {
    set(initial)
  }, [initial])

  return { current, set }
}

/* helpers */
const getURL = (options: ChainOptions) => {
  const { hostname, secure, port } = options
  const protocol = secure ? 'https' : 'http'
  return `${protocol}://${hostname}${port ? `:${port}` : ''}`
}

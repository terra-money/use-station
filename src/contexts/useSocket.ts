import { useState, useEffect } from 'react'
import socketCluster from 'socketcluster-client'
import numeral from 'numeral'
import { Socket, ChainOptions } from '../types'
import { intercept } from '../api/fcd'
import useFinder from '../hooks/useFinder'
import { useConfig } from './ConfigContext'

export default (): Socket => {
  const getLink = useFinder()
  const { chain } = useConfig()
  const { current } = chain

  const [height, setHeight] = useState<string>()
  const [status, setStatus] = useState<string>()

  /* socket */
  const socket = getSocket(current)

  useEffect(() => {
    const channel = {
      height: socket?.subscribe('latestBlockHeight'),
      status: socket?.subscribe('stationStatus'),
    }

    channel.height?.watch(setHeight)
    channel.status?.watch(setStatus)

    return () => {
      channel.height?.unsubscribe()
      channel.status?.unsubscribe()
    }

    // eslint-disable-next-line
  }, [current])

  /* block */
  const block = height
    ? {
        formatted: `#${numeral(height).format()}`,
        link: getLink!({ q: 'blocks', v: height! }),
      }
    : undefined

  /* intercept request on height change */
  useEffect(() => {
    height && intercept({ height })
  }, [height])

  return { block, status }
}

const getSocket = (options: ChainOptions) => {
  const { ws } = options
  const { hostname, port, protocol } = new URL(ws)
  const secure = protocol === 'wss:'
  const option = {
    hostname,
    port: !port && secure ? 443 : Number(port),
    secure,
  }

  const socket = socketCluster.create(option)
  socket.on('error', () => {}) // Do not report
  return socket
}

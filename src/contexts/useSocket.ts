import { useState, useEffect } from 'react'
import socketCluster, { SCClientSocket } from 'socketcluster-client'
import numeral from 'numeral'
import { Socket } from '../types'
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
      status: socket?.subscribe('stationStatus')
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
        link: getLink!({ q: 'blocks', v: height! })
      }
    : undefined

  return { block, status }
}

const getSocket = (options: SCClientSocket.ClientOptions) => {
  const socket = socketCluster.create(options)
  socket.on('error', () => {}) // Do not report
  return socket
}

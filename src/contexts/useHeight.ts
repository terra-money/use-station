import { useState, useEffect } from 'react'
import numeral from 'numeral'
import debounce from 'lodash/fp/debounce'
import { HeightData } from '../types'
import { intercept } from '../api/fcd'
import useFinder from '../hooks/useFinder'
import fcd from '../api/fcd'

type BlockData = {
  block: {
    header: {
      chain_id: string
      height: string
    }
  }
}

async function getLatestBlock() {
  const { data: latest } = await fcd.get<BlockData>('/blocks/latest')
  return latest
}

export default (): HeightData | undefined => {
  const getLink = useFinder()
  const [height, setHeight] = useState<string>()

  const updateBlockHeight = debounce(1000)(() => {
    getLatestBlock().then((data) => {
      setHeight(data.block.header.height)
    })
  })

  useEffect(() => {
    // initial call
    updateBlockHeight()

    // intercept request on height change
    intercept(updateBlockHeight)

    const intervalId = setInterval(() => {
      updateBlockHeight()
    }, 3000)

    return () => {
      clearInterval(intervalId)
    }
     // eslint-disable-next-line
  }, [])

  /* block */
  const block = height
    ? {
        formatted: `#${numeral(height).format()}`,
        link: getLink!({ q: 'blocks', v: height! }),
      }
    : undefined

  return block;
}

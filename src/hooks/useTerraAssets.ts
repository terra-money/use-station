import axios from 'axios'
import { useEffect, useState } from 'react'

const config = { baseURL: 'https://assets.terra.money' }

const useTerraAssets = <T = any>(path: string) => {
  const [data, setData] = useState<T>()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await axios.get(path, config)
      setData(data)
    }

    fetch()
  }, [path])

  return { data }
}

export default useTerraAssets

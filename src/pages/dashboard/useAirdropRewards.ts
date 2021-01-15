import { ApolloClient, gql, InMemoryCache } from '@apollo/client'
import { Mirror } from '@mirror-protocol/mirror.js'
import { LCDClient } from '@terra-money/terra.js'
import axios from 'axios'
import BigNumber from 'bignumber.js'
import { addMilliseconds, differenceInMilliseconds } from 'date-fns'
import { useEffect, useState } from 'react'

interface APRbyDate {
  date: Date
  apr: number
}

/* constants */
const MIR_AT_SNAPSHOT = '9150000000000'
const SNAPSHOT_HEIGHT = 680000
const SNAPSHOT_DIST_AT = 820000
const DIST_STARTED_AT = 920000
const MIR_EVERY_100K = '345283000000'
const DIST_INTERVAL = 100000
const MILLISECONDS_IN_YEAR = 365 * 24 * 3600 * 1000

/* Mantle */
const client = new ApolloClient({
  uri: 'https://mantle.terra.dev',
  cache: new InMemoryCache(),
})

const LAST_SYNCED_HEIGHT = gql`
  query {
    LastSyncedHeight
  }
`

/* LCD */
const chainID = 'columbus-4'
const URL = 'https://lcd.terra.dev'
const lcd = new LCDClient({ chainID, URL })
const mirror = new Mirror({ lcd })

const useAirdropRewards = () => {
  const [data, setData] = useState<APRbyDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    const getLastHeight = async () => {
      const { data } = await client.query<{ LastSyncedHeight: number }>({
        query: LAST_SYNCED_HEIGHT,
      })

      return data.LastSyncedHeight
    }

    const getHeightArray = async () => {
      const currentHeight = await getLastHeight()
      const length = Math.ceil(
        (currentHeight - DIST_STARTED_AT) / DIST_INTERVAL
      )

      const array = Array.from(
        { length },
        (_, i) => DIST_STARTED_AT + i * DIST_INTERVAL
      )

      return [SNAPSHOT_HEIGHT, ...array]
    }

    const getData = async () => {
      setLoading(true)

      try {
        const blocks = await getHeightArray()
        const baseURL = 'https://fcd.terra.dev'
        const responsesStakingPool = await Promise.all(
          blocks.map((height) =>
            axios.get<{ result: { bonded_tokens: string } }>('/staking/pool', {
              baseURL,
              params: { height },
            })
          )
        )

        const responsesBlocks = await Promise.all(
          blocks.map((height) =>
            axios.get<{ block: { header: { time: string } } }>(
              `/blocks/${height}`,
              { baseURL }
            )
          )
        )

        const { data: genesisBlock } = await axios.get<{
          block: { header: { time: string } }
        }>(`/blocks/${SNAPSHOT_DIST_AT}`, { baseURL })

        const genesisDate = new Date(genesisBlock?.block.header.time)

        const bondedByDate = blocks.reduce<{ bonded: string; date: Date }[]>(
          (acc, height, index) => [
            ...acc,
            {
              height,
              bonded: responsesStakingPool[index].data.result.bonded_tokens,
              date: new Date(responsesBlocks[index].data.block.header.time),
            },
          ],
          []
        )

        const length = bondedByDate.length

        const { date: lastDate } = bondedByDate[length - 1]
        const { date: prevLastDate } = bondedByDate[length - 2]

        const blockInterval = getBlockInterval({
          from: prevLastDate,
          to: lastDate,
        })

        const nextDistDate = addMilliseconds(
          lastDate,
          blockInterval * DIST_INTERVAL
        )

        const priceMIR = await querySymbolPrice('MIR')
        const priceLuna = await queryLunaPrice()

        const data = bondedByDate.reduce<APRbyDate[]>(
          (acc, { bonded, ...rest }, index) => {
            const date = !index ? genesisDate : rest.date

            const apr = calcAPR(
              {
                bonded,
                priceMIR,
                priceLuna,
                distributedMIR: !index ? MIR_AT_SNAPSHOT : MIR_EVERY_100K,
              },
              {
                from: date,
                to:
                  index + 1 < length
                    ? bondedByDate[index + 1].date
                    : nextDistDate,
              }
            )

            return [...acc, { date, apr }]
          },
          []
        )

        setData(data)
      } catch (error) {
        setError(error)
      }

      setLoading(false)
    }

    getData()
  }, [])

  return { data, loading, error }
}

export default useAirdropRewards

/* helpers */
interface Params {
  distributedMIR: string
  bonded: string
  priceMIR: BigNumber.Value
  priceLuna: BigNumber.Value
}

const getLunaExchangedReturn = (params: Params) => {
  const { bonded, priceMIR, priceLuna, distributedMIR } = params
  const returnMIR = new BigNumber(distributedMIR).div(bonded)
  const price = new BigNumber(priceMIR).div(priceLuna)
  return returnMIR.times(price).toString()
}

interface Range {
  from: Date
  to: Date
}

const getBlockInterval = ({ from, to }: Range, blocks = DIST_INTERVAL) =>
  differenceInMilliseconds(to, from) / blocks

const calcAPR = (params: Params, { from, to }: Range) => {
  const timeDiff = differenceInMilliseconds(to, from)
  const a = getLunaExchangedReturn(params)
  const b = MILLISECONDS_IN_YEAR / timeDiff
  return new BigNumber(a).times(b).toNumber()
}

/* utils */
const querySymbolPrice = async (symbol: string) => {
  const asset = mirror.assets[symbol]
  const { assets } = await asset.pair.getPool()
  const [{ amount: uusdAmount }, { amount: assetAmount }] = assets
  const price = new BigNumber(uusdAmount).div(assetAmount)
  return price.toNumber()
}

export const queryLunaPrice = async () => {
  const exchangeRate = await lcd.oracle.exchangeRate('uusd')
  return exchangeRate?.toDecCoin().amount.toNumber() ?? '0'
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PricePage, PriceUI, PriceData, Price, Point } from '../../types'
import { format, percent } from '../../utils'
import useFCD from '../../api/useFCD'
import usePoll, { MINUTE, HOUR, DAY } from './usePoll'

const intervals = [
  { interval: MINUTE * 1, label: '1m' },
  { interval: MINUTE * 5, label: '5m' },
  { interval: MINUTE * 15, label: '15m' },
  { interval: MINUTE * 30, label: '30m' },
  { interval: HOUR * 1, label: '1h' },
  { interval: DAY * 1, label: '1d' }
]

export default (actives: string[]): PricePage => {
  const { t } = useTranslation()

  /* filter */
  const [denom, setDenom] = useState('ukrw')
  const [intervalIndex, setIntervalIndex] = useState(2) // intervals[2] === 15m
  const { label } = intervals[intervalIndex]

  const filter = {
    denom: {
      value: denom,
      set: setDenom,
      options: actives.map(denom => ({
        value: denom,
        children: format.denom(denom)
      }))
    },
    interval: {
      value: String(intervalIndex),
      set: (value: string) => setIntervalIndex(Number(value)),
      options: intervals.map(({ label }, index) => ({
        value: String(index),
        children: t('Page:Market:' + label)
      }))
    }
  }

  /* api */
  const url = '/v1/market/price'
  const params = { denom, interval: label }
  const response = useFCD<PriceData>({ url, params }, false)

  /* polling */
  const { interval } = intervals[Number(filter.interval.value)]
  usePoll(response.execute, interval)

  /* render */
  const render = (data: PriceData): PriceUI => {
    const { lastPrice: price = 0, prices = [], ...rest } = data

    return {
      price,
      variation: {
        amount: format.decimalN(rest.oneDayVariation),
        value: format.decimal(rest.oneDayVariation),
        percent: percent(rest.oneDayVariationRate)
      },
      chart: prices.length
        ? { data: prices.map(getPoint) }
        : { message: t('Page:Market:Chart is not available') }
    }
  }

  return Object.assign(
    { title: t('Page:Market:Luna price'), filter },
    response,
    response.data && { ui: render(response.data) }
  )
}

/* helper */
const getPoint = ({ datetime, price }: Partial<Price>): Point => ({
  t: datetime ? new Date(datetime) : new Date(),
  y: format.decimalN(String(price))
})

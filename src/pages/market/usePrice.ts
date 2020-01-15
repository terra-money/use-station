import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PricePage, PriceUI, PriceData, Price, Point } from '../../types'
import { format, percent } from '../../utils'
import useFCD from '../../api/useFCD'

const intervals = ['1m', '5m', '15m', '30m', '1h', '1d']
export default (actives: string[]): PricePage => {
  const { t } = useTranslation()

  /* filter */
  const [denom, setDenom] = useState('ukrw')
  const [interval, setInterval] = useState('15m')

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
      value: interval,
      set: setInterval,
      options: intervals.map(interval => ({
        value: interval,
        children: t('Page:Market:' + interval)
      }))
    }
  }

  /* api */
  const url = '/v1/market/price'
  const params = { denom, interval }
  const response = useFCD<PriceData>({ url, params })

  /* render */
  const render = (data: PriceData): PriceUI => {
    const { lastPrice: price = 0, prices = [], ...rest } = data

    return {
      price,
      variation: {
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

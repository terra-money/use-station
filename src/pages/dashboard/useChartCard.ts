import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartCard, CumulativeType } from '../../types'
import { format } from '../../utils'
import useFCD from '../../api/useFCD'

export interface Props<T = any> {
  title: string
  desc: string

  /** Endpoint to fetch chart data */
  url: string

  /** Initial configurations of the filter */
  filterConfig?: FilterConfig

  /** One value representing the chart */
  getValue: (results: T[], filter: Filter) => ChartCard['value']

  /** All values ​​to display on the chart */
  getChart: (results: T[], filter: Filter) => ChartCard['chart']
}

interface FilterConfig {
  type?: Config<CumulativeType>
  denom?: Config<string>
  duration?: Config<number>
}

interface Config<T> {
  initial?: T
  list?: T[]
}

interface Filter {
  /** Cumulative | Periodic */
  type?: CumulativeType
  denom?: string
  duration: number
}

export default <T extends { denom?: string }>(props: Props): ChartCard => {
  const { url, filterConfig: config, getValue, getChart, ...rest } = props
  const { t } = useTranslation()

  const CumulativeLabel = {
    [CumulativeType.C]: t('Page:Chart:Cumulative'),
    [CumulativeType.P]: t('Page:Chart:Periodic')
  }

  /* state: filter */
  const [type, setType] = useState(config?.type?.initial ?? CumulativeType.C)
  const [denom, setDenom] = useState(config?.denom?.initial)
  const [duration, setDuration] = useState(config?.duration?.initial ?? 0)

  /* api */
  type Response = T[] | { [key in CumulativeType]: T[] }
  const params = duration > 0 ? { count: duration === 1 ? 3 : duration } : {}
  const { data } = useFCD<Response>({ url, params })
  const results = Array.isArray(data) ? data : data?.[type]

  /* render */
  const renderFilter = () => ({
    type: config?.type
      ? {
          value: type,
          set: setType,
          options: [CumulativeType.C, CumulativeType.P].map(value => ({
            value,
            children: CumulativeLabel[value]
          }))
        }
      : undefined,
    denom:
      config?.denom && results
        ? {
            value: denom!,
            set: setDenom,
            options: results.map(({ denom }) => ({
              value: denom!,
              children: format.denom(denom!)
            }))
          }
        : undefined,
    duration: {
      value: String(duration),
      set: (v: string) => setDuration(Number(v)),
      options: (config?.duration?.list ?? [0, 7, 14, 30]).map(value => ({
        value: String(value),
        children:
          value === 0
            ? t('Page:Chart:From genesis')
            : value === 1
            ? t('Page:Chart:Last day')
            : t('Page:Chart:{{d}} days', { d: value })
      }))
    }
  })

  return Object.assign(
    { ...rest, filter: renderFilter() },
    results && {
      value: getValue(results, { type, denom, duration }),
      chart: getChart(results, { type, denom, duration })
    }
  )
}

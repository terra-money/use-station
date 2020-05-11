import { TFunction } from 'i18next'
import { CumulativeType } from '../../types'
import { percent, toNumber, times, format } from '../../utils'
import { Props } from './useChartCard'

interface Result {
  datetime: number
  dailyReturn: string
  annualizedReturn: string
}

export default (t: TFunction): Props<Result> => ({
  title: t('Page:Chart:Staking return'),
  desc: t(
    'Page:Chart:Annualized staking yield for Luna based on tax rewards, oracle rewards, gas and latest prices of Luna'
  ),
  url: '/v1/dashboard/staking_return',
  filterConfig: { type: { initial: CumulativeType.C } },
  cumulativeLabel: {
    [CumulativeType.C]: t('Page:Chart:Annualized'),
    [CumulativeType.P]: t('Page:Chart:Daily')
  },
  getValue: (results, { type }) => {
    const key = type === CumulativeType.C ? 'annualizedReturn' : 'dailyReturn'
    return [
      percent(results.length ? results[results.length - 1][key] : 0),
      t('Page:Chart:/ year')
    ]
  },
  getChart: (results, { type }) => {
    const key = type === CumulativeType.C ? 'annualizedReturn' : 'dailyReturn'
    return {
      data:
        results?.map(({ datetime, ...rest }) => ({
          t: new Date(datetime),
          y: toNumber(times(rest[key], 100))
        })) ?? [],
      tooltips:
        results?.map(({ datetime, ...rest }) => ({
          title: percent(rest[key]),
          label: format.date(new Date(datetime), { short: true })
        })) ?? []
    }
  }
})

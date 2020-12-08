import { TFunction } from 'i18next'
import { CumulativeType } from '../../types'
import { percent, toNumber, times, format } from '../../utils'
import { Props } from './useChartCard'
import { fix } from './datetime'

interface Result {
  datetime: number
  dailyReturn: string
  annualizedReturn: string
}

export default (t: TFunction): Props<Result> => ({
  title: t('Page:Chart:Staking return'),
  desc: t(
    'Page:Chart:Annualized staking yield for Luna based on tax rewards, oracle rewards, gas and latest prices of Luna (annualize return = 7 days moving average return * 365)'
  ),
  url: '/v1/dashboard/staking_return',
  filterConfig: { type: { initial: CumulativeType.C } },
  cumulativeLabel: {
    [CumulativeType.C]: t('Page:Chart:Annualized'),
    [CumulativeType.P]: t('Page:Chart:Daily')
  },
  getValue: (results, { type }) => {
    const isAnnualized = type === CumulativeType.C
    const key = isAnnualized ? 'annualizedReturn' : 'dailyReturn'
    const unit = isAnnualized ? t('Page:Chart:/ year') : t('Page:Chart:/ day')

    return [
      percent(results.length ? results[results.length - 1][key] : 0),
      unit
    ]
  },
  getChart: (results, { type }) => {
    const key = type === CumulativeType.C ? 'annualizedReturn' : 'dailyReturn'
    return {
      data:
        results?.map(({ datetime, ...rest }) => ({
          t: fix(datetime),
          y: toNumber(times(rest[key], 100))
        })) ?? [],
      tooltips:
        results?.map(({ datetime, ...rest }) => ({
          title: percent(rest[key]),
          label: format.date(fix(datetime), { short: true })
        })) ?? []
    }
  }
})

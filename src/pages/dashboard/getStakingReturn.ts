import { TFunction } from 'i18next'
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
  getValue: results => [
    percent(results.length ? results[results.length - 1].annualizedReturn : 0),
    t('Page:Chart:/ year')
  ],
  getChart: results => ({
    data:
      results?.map(({ datetime, annualizedReturn }) => ({
        t: new Date(datetime),
        y: toNumber(times(annualizedReturn, 100))
      })) ?? [],
    tooltips:
      results?.map(({ datetime, annualizedReturn }) => ({
        title: percent(annualizedReturn),
        label: format.date(new Date(datetime), { short: true })
      })) ?? []
  })
})

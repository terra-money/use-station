import { TFunction } from 'i18next'
import { CumulativeType } from '../../types'
import { format, sum, minus } from '../../utils'
import { Props } from './useChartCard'

interface Result {
  datetime: number
  totalAccountCount: number
  activeAccountCount: number
}

export default (t: TFunction): Props<Result> => ({
  title: t('Page:Chart:Total accounts'),
  desc: t(
    'Page:Chart:Number of total accounts with more than 1 non-trivial transaction in the selected period'
  ),
  url: '/v1/dashboard/account_growth',
  filterConfig: { type: { initial: CumulativeType.C } },
  getValue: (results, { type }) => {
    const { totalAccountCount: head } = results[0]
    const { totalAccountCount: tail } = results[results.length - 1]
    const value =
      type === CumulativeType.C
        ? minus(tail, head)
        : sum(results.slice(1).map(d => d.totalAccountCount))

    return { value: format.decimal(value, 0), unit: 'Accounts' }
  },
  getChart: results => ({
    data:
      results?.map(({ datetime, totalAccountCount }) => ({
        t: new Date(datetime),
        y: totalAccountCount
      })) ?? [],
    tooltips:
      results?.map(({ datetime, totalAccountCount }) => ({
        title: format.decimal(String(totalAccountCount), 0),
        label: format.date(new Date(datetime), { short: true })
      })) ?? []
  })
})

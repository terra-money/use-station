import { TFunction } from 'i18next'
import { CumulativeType, AccountType } from '../../types'
import { format, sum, minus } from '../../utils'
import { Props } from './useChartCard'

interface Result {
  datetime: number
  value: number
}

const unit = 'Accounts'

export default (t: TFunction): Props<Result> => ({
  title: t('Page:Chart:Total accounts'),
  desc: t(
    'Page:Chart:Number of total registered accounts in the selected period'
  ),
  url: ({ account }) =>
    ({
      [AccountType.A]: '/v1/dashboard/active_accounts',
      [AccountType.T]: '/v1/dashboard/registered_accounts'
    }[account!]),
  filterConfig: {
    type: { initial: CumulativeType.C },
    account: { initial: AccountType.T }
  },
  getValue: (results, { type }) => {
    const { value: head } = results.length ? results[0] : { value: '0' }
    const { value: tail } =
      results.length > 1 ? results[results.length - 1] : { value: head }

    const v =
      type === CumulativeType.C
        ? minus(tail, head)
        : sum(results.slice(1).map(d => d.value))

    return { value: format.decimal(v, 0), unit }
  },
  getChart: results => ({
    data:
      results?.map(({ datetime, value }) => ({
        t: new Date(datetime),
        y: value
      })) ?? [],
    tooltips:
      results?.map(({ datetime, value }) => ({
        title: format.decimal(String(value), 0),
        label: format.date(new Date(datetime), { short: true })
      })) ?? []
  })
})

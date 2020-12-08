import { TFunction } from 'i18next'
import { CumulativeType, AccountType } from '../../types'
import { format } from '../../utils'
import { Props } from './useChartCard'
import { fix } from './datetime'

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
  getValue: (_, __, total) => ({ value: format.decimal(total, 0), unit }),
  getChart: results => ({
    data:
      results?.map(({ datetime, value }) => ({
        t: fix(datetime),
        y: value
      })) ?? [],
    tooltips:
      results?.map(({ datetime, value }) => ({
        title: format.decimal(String(value), 0),
        label: format.date(fix(datetime), { short: true })
      })) ?? []
  })
})

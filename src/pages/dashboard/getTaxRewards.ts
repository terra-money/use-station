import { TFunction } from 'i18next'
import { CumulativeType } from '../../types'
import { format, sum, minus } from '../../utils'
import { Props } from './useChartCard'

interface Result {
  datetime: number
  blockReward: string
}

const denom = 'ukrw'
export default (t: TFunction): Props<Result> => ({
  title: t('Page:Chart:Tax rewards'),
  desc: t('Page:Chart:Tax rewards distributed over the selected time period.'),
  url: '/v1/dashboard/block_rewards',
  filterConfig: { type: { initial: CumulativeType.C } },
  getValue: (results, { type }) => {
    const { blockReward: head } = results[0]
    const { blockReward: tail } = results[results.length - 1]

    return format.display({
      amount:
        type === CumulativeType.C
          ? minus(tail, head)
          : sum(results.slice(1).map(d => d.blockReward)),
      denom
    })
  },
  getChart: results => ({
    data:
      results?.map(({ datetime, blockReward }) => ({
        t: new Date(datetime),
        y: format.amountN(blockReward)
      })) ?? [],
    tooltips:
      results?.map(({ datetime, blockReward }) => ({
        title: format.coin({ amount: blockReward, denom }, { integer: true }),
        label: format.date(new Date(datetime), { short: true })
      })) ?? []
  })
})

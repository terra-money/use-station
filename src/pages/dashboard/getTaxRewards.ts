import { TFunction } from 'i18next'
import { CumulativeType, Currency } from '../../types'
import { format, sum, minus, times } from '../../utils'
import { Props } from './useChartCard'

interface Result {
  datetime: number
  blockReward: string
}

export default (
  t: TFunction,
  { key: denom, krwRate }: Currency
): Props<Result> => {
  const exchange = (n: string): string => times(n, krwRate)

  return {
    title: t('Page:Chart:Tax rewards'),
    desc: t('Page:Chart:Tax rewards distributed over the selected time period'),
    url: '/v1/dashboard/block_rewards',
    filterConfig: { type: { initial: CumulativeType.C } },
    getValue: (results, { type }) => {
      const { blockReward: head } = results.length
        ? results[0]
        : { blockReward: '0' }
      const { blockReward: tail } =
        results.length > 1 ? results[results.length - 1] : { blockReward: head }
      const amount = exchange(
        type === CumulativeType.C
          ? minus(tail, head)
          : sum(results.slice(1).map((d) => d.blockReward))
      )

      return format.display({ amount, denom })
    },
    getChart: (results) => ({
      data:
        results?.map(({ datetime, blockReward }) => ({
          t: new Date(datetime),
          y: format.amountN(exchange(blockReward)),
        })) ?? [],
      tooltips:
        results?.map(({ datetime, blockReward }) => ({
          title: format.coin(
            { amount: exchange(blockReward), denom },
            { integer: true }
          ),
          label: new Date(datetime).toUTCString(),
        })) ?? [],
    }),
  }
}

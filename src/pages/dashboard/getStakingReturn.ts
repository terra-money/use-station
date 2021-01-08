import { TFunction } from 'i18next'
import { CumulativeType, StakingReturnResult } from '../../types'
import { percent, toNumber, times } from '../../utils'
import { Props } from './useChartCard'

export default (
  t: TFunction,
  modifyData: (points: StakingReturnResult[]) => StakingReturnResult[],
  loading: boolean
): Props<StakingReturnResult> => ({
  title: t('Page:Chart:Staking return'),
  desc: t(
    'Page:Chart:Annualized staking yield for Luna based on tax rewards, oracle rewards, gas, MIR airdrop rewards and latest prices of Luna (annualize return = 7 days moving average return * 365)'
  ),
  url: '/v1/dashboard/staking_return',
  filterConfig: { type: { initial: CumulativeType.C } },
  cumulativeLabel: {
    [CumulativeType.C]: t('Page:Chart:Annualized'),
    [CumulativeType.P]: t('Page:Chart:Daily')
  },
  getValue: (data, { type }) => {
    const results = loading ? [] : modifyData(data)
    const isAnnualized = type === CumulativeType.C
    const key = isAnnualized ? 'annualizedReturn' : 'dailyReturn'
    const unit = isAnnualized ? t('Page:Chart:/ year') : t('Page:Chart:/ day')

    return [
      percent(results.length ? results[results.length - 1][key] : 0),
      unit
    ]
  },
  getChart: (data, { type }) => {
    const results = loading ? [] : modifyData(data)
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
          label: new Date(datetime).toUTCString()
        })) ?? []
    }
  }
})

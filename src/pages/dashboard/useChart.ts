import { useTranslation } from 'react-i18next'
import { reverse } from 'ramda'
import { isBefore } from 'date-fns'
import { ChartCard, ChartKey, StakingReturnResult } from '../../types'
import { useConfig } from '../../contexts/ConfigContext'
import { plus } from '../../utils'
import useChartCard from './useChartCard'
import getTxVolume from './getTxVolume'
import getStakingReturn from './getStakingReturn'
import getTaxRewards from './getTaxRewards'
import getTotalAccounts from './getTotalAccounts'
import useAirdropRewards from './useAirdropRewards'

export default (key: ChartKey): ChartCard => {
  const { t } = useTranslation()
  const { currency } = useConfig()

  /* Add MIR airdrop to the staking return */
  const additionalInfo = useAirdropRewards()
  const addAirdropRewards = (results: StakingReturnResult[]) => {
    const { data } = additionalInfo
    return results.map((result: StakingReturnResult) => {
      const { datetime, annualizedReturn } = result

      const apr = String(
        reverse(data).find(({ date }) => isBefore(date, new Date(datetime)))
          ?.apr ?? 0
      )

      return { ...result, annualizedReturn: plus(annualizedReturn, apr) }
    })
  }

  const props = {
    TxVolume: getTxVolume(t),
    StakingReturn: getStakingReturn(
      t,
      addAirdropRewards,
      additionalInfo.loading
    ),
    TaxRewards: getTaxRewards(t, currency.current!),
    TotalAccounts: getTotalAccounts(t)
  }

  const chart = useChartCard(props[key])
  return chart
}

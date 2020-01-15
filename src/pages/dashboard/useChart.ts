import { useTranslation } from 'react-i18next'
import { ChartCard, ChartKey } from '../../types'
import useChartCard from './useChartCard'
import getTxVolume from './getTxVolume'
import getStakingReturn from './getStakingReturn'
import getTaxRewards from './getTaxRewards'
import getTotalAccounts from './getTotalAccounts'

export default (key: ChartKey): ChartCard => {
  const { t } = useTranslation()

  const props = {
    TxVolume: getTxVolume(t),
    StakingReturn: getStakingReturn(t),
    TaxRewards: getTaxRewards(t),
    TotalAccounts: getTotalAccounts(t)
  }

  const chart = useChartCard(props[key])
  return chart
}

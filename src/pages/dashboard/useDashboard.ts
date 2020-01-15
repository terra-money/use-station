import { useTranslation } from 'react-i18next'
import { Dictionary } from 'ramda'
import { DashboardPage, DashboardData, DashboardUI } from '../../types'
import { DisplaySelector, TaxCap } from '../../types'
import { format } from '../../utils'
import { percent, toNumber } from '../../utils/math'
import useFCD from '../../api/useFCD'

export default (): DashboardPage => {
  const { t } = useTranslation()
  const response = useFCD<DashboardData>({ url: '/v1/dashboard' })

  const render = (dashboard: DashboardData): DashboardUI => {
    const { prices, taxRate, taxCaps } = dashboard
    const { issuances, communityPool, stakingPool } = dashboard
    const price = prices['ukrw']

    return {
      prices: {
        title: t('Page:Market:Luna price'),
        display: {
          value: format.decimal(price ?? 0),
          unit: format.denom('ukrw')
        }
      },
      taxRate: {
        title: t('Page:Dashboard:Tax rate'),
        content: percent(taxRate, 3),
        desc: t('Page:Dashboard:Capped at {{cappedAt}}', {
          cappedAt: taxCaps.map(formatTaxCap).join(' / ')
        })
      },
      issuance: getSelector(t('Page:Dashboard:Issuance'), issuances),
      communityPool: getSelector(
        t('Page:Dashboard:Community pool'),
        communityPool
      ),
      stakingRatio: {
        title: t('Page:Dashboard:Staking ratio'),
        content: percent(stakingPool.stakingRatio),
        small: t('Page:Dashboard:{{staked}} staked', {
          staked: format.coin(
            { amount: stakingPool.bondedTokens, denom: 'uluna' },
            { integer: true }
          )
        }),
        desc: t('Page:Dashboard:Staked Luna / Total Luna')
      }
    }
  }

  return Object.assign(
    {},
    response,
    response.data && { ui: render(response.data) }
  )
}

/* helpers */
const formatTaxCap = ({ taxCap, denom }: TaxCap) =>
  [toNumber(format.amount(taxCap)), format.denom(denom)].join(' ')

const getSelector = (
  title: string,
  data: Dictionary<string>
): DisplaySelector => ({
  title,
  defaultOption: 'Luna',
  options: Object.keys(data).map(format.denom),
  displays: Object.entries(data).reduce(
    (acc, [denom, amount]) => ({
      ...acc,
      [format.denom(denom)]: format.display(
        { denom, amount },
        { integer: true }
      )
    }),
    {}
  )
})

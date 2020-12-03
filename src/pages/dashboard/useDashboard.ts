import { useTranslation } from 'react-i18next'
import { Dictionary } from 'ramda'
import { DashboardPage, DashboardData, DashboardUI } from '../../types'
import { DisplaySelector, TaxCap } from '../../types'
import { useConfig } from '../../contexts/ConfigContext'
import { format } from '../../utils'
import { percent } from '../../utils/math'
import useFCD from '../../api/useFCD'

export default (): DashboardPage => {
  const { t } = useTranslation()
  const response = useFCD<DashboardData>({ url: '/v1/dashboard' })

  const { currency } = useConfig()

  const render = (dashboard: DashboardData, denom: string): DashboardUI => {
    const { prices, taxRate, taxCaps } = dashboard
    const { issuances, communityPool, stakingPool } = dashboard
    const price = prices[denom]

    return {
      prices: {
        title: t('Page:Swap:Luna price'),
        display: {
          value: format.decimal(price ?? 0),
          unit: format.denom(denom)
        }
      },
      taxRate: {
        title: t('Page:Dashboard:Tax rate'),
        content: percent(taxRate, 3),
        desc: t('Page:Dashboard:Capped at {{cappedAt}}', {
          cappedAt: taxCaps
            .filter(({ denom }) => denom === 'usdr')
            .map(formatTaxCap)
            .join(' / '),
          interpolation: { escapeValue: false }
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
    response.data &&
      currency.current && { ui: render(response.data, currency.current.key) }
  )
}

/* helpers */
const formatTaxCap = ({ taxCap, denom }: TaxCap) =>
  [format.amountN(taxCap), format.denom(denom)].join(' ')

const getSelector = (
  title: string,
  data: Dictionary<string>
): DisplaySelector => ({
  title,
  select: {
    defaultValue: 'Luna',
    options: Object.keys(data).map(denom => {
      const label = format.denom(denom)
      return { value: label, children: label }
    })
  },
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

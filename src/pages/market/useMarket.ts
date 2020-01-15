import { useTranslation } from 'react-i18next'
import { MarketPage, OracleData } from '../../types'
import useFCD from '../../api/useFCD'

export default (): MarketPage => {
  const { t } = useTranslation()
  const response = useFCD<OracleData>({ url: '/oracle/denoms/actives' })
  const render = (actives: string[]) => ({ actives })

  return Object.assign(
    { swap: t('Page:Market:Swap coins') },
    response,
    response.data?.result && { ui: render(response.data.result) }
  )
}

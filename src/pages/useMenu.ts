import { useTranslation } from 'react-i18next'
import { Dictionary } from 'ramda'

export default (): Dictionary<string> => {
  const { t } = useTranslation()

  return {
    Dashboard: t('Page:Menu:Dashboard'),
    Bank: t('Page:Menu:Bank'),
    Transactions: t('Page:Menu:Transactions'),
    Staking: t('Page:Menu:Staking'),
    Validator: t('Page:Menu:Validator details'),
    Market: t('Page:Menu:Market'),
    Governance: t('Page:Menu:Governance'),
    Proposal: t('Page:Menu:Proposal details'),
    Contracts: t('Page:Menu:Contracts')
  }
}

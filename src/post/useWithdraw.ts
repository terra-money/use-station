import { useTranslation } from 'react-i18next'
import { User, WithdrawProps, PostPage } from '../types'
import useBank from '../api/useBank'
import { isFeeAvailable, getFeeDenomList } from './validateConfirm'

export default (user: User, { from, amounts }: WithdrawProps): PostPage => {
  const { t } = useTranslation()
  const { data: bank, loading, error } = useBank(user)
  const { address: to } = user
  const path = from ? `/${from}` : ''

  return {
    error,
    loading,
    submitted: true,
    confirm: bank && {
      url: `/distribution/delegators/${to}/rewards${path}`,
      contents: [{ name: t('Common:Tx:Amount'), displays: amounts }],
      feeDenom: {
        defaultValue: 'uluna',
        list: getFeeDenomList(bank.balance),
      },
      validate: (fee) => isFeeAvailable(fee, bank.balance),
      submitLabels: [
        t('Post:Staking:Withdraw'),
        t('Post:Staking:Withdrawing...'),
      ],
      message: t('Post:Staking:Withdrew to {{to}}', { to }),
    },
  }
}

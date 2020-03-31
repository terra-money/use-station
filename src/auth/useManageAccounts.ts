import { useTranslation } from 'react-i18next'
import { ManageAccounts } from '../types'

export default (): ManageAccounts => {
  const { t } = useTranslation()

  return {
    title: t('Auth:Manage:Manage accounts'),
    delete: {
      title: t('Auth:Manage:Delete accounts'),
      content: t(
        'Auth:Manage:Are you sure you want to delete this account? You can restore this account with your seed phrase anytime.'
      ),
      button: t('Auth:Manage:Delete'),
      cancel: t('Common:Form:Cancel')
    },
    password: t('Auth:Manage:Change password')
  }
}

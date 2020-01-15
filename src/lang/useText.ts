import { useTranslation } from 'react-i18next'

export default () => {
  const { t } = useTranslation()

  return {
    OOPS: t('Common:Error:Oops! Something went wrong'),
    SIGN_IN: t('Auth:Menu:Sign in'),
    WITH_AUTH: t(
      'Auth:Common:Please sign in with account or ledger to execute'
    ),
    COPY: t('Common:Copy'),
    COPIED: t('Common:Copied')
  }
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bip, ConfirmLedger } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { setBip } from '../../../wallet/ledger'
import { localSettings } from '../../../utils/localStorage'

export default (getAddress: () => Promise<string>): ConfirmLedger => {
  const { t } = useTranslation()
  const auth = useAuth()

  const [idle, setIdle] = useState(true)
  const [error, setError] = useState<Error>()

  const request = async () => {
    try {
      setError(undefined)
      const address = await getAddress()
      auth.signIn({ address, ledger: true })
    } catch (error) {
      setError(error)
    }
  }

  const selectBip = async (bip: Bip) => {
    localSettings.set({ bip })
    setBip(bip)
    setIdle(false)
    await request()
  }

  return {
    buttons: idle
      ? [
          { bip: 330, desc: 'For new user', onClick: () => selectBip(330) },
          { bip: 118, desc: 'For cosmos user', onClick: () => selectBip(118) },
        ]
      : undefined,
    card: {
      title: t('Auth:Menu:Select wallet'),
      content: t('Auth:SignIn:Please plug in your\nLedger Wallet'),
    },
    retry: error
      ? {
          attrs: {
            onClick: request,
            children: t('Common:Form:Retry'),
          },
          message: error.message,
        }
      : undefined,
  }
}

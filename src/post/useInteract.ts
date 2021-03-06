import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BankData, CoinFields } from '../types'
import { PostPage, Coin, User, Field } from '../types'
import { ConfirmProps } from '../types'
import { is, format } from '../utils'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import { getFeeDenomList, isFeeAvailable } from './validateConfirm'
import { useCoinsFields } from './txHooks'

interface Values {
  address: string
  json: string
}

export default (
  address: string,
  user: User,
  denoms: string[]
): PostPage<CoinFields> => {
  const { t } = useTranslation()
  const { data: bank, loading, error } = useBank(user)

  const [submitted, setSubmitted] = useState(false)

  /* form */
  const validate = ({ json }: Values) => ({
    address: '',
    json: !is.json(json)
      ? t('Common:Validate:{{label}} is invalid', { label: 'JSON' })
      : '',
  })
  const initial = { address, json: '' }
  const form = useForm<Values>(initial, validate)
  const { values, invalid, getDefaultProps, getDefaultAttrs } = form

  /* render */
  const coinsFields = useCoinsFields(denoms)

  const fields: Field[] = [
    {
      ...getDefaultProps('address'),
      label: t('Post:Contracts:Contract address'),
      attrs: { ...getDefaultAttrs('address'), readOnly: true },
    },
    {
      ...getDefaultProps('json'),
      element: 'textarea',
      label: t('Post:Contracts:HandleMsg JSON'),
      attrs: getDefaultAttrs('json'),
    },
  ]

  const disabled = invalid || coinsFields.invalid

  const formUI = {
    title: t('Post:Contracts:Interact with'),
    fields,
    disabled,
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true),
  }

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: `/wasm/contracts/${address}`,
    payload: { exec_msg: format.sanitizeJSON(values.json) },
    contents: [],
    feeDenom: { list: getFeeDenomList(bank.balance) },
    validate: (fee: Coin) => isFeeAvailable(fee, bank.balance),
    submitLabels: [
      t('Post:Contracts:Interact'),
      t('Post:Contracts:Interacting...'),
    ],
    message: t(`Post:Contracts:Interacted with {{address}}`, { address }),
    cancel: () => setSubmitted(false),
  })

  return {
    error,
    loading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank),
    ui: coinsFields,
  }
}

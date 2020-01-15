import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PostPage, ConfirmProps, StakingData, BankData } from '../types'
import { Coin, User, Field, FieldElement } from '../types'
import { format } from '../utils'
import { toAmount, toInput } from '../utils/format'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import validateForm from './validateForm'
import { isDelegatable, isFeeAvailable } from './validateConfirm'
import { getFeeDenomList } from './validateConfirm'

interface Values {
  from: string
  input: string
}

interface Props {
  to: string
  undelegate: boolean
}

enum TxType {
  D = 'Delegate',
  R = 'Redelegate',
  U = 'Undelegate'
}

const denom = 'uluna'
export default (user: User, { to, undelegate }: Props): PostPage => {
  const { t } = useTranslation()
  const v = validateForm(t)

  /* ready */
  const { address } = user
  const url = `/v1/staking/${address}`
  const { data: bank, loading, error } = useBank(user)
  const { data: staking, ...stakingResponse } = useFCD<StakingData>({ url })
  const { loading: stakingLoading, error: stakingError } = stakingResponse
  const sources = staking?.myDelegations?.filter(d => d.validatorAddress !== to)

  const findDelegation = (address: string) =>
    staking?.myDelegations?.find(d => d.validatorAddress === address)

  /* max */
  const getMax = (address: string): Coin => {
    const amount =
      findDelegation(address)?.amountDelegated ?? staking?.availableLuna

    return { amount: amount ?? '0', denom }
  }

  /* form */
  const validate = ({ input, from }: Values) => ({
    input: v.input(input, {
      max: toInput(getMax(undelegate ? to : from).amount)
    }),
    from: ''
  })

  const initial = { input: '', from: address }
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<Values>(initial, validate)
  const { values, setValue, invalid, getDefaultProps, getDefaultAttrs } = form
  const { input, from } = values
  const amount = toAmount(input)
  const moniker = findDelegation(undelegate ? to : from)?.validatorName
  const redelegation = from !== address
  const type = redelegation ? TxType.R : undelegate ? TxType.U : TxType.D

  /* render */
  const unit = format.denom(denom)
  const hasSources = !!sources?.length
  const sourceLength = hasSources
    ? sources!.length + 1
    : t('Page:Bank:My wallet')

  const fields: Field[] = [
    !undelegate
      ? {
          ...getDefaultProps('from'),
          label: t('Post:Staking:Source ({{length}})', {
            length: sourceLength
          }),
          element: (hasSources ? 'select' : 'input') as FieldElement,
          attrs: {
            ...getDefaultAttrs('from'),
            readOnly: !hasSources
          },
          options: !hasSources
            ? undefined
            : [
                {
                  value: address,
                  children: `${t('Page:Bank:My wallet')} - ${address}`
                },
                ...sources!.map(({ validatorName, validatorAddress }) => ({
                  value: validatorAddress,
                  children: `${validatorName} - ${validatorAddress}`
                }))
              ]
        }
      : {
          label: t('Post:Staking:Undelegate from'),
          element: 'input' as FieldElement,
          attrs: {
            id: 'to',
            defaultValue: to,
            readOnly: true
          }
        },
    {
      ...getDefaultProps('input'),
      label: t('Common:Tx:Amount'),
      button: {
        label: t('Common:Account:Available'),
        display: format.display(getMax(undelegate ? to : from)),
        attrs: {
          onClick: () =>
            setValue('input', toInput(getMax(undelegate ? to : from).amount))
        }
      },
      attrs: {
        ...getDefaultAttrs('input'),
        placeholder: '0',
        autoFocus: true
      },
      unit
    }
  ].concat(
    !undelegate
      ? {
          label: t('Post:Staking:Delegate to'),
          element: 'input' as FieldElement,
          attrs: {
            id: 'to',
            defaultValue: to,
            readOnly: true
          }
        }
      : []
  )

  const getConfirm = (bank: BankData): ConfirmProps => {
    const coin = format.coin({ amount, denom })
    const display = format.display({ amount, denom })
    const contents = [{ name: t('Common:Tx:Amount'), displays: [display] }]
    const feeDenom = {
      defaultValue: denom,
      list: getFeeDenomList(bank.balance)
    }
    const cancel = () => setSubmitted(false)

    return {
      [TxType.D]: {
        contents,
        feeDenom,
        cancel,
        url: `/staking/delegators/${from}/delegations`,
        payload: {
          delegator_address: from,
          validator_address: to,
          amount: { amount, denom }
        },
        validate: (fee: Coin) =>
          isDelegatable({ amount, denom, fee }, bank.balance),
        submitLabels: [
          t('Post:Staking:Delegate'),
          t('Post:Staking:Delegating...')
        ],
        message: t('Post:Staking:Delegated {{coin}} to {{moniker}}', {
          coin,
          moniker
        })
      },
      [TxType.R]: {
        contents,
        feeDenom,
        cancel,
        url: `/staking/delegators/${from}/redelegations`,
        payload: {
          delegator_address: address,
          validator_src_address: from,
          validator_dst_address: to,
          amount: { amount, denom }
        },
        validate: (fee: Coin) => isFeeAvailable(fee, bank.balance),
        submitLabels: [
          t('Post:Staking:Redelegate'),
          t('Post:Staking:Redelegating...')
        ],
        message: t('Post:Staking:Redelegated {{coin}} to {{moniker}}', {
          coin,
          moniker
        }),
        warning: t(
          'Post:Staking:Redelegation to the same validator will be prohibited for 21 days. Please make sure you input the right amount of luna to delegate.'
        )
      },
      [TxType.U]: {
        contents,
        feeDenom,
        cancel,
        url: `/staking/delegators/${from}/unbonding_delegations`,
        payload: {
          delegator_address: from,
          validator_address: to,
          amount: { amount, denom }
        },
        validate: (fee: Coin) => isFeeAvailable(fee, bank.balance),
        submitLabels: [
          t('Post:Staking:Undelegate'),
          t('Post:Staking:Undelegating...')
        ],
        message: t('Post:Staking:Undelegated {{coin}} from {{moniker}}', {
          coin,
          moniker
        }),
        warning: t(
          'Post:Staking:Undelegation takes 21 days to complete. You would not get rewards in the meantime.'
        )
      }
    }[type]
  }

  const disabled = invalid

  const formUI = {
    fields,
    disabled,
    title: t('Post:Staking:' + type),
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true)
  }

  return {
    error: error || stakingError,
    loading: loading || stakingLoading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank)
  }
}

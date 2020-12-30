import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Dictionary, last } from 'ramda'
import { ethers } from 'ethers'
import { BankData, TxsData, Tx, RecentSentUI, RecentSentItemUI } from '../types'
import { PostPage, Result, Coin, User, Field } from '../types'
import { ConfirmContent, ConfirmProps } from '../types'
import { is, format, find } from '../utils'
import { gt, times, min, ceil, percent, minus } from '../utils/math'
import { toAmount, toInput } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useTokenBalance from '../cw20/useTokenBalance'
import fcd from '../api/fcd'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import validateForm from './validateForm'
import { isAvailable, getFeeDenomList, isFeeAvailable } from './validateConfirm'
import { calc } from './txHelpers'

const SHUTTLE: Dictionary<string> = {
  mainnet: 'terra13yxhrk08qvdf5zdc9ss5mwsg5sf7zva9xrgwgc',
  testnet: 'terra10a29fyas9768pw8mewdrar3kzr07jz8f3n73t3'
}

interface Values {
  to: string
  input: string
  memo: string
}

export default (user: User, denom: string): PostPage<RecentSentUI> => {
  const { t } = useTranslation()
  const { data: bank, loading: bankLoading, error } = useBank(user)
  const tokenBalance = useTokenBalance(user.address)
  const { list: tokens, loading: tokenLoading, whitelist } = tokenBalance
  const loading = bankLoading || tokenLoading
  const { chain } = useConfig()
  const shuttle = SHUTTLE[chain.current.name]
  const v = validateForm(t)

  /* recent txs */
  const url = '/v1/msgs'
  const params = { account: user.address, action: 'send', page: 1 }
  const txsResponse = useFCD<TxsData>({ url, params })
  const renderRecent = ({
    totalCnt,
    txs
  }: TxsData): RecentSentUI | undefined => {
    const recent = !gt(totalCnt, 0) ? undefined : findRecent(txs, denom)

    const renderRecentItem = ({
      date,
      values
    }: RecentSentItem): RecentSentItemUI => {
      const { to, input, memo: $memo } = values
      const toEthereum = shuttle === to
      const recipient = !toEthereum ? to : $memo
      const memo = !toEthereum ? $memo : ''

      return {
        title: date,
        contents: [
          { title: t('Post:Send:Send to'), content: recipient },
          { title: t('Common:Tx:Amount'), content: `${input} ${unit}` },
          { title: t('Common:Tx:Memo'), content: memo }
        ].filter(({ content }) => content),
        onClick: () => form.setValues({ ...values, to: recipient, memo })
      }
    }

    return !recent?.length
      ? undefined
      : {
          title: t('Post:Send:Recent transactions', { unit }),
          contents: recent.map(renderRecentItem)
        }
  }

  /* tax */
  const [tax, setTax] = useState<{ label: string; coin: Coin }>()
  const [taxError, setTaxError] = useState<Error>()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [max, setMax] = useState<Coin>({ denom, amount: '0' })
  const isMainnet = chain.current.name === 'mainnet'

  const calculateMax = async () => {
    if (bank) {
      const amount = find(`${denom}:available`, bank.balance) || '0'

      if (denom === 'uluna') {
        // If luna is the only token available, we have to remove gas fee from luna
        if (bank.balance.length === 1) {
          setMax({
            denom,
            amount: minus(amount, calc.fee(denom, '100000', isMainnet))
          })
        } else {
          setMax({ denom, amount })
        }
      } else if (is.nativeDenom(denom)) {
        const tax = await fetchTax({ amount, denom }, t)
        setMax({ denom, amount: minus(amount, tax.coin.amount) })
      } else {
        const amount =
          tokens?.find(({ token }) => token === denom)?.balance ?? '0'
        setMax({ denom, amount })
      }
    }
  }

  useEffect(() => {
    if (!loading) {
      calculateMax()
    }
    // eslint-disable-next-line
  }, [loading])

  /* form */
  const validate = ({ input, to, memo }: Values) => ({
    to: v.address(to, true),
    input: v.input(input, { max: toInput(max.amount) }),
    memo:
      v.length(memo, { max: 256, label: t('Common:Tx:Memo') }) ||
      v.includes(memo, '<') ||
      v.includes(memo, '>')
  })

  const initial = { to: '', input: '', memo: '' }
  const form = useForm<Values>(initial, validate)
  const { values, setValue, invalid, getDefaultProps, getDefaultAttrs } = form
  const { to, input, memo: $memo } = values
  const amount = toAmount(input)
  const toEthereum = ethers.utils.isAddress(to)

  /* render */
  const unit = format.denom(denom)
  const fields: Field[] = [
    {
      ...getDefaultProps('to'),
      label: t('Post:Send:Send to'),
      attrs: {
        ...getDefaultAttrs('to'),
        placeholder: 'Terra address or Ethereum address',
        autoFocus: true
      }
    },
    {
      ...getDefaultProps('input'),
      label: t('Common:Tx:Amount'),
      button: {
        label: t('Common:Account:Available'),
        display: format.display(max),
        attrs: { onClick: () => setValue('input', toInput(max.amount)) }
      },
      attrs: {
        ...getDefaultAttrs('input'),
        placeholder: '0'
      },
      unit
    },
    {
      ...getDefaultProps('memo'),
      label: `${t('Common:Tx:Memo')} (${t('Common:Form:Optional')})`,
      attrs: {
        ...getDefaultAttrs('memo'),
        placeholder: t('Post:Send:Input memo'),
        hidden: toEthereum
      }
    }
  ]

  const onSubmit = () => {
    const calcTax = async () => {
      try {
        setSubmitting(true)
        setTax(undefined)
        setTaxError(undefined)
        setTax(await fetchTax({ amount, denom }, t))
        setSubmitted(true)
      } catch (error) {
        setTaxError(error)
      } finally {
        setSubmitting(false)
      }
    }

    denom === 'uluna' || is.address(denom) ? setSubmitted(true) : calcTax()
  }

  const disabled = invalid || submitting

  const formUI = {
    title: t('Post:Send:Send {{unit}}', { unit }),
    fields,
    disabled,
    submitLabel: !submitting
      ? t('Common:Form:Next')
      : t('Post:Send:Calculating tax...'),
    onSubmit: disabled ? undefined : onSubmit
  }

  const recipient = !toEthereum ? to : shuttle
  const memo = !toEthereum ? $memo : to

  const contents: ConfirmContent[] = ([] as ConfirmContent[])
    .concat([
      {
        name: t('Post:Send:Send to'),
        text: to
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [
          is.nativeDenom(denom)
            ? format.display({ amount, denom })
            : { value: input, unit: whitelist?.[denom].symbol ?? '' }
        ]
      }
    ])
    .concat(
      tax ? { name: tax.label, displays: [format.display(tax.coin)] } : []
    )
    .concat($memo ? { name: t('Common:Tx:Memo'), text: $memo } : [])

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: is.nativeDenom(denom)
      ? `/bank/accounts/${recipient}/transfers`
      : `/wasm/contracts/${denom}`,
    payload: is.nativeDenom(denom)
      ? { coins: [{ amount, denom }] }
      : { exec_msg: JSON.stringify({ transfer: { recipient, amount } }) },
    memo,
    contents,
    feeDenom: {
      defaultValue: denom,
      list: getFeeDenomList(bank.balance)
    },
    validate: (fee: Coin) =>
      is.nativeDenom(denom)
        ? isAvailable({ amount, denom, fee, tax: tax?.coin }, bank.balance)
        : isFeeAvailable(fee, bank.balance),
    submitLabels: [t('Post:Send:Send'), t('Post:Send:Sending...')],
    message: t('Post:Send:Sent {{coin}} to {{address}}', {
      coin: format.coin({ amount, denom }),
      address: to
    }),
    warning: t(
      'Post:Send:Please double check if the above transaction requires a memo'
    ),
    cancel: () => setSubmitted(false)
  })

  return {
    error: error || taxError,
    loading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank),
    ui: txsResponse.data && renderRecent(txsResponse.data)
  }
}

/* fetch */
const fetchTax = async ({ amount, denom }: Coin, t: TFunction) => {
  type R = Result<string>
  const { data: rateData } = await fcd.get<R>('/treasury/tax_rate')
  const { data: capData } = await fcd.get<R>(`/treasury/tax_cap/${denom}`)
  const { result: rate } = rateData
  const { result: cap } = capData

  return {
    coin: { amount: ceil(min([times(amount, rate), cap])), denom },
    label: t('Post:Send:Tax ({{percent}}, Max {{max}})', {
      percent: percent(rate, 3),
      max: format.coin({ amount: cap, denom })
    })
  }
}

/* helper */
type RecentSentItem = { date: string; values: Values }
const findRecent = (txs: Tx[], denom: string): RecentSentItem[] | undefined => {
  try {
    const reduced = txs.reduce(
      (
        acc: { [key: string]: RecentSentItem },
        { msgs: [{ text, out }], memo, timestamp }
      ) => {
        const to = last(text.split(' to '))
        const coin = out![0]

        return coin.denom === denom && to && !acc[to] && is.address(to)
          ? {
              ...acc,
              [to]: {
                date: format.date(timestamp),
                values: { to, input: toInput(coin.amount), memo }
              }
            }
          : acc
      },
      {}
    )

    return Object.values(reduced)
  } catch {
    return undefined
  }
}

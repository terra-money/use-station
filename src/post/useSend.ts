import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { last } from 'ramda'
import { BankData, TxsData, Tx, RecentSentUI, RecentSentItemUI } from '../types'
import { PostPage, Result, Coin, User, Field } from '../types'
import { ConfirmContent, ConfirmProps } from '../types'
import { is, format, find } from '../utils'
import { gt, times, min, ceil, percent, minus } from '../utils/math'
import { toAmount, toInput } from '../utils/format'
import fcd from '../api/fcd'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import validateForm from './validateForm'
import { isAvailable, getFeeDenomList } from './validateConfirm'

interface Values {
  to: string
  input: string
  memo: string
}

export default (user: User, denom: string): PostPage<RecentSentUI> => {
  const { t } = useTranslation()
  const { data: bank, loading, error } = useBank(user)
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
      const { to, input, memo } = values
      return {
        title: date,
        contents: [
          { title: t('Post:Send:Send to'), content: to },
          { title: t('Common:Tx:Amount'), content: `${input} ${unit}` },
          { title: t('Common:Tx:Memo'), content: memo }
        ].filter(({ content }) => content),
        onClick: () => form.setValues(values)
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

  const calculateMax = async () => {
    const amount = find(`${denom}:available`, bank?.balance) || '0'
    const tax = await fetchTax({ amount, denom }, t)
    setMax({ denom, amount: minus(amount, tax.coin.amount) })
  }

  useEffect(() => {
    if (!loading) {
      calculateMax()
    }
    // eslint-disable-next-line
  }, [loading])

  /* form */
  const validate = ({ input, to, memo }: Values) => ({
    to: v.address(to),
    input: v.input(input, { max: toInput(max.amount) }),
    memo: v.length(memo, { max: 256, label: t('Common:Tx:Memo') })
  })

  const initial = { to: '', input: '', memo: '' }
  const form = useForm<Values>(initial, validate)
  const { values, setValue, invalid, getDefaultProps, getDefaultAttrs } = form
  const { to, input, memo } = values
  const amount = toAmount(input)

  /* render */
  const unit = format.denom(denom)
  const fields: Field[] = [
    {
      ...getDefaultProps('to'),
      label: t('Post:Send:Send to'),
      attrs: {
        ...getDefaultAttrs('to'),
        placeholder: t("Post:Send:Input receiver's wallet address"),
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
        placeholder: t('Post:Send:Input memo')
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

    denom === 'uluna' ? setSubmitted(true) : calcTax()
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

  const contents: ConfirmContent[] = ([] as ConfirmContent[])
    .concat([
      {
        name: t('Post:Send:Send to'),
        text: to
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [format.display({ amount, denom })]
      }
    ])
    .concat(
      tax ? { name: tax.label, displays: [format.display(tax.coin)] } : []
    )
    .concat(memo ? { name: t('Common:Tx:Memo'), text: memo } : [])

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: `/bank/accounts/${to}/transfers`,
    payload: { coins: [{ amount, denom }] },
    memo,
    contents,
    feeDenom: {
      defaultValue: denom,
      list: getFeeDenomList(bank.balance)
    },
    validate: (fee: Coin) =>
      isAvailable({ amount, denom, fee, tax: tax?.coin }, bank.balance),
    submitLabels: [t('Post:Send:Send'), t('Post:Send:Sending...')],
    message: t('Post:Send:Sent {{coin}} to {{address}}', {
      coin: format.coin({ amount, denom }),
      address: to
    }),
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

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dictionary, last } from 'ramda'
import { AccAddress } from '@terra-money/terra.js'
import { ethers } from 'ethers'
import { BankData, TxsData, Tx, RecentSentUI, RecentSentItemUI } from '../types'
import { PostPage, Coin, User, Field } from '../types'
import { ConfirmContent, ConfirmProps } from '../types'
import { is, format, find } from '../utils'
import { gt, minus } from '../utils/math'
import { toAmount, toInput } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useTokenBalance from '../cw20/useTokenBalance'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import validateForm from './validateForm'
import { isAvailable, getFeeDenomList, isFeeAvailable } from './validateConfirm'
import { calc } from './txHelpers'
import useFetchTax from './useFetchTax'

enum RecipientNetwork {
  Terra = 'Terra',
  Ethereum = 'Ethereum',
  BSC = 'Binance Smart Chain',
}

const SHUTTLES: Dictionary<Record<RecipientNetwork, string>> = {
  mainnet: {
    [RecipientNetwork.Terra]: '',
    [RecipientNetwork.Ethereum]: 'terra13yxhrk08qvdf5zdc9ss5mwsg5sf7zva9xrgwgc',
    [RecipientNetwork.BSC]: 'terra1g6llg3zed35nd3mh9zx6n64tfw3z67w2c48tn2',
  },
  testnet: {
    [RecipientNetwork.Terra]: '',
    [RecipientNetwork.Ethereum]: 'terra10a29fyas9768pw8mewdrar3kzr07jz8f3n73t3',
    [RecipientNetwork.BSC]: 'terra1paav7jul3dzwzv78j0k59glmevttnkfgmgzv2r',
  },
}

interface Values {
  to: string
  input: string
  memo: string
  network: RecipientNetwork
}

export default (user: User, denom: string): PostPage<RecentSentUI> => {
  const { t } = useTranslation()
  const { data: bank, loading: bankLoading, error } = useBank(user)
  const tokenBalance = useTokenBalance(user.address)
  const { list: tokens, loading: tokenLoading, whitelist } = tokenBalance
  const loading = bankLoading || tokenLoading
  const { chain } = useConfig()
  const v = validateForm(t)

  /* recent txs */
  const url = '/v1/msgs'
  const params = { account: user.address, action: 'send', page: 1 }
  const txsResponse = useFCD<TxsData>({ url, params })

  const renderRecentItem = ({
    date,
    values,
  }: RecentSentItem): RecentSentItemUI => {
    const { to, input, memo: $memo } = values

    const toEthereum = Object.values(shuttles).includes(to)
    const network = toEthereum
      ? (Object.entries(shuttles).find(
          ([, address]) => address === to
        )![0] as RecipientNetwork)
      : RecipientNetwork.Terra

    const recipient = !toEthereum ? to : $memo
    const memo = !toEthereum ? $memo : ''

    return {
      title: date,
      contents: [
        { title: t('Post:Send:Send to'), content: recipient },
        { title: t('Post:Send:Network'), content: network },
        { title: t('Common:Tx:Amount'), content: `${input} ${unit}` },
        { title: t('Common:Tx:Memo'), content: memo },
      ].filter(({ content }) => content),
      onClick: () =>
        form.setValues({ ...values, to: recipient, network, memo }),
    }
  }

  const renderRecent = ({
    totalCnt,
    txs,
  }: TxsData): RecentSentUI | undefined => {
    const recent = !gt(totalCnt, 0) ? undefined : findRecent(txs, denom)

    return !recent?.length
      ? undefined
      : {
          title: t('Post:Send:Recent transactions', { unit }),
          contents: recent.map(renderRecentItem),
        }
  }

  /* tax */
  const [submitted, setSubmitted] = useState(false)
  const [max, setMax] = useState<Coin>({ denom, amount: '0' })
  const isMainnet = chain.current.name === 'mainnet'
  const tax = useFetchTax(denom, t)

  const calculateMax = async () => {
    if (bank) {
      const amount = find(`${denom}:available`, bank.balance) || '0'

      if (denom === 'uluna') {
        // If luna is the only token available, we have to remove gas fee from luna
        if (bank.balance.length === 1) {
          setMax({
            denom,
            amount: minus(amount, calc.fee(denom, '100000', isMainnet)),
          })
        } else {
          setMax({ denom, amount })
        }
      } else if (is.nativeDenom(denom)) {
        const coin = tax.getCoin(amount)
        setMax({ denom, amount: minus(amount, coin.amount) })
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
  const validate = ({ input, to, memo, network }: Values) => ({
    to: v.address(to, true),
    input: v.input(input, { max: toInput(max.amount) }),
    memo:
      v.length(memo, { max: 256, label: t('Common:Tx:Memo') }) ||
      v.includes(memo, '<') ||
      v.includes(memo, '>'),
    network: !network
      ? t('Common:Validate:{{label}} is required', {
          label: t('Post:Send:Network'),
        })
      : '',
  })

  const initial = {
    to: '',
    input: '',
    memo: '',
    network: RecipientNetwork.Terra,
  }

  const form = useForm<Values>(initial, validate)
  const { values, setValue, setValues, invalid } = form
  const { getDefaultProps, getDefaultAttrs } = form
  const { to, input, memo: $memo, network } = values
  const amount = toAmount(input)
  const toEthereum = ethers.utils.isAddress(to)
  const toTerra = AccAddress.validate(to)
  const shuttles = SHUTTLES[chain.current.name]
  const shuttle = shuttles[network]

  useEffect(() => {
    toEthereum &&
      network === RecipientNetwork.Terra &&
      setValues((values) => ({ ...values, network: RecipientNetwork.Ethereum }))

    toTerra &&
      network !== RecipientNetwork.Terra &&
      setValues((values) => ({ ...values, network: RecipientNetwork.Terra }))
  }, [toTerra, toEthereum, network, setValues])

  /* render */
  const unit = format.denom(denom)
  const fields: Field[] = [
    {
      ...getDefaultProps('network'),
      element: 'select',
      label: t('Post:Send:Network'),
      attrs: { ...getDefaultAttrs('network') },
      options: Object.values(RecipientNetwork).map((value) => {
        const disabled = {
          [RecipientNetwork.Terra]: toEthereum,
          [RecipientNetwork.Ethereum]: toTerra,
          [RecipientNetwork.BSC]: toTerra,
        }[value]
        return { value, children: value, disabled }
      }),
    },
    {
      ...getDefaultProps('to'),
      label: t('Post:Send:Send to'),
      attrs: {
        ...getDefaultAttrs('to'),
        placeholder: 'Terra address or Ethereum address',
        autoFocus: true,
      },
    },
    {
      ...getDefaultProps('input'),
      label: t('Common:Tx:Amount'),
      button: {
        label: t('Common:Account:Available'),
        display: format.display(max),
        attrs: { onClick: () => setValue('input', toInput(max.amount)) },
      },
      attrs: {
        ...getDefaultAttrs('input'),
        placeholder: '0',
      },
      unit,
    },
    {
      ...getDefaultProps('memo'),
      label: `${t('Common:Tx:Memo')} (${t('Common:Form:Optional')})`,
      attrs: {
        ...getDefaultAttrs('memo'),
        placeholder: t('Post:Send:Input memo'),
        hidden: toEthereum,
      },
    },
  ]

  const disabled = invalid

  const formUI = {
    title: t('Post:Send:Send {{unit}}', { unit }),
    fields,
    disabled,
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true),
  }

  const recipient = !toEthereum ? to : shuttle
  const memo = !toEthereum ? $memo : to

  const contents: ConfirmContent[] = ([] as ConfirmContent[])
    .concat([
      {
        name: t('Post:Send:Send to'),
        text: to,
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [
          is.nativeDenom(denom)
            ? format.display({ amount, denom })
            : { value: input, unit: whitelist?.[denom].symbol ?? '' },
        ],
      },
    ])
    .concat(
      gt(tax.getCoin(amount).amount, 0)
        ? { name: tax.label, displays: [format.display(tax.getCoin(amount))] }
        : []
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
      list: getFeeDenomList(bank.balance),
    },
    validate: (fee: Coin) =>
      is.nativeDenom(denom)
        ? isAvailable(
            { amount, denom, fee, tax: tax.getCoin(amount) },
            bank.balance
          )
        : isFeeAvailable(fee, bank.balance),
    submitLabels: [t('Post:Send:Send'), t('Post:Send:Sending...')],
    message: t('Post:Send:Sent {{coin}} to {{address}}', {
      coin: format.coin({ amount, denom }),
      address: to,
    }),
    warning: [
      t(
        'Post:Send:Please double check if the above transaction requires a memo'
      ),
      t(
        'Post:Send:A fee of 1 UST or 0.1% of the transfer amount (whichever is greater) will be charged for transferring assets from Terra to Ethereum through Shuttle'
      ),
    ],
    cancel: () => setSubmitted(false),
  })

  return {
    error,
    loading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank),
    ui: txsResponse.data && renderRecent(txsResponse.data),
  }
}

/* helper */
type RecentSentItem = { date: string; values: Omit<Values, 'network'> }
const findRecent = (txs: Tx[], denom: string): RecentSentItem[] | undefined => {
  try {
    const reduced = txs.reduce<Dictionary<RecentSentItem>>(
      (acc, { msgs: [{ text, out }], memo, timestamp }) => {
        const to = last(text.split(' to '))
        const coin = out![0]

        return coin.denom === denom && to && !acc[to] && is.address(to)
          ? {
              ...acc,
              [to]: {
                date: format.date(timestamp),
                values: { to, input: toInput(coin.amount), memo },
              },
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

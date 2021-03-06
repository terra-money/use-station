import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dictionary, last } from 'ramda'
import { AccAddress, MsgExecuteContract, MsgSend } from '@terra-money/terra.js'
import { Coin } from '@terra-money/terra.js'
import { ethers } from 'ethers'
import { BankData, TxsData, Tx, Whitelist } from '../types'
import { RecentSentUI, RecentSentItemUI, Rate } from '../types'
import { PostPage, Coin as StationCoin, User, Field } from '../types'
import { ConfirmContent, ConfirmProps } from '../types'
import { is, format, find } from '../utils'
import { div, gt, max as mathMax, max, minus, times } from '../utils/math'
import { toAmount, toInput } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useTokenBalance from '../cw20/useTokenBalance'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import useForm from '../hooks/useForm'
import useTerraAssets from '../hooks/useTerraAssets'
import validateForm from './validateForm'
import { isAvailable, getFeeDenomList, isFeeAvailable } from './validateConfirm'
import { useCalcFee } from './txHelpers'
import useCalcTax from './useCalcTax'

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

    const toEthereum = shuttles && Object.values(shuttles).includes(to)
    const network =
      shuttles && toEthereum
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

  /* form */
  const validate = ({ input, to, memo, network }: Values) => ({
    to: v.address(to, true),
    input: v.input(input),
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
  const shuttle = shuttles?.[network]

  /* tax */
  const [submitted, setSubmitted] = useState(false)
  const shouldTax = is.nativeTerra(denom)
  const calcTax = useCalcTax(denom, t)
  const calcFee = useCalcFee()

  const balance =
    (is.nativeDenom(denom)
      ? find(`${denom}:available`, bank?.balance)
      : tokens?.find(({ token }) => token === denom)?.balance) ?? '0'
  const calculatedMaxAmount = calcTax.getMax(balance)
  const maxAmount =
    bank?.balance.length === 1 && calcFee
      ? max([
          minus(calculatedMaxAmount, calcFee.feeFromGas('100000', denom)),
          0,
        ])
      : calculatedMaxAmount
  const taxAmount = calcTax.getTax(amount)

  /* set network on address change */
  useEffect(() => {
    toEthereum &&
      network === RecipientNetwork.Terra &&
      setValues((values) => ({ ...values, network: RecipientNetwork.Ethereum }))

    toTerra &&
      network !== RecipientNetwork.Terra &&
      setValues((values) => ({ ...values, network: RecipientNetwork.Terra }))
  }, [toTerra, toEthereum, network, setValues])

  /* shuttle fee */
  const rate = useRate(denom)
  const shuttleFee = mathMax([times(amount, 0.001), div(1e6, rate)])
  const amountAfterShuttleFee = mathMax([minus(amount, shuttleFee), String(0)])

  /* shuttle available */
  const unit = format.denom(denom, whitelist)

  const shuttleList = useShuttleList()
  const getIsShuttleAvailable = (network: RecipientNetwork) =>
    network === RecipientNetwork.Terra || !!shuttleList?.[network]?.[unit]

  /* render */
  const fields: Field[] = [
    {
      ...getDefaultProps('network'),
      element: 'select',
      label: t('Post:Send:Network'),
      attrs: { ...getDefaultAttrs('network') },
      options: Object.values(RecipientNetwork).map((value) => {
        const isShuttleAvailable = getIsShuttleAvailable(value)
        const disabled = {
          [RecipientNetwork.Terra]: toEthereum,
          [RecipientNetwork.Ethereum]: toTerra,
          [RecipientNetwork.BSC]: toTerra,
        }[value]

        return {
          value,
          children: value,
          disabled: disabled || !isShuttleAvailable,
        }
      }),
    },
    {
      ...getDefaultProps('to'),
      label: t('Post:Send:Send to'),
      attrs: {
        ...getDefaultAttrs('to'),
        placeholder: `${network} address`,
        autoFocus: true,
      },
    },
    {
      ...getDefaultProps('input'),
      label: t('Common:Tx:Amount'),
      button: {
        label: t('Common:Account:Available'),
        display: format.display({ amount: maxAmount, denom }),
        attrs: { onClick: () => setValue('input', toInput(maxAmount)) },
      },
      attrs: {
        ...getDefaultAttrs('input'),
        type: 'number',
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

  const disabled = invalid || gt(amount, maxAmount)

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
      network !== RecipientNetwork.Terra && is.nativeDenom(denom)
        ? {
            name: 'Amount after Shuttle fee',
            displays: [
              format.display({ amount: amountAfterShuttleFee, denom }),
            ],
          }
        : []
    )
    .concat(
      shouldTax
        ? {
            name: calcTax.label,
            displays: [format.display({ amount: taxAmount, denom })],
          }
        : []
    )
    .concat($memo ? { name: t('Common:Tx:Memo'), text: $memo } : [])

  const getConfirm = (bank: BankData, whitelist: Whitelist): ConfirmProps => ({
    msgs: is.nativeDenom(denom)
      ? [new MsgSend(user.address, recipient, amount + denom)]
      : [
          new MsgExecuteContract(user.address, denom, {
            transfer: { recipient, amount },
          }),
        ],
    tax: shouldTax ? new Coin(denom, taxAmount) : undefined,
    memo,
    contents,
    feeDenom: { list: getFeeDenomList(bank.balance) },
    validate: (fee: StationCoin) =>
      is.nativeDenom(denom)
        ? isAvailable(
            { amount, denom, fee, tax: { amount: taxAmount, denom } },
            bank.balance
          )
        : isFeeAvailable(fee, bank.balance),
    submitLabels: [t('Post:Send:Send'), t('Post:Send:Sending...')],
    message: t('Post:Send:Sent {{coin}} to {{address}}', {
      coin: format.coin({ amount, denom }, undefined, whitelist),
      address: to,
    }),
    warning: [
      t(
        'Post:Send:Please double check if the above transaction requires a memo'
      ),
    ].concat(
      toEthereum
        ? t(
            'Post:Send:A fee of 1 UST or 0.1% of the transfer amount (whichever is greater) will be charged for transferring assets from Terra to Ethereum through Shuttle'
          )
        : []
    ),
    cancel: () => setSubmitted(false),
  })

  return {
    error,
    loading,
    submitted,
    form: formUI,
    confirm: bank && whitelist ? getConfirm(bank, whitelist) : undefined,
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

const useRate = (denom: string) => {
  const swapRateURL = `/v1/market/swaprate/${denom}`
  const response = useFCD<Rate[]>({ url: swapRateURL }, is.nativeDenom(denom))
  const rate = find('uusd:swaprate', response.data) ?? '1'
  return rate
}

const useShuttleList = ():
  | Record<RecipientNetwork, Dictionary<string>>
  | undefined => {
  const { data: ethereum } = useTerraAssets('/shuttle/eth.json')
  const { data: bsc } = useTerraAssets('/shuttle/bsc.json')
  const { chain } = useConfig()
  const { name } = chain.current

  return (
    ethereum &&
    bsc && {
      [RecipientNetwork.Ethereum]: ethereum[name],
      [RecipientNetwork.BSC]: bsc[name],
    }
  )
}

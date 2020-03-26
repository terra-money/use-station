import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { without } from 'ramda'
import { PostPage, SwapUI, ConfirmProps, BankData } from '../types'
import { User, Coin, Rate, Field, FormUI } from '../types'
import { find, format, gt, times, gte, percent, minus } from '../utils'
import { toInput, toAmount } from '../utils/format'
import useForm from '../hooks/useForm'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import fcd from '../api/fcd'
import validateForm from './validateForm'
import { getFeeDenomList, isAvailable } from './validateConfirm'

interface Values {
  from: string
  to: string
  input: string
}

export default (user: User, actives: string[]): PostPage<SwapUI> => {
  const { t } = useTranslation()
  const v = validateForm(t)
  const { data: bank, loading, error } = useBank(user)
  const paramsResponse = useFCD<MarketData>({ url: '/market/parameters' })
  const { data: params, error: paramsError } = paramsResponse

  const denoms = ['uluna', ...actives]
  const [firstActiveDenom] = actives

  const [calculating, setCalculating] = useState(false)

  /* receive */
  const [receiveError, setReceiveError] = useState<Error>()
  const [output, setOutput] = useState('0')
  const [receive, setReceive] = useState('0')

  const init = () => {
    setOutput('0')
    setReceive('0')
  }

  /* max */
  const getMax = (denom: string): Coin => {
    const amount = find(`${denom}:available`, bank?.balance) ?? '0'
    return { amount, denom }
  }

  /* form */
  const validate = ({ from, input }: Values) => ({
    input: v.input(input, { max: toInput(getMax(from).amount) }),
    from: '',
    to: ''
  })

  const initial = { from: 'uluna', to: '', input: '' }
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<Values>(initial, validate)
  const { values, setValue, invalid, getDefaultProps, getDefaultAttrs } = form
  const { from, to, input } = values
  const amount = toAmount(input)

  useEffect(() => {
    const calculate = async () => {
      const { swapped, rate } = await fetch(values)
      setOutput(times(amount, rate))
      setReceive(swapped)
    }

    const effect = async () => {
      try {
        setCalculating(true)
        from === to && setValue('to', '')
        const isEnough = gte(amount, times(await fetchMinimum(values), '1.01'))
        !invalid && from !== to && isEnough ? await calculate() : init()
      } catch (error) {
        setReceiveError(error)
      } finally {
        setCalculating(false)
      }
    }

    from && to && effect()
    // eslint-disable-next-line
  }, [amount, from, to, invalid])

  /* render */
  const fields: Field[] = [
    {
      label: '',
      ...getDefaultProps('from'),
      element: 'select',
      attrs: getDefaultAttrs('from'),
      options: denoms.map(denom => ({
        value: denom,
        children: format.denom(denom)
      }))
    },
    {
      label: '',
      ...getDefaultProps('input'),
      attrs: { ...getDefaultAttrs('input'), placeholder: '0' },
      unit: format.denom(from)
    },
    {
      label: '',
      ...getDefaultProps('to'),
      element: 'select',
      attrs: { ...getDefaultAttrs('to'), readOnly: true },
      options: [
        {
          value: '',
          children: t('Post:Swap:Select a coin...'),
          disabled: true
        },
        ...without([from], denoms).map(denom => ({
          value: denom,
          children: format.denom(denom)
        }))
      ]
    },
    {
      label: '',
      element: 'input',
      attrs: {
        id: output,
        defaultValue: format.amount(output),
        readOnly: true
      }
    }
  ]

  const disabled = invalid || calculating || !!receiveError || !gt(receive, '0')

  const ui: SwapUI = {
    message:
      !firstActiveDenom || receiveError
        ? t('Post:Swap:Swapping is not available at the moment')
        : t('Post:Swap:Select a coin to swap'),
    max: {
      title: t('Post:Swap:Current balance'),
      display: format.display(getMax(from)),
      attrs: {
        onClick: () => setValue('input', toInput(getMax(from).amount))
      }
    },
    spread: {
      title: t('Post:Swap:Spread'),
      text: params && getContent(params?.result, t),
      value: format.amount(minus(output, receive)),
      unit: format.denom(to)
    },
    receive: {
      title: t('Post:Swap:Receive'),
      value: format.amount(receive),
      unit: format.denom(to)
    }
  }

  const formUI: FormUI = {
    fields,
    disabled,
    title: t('Page:Market:Swap coins'),
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true)
  }

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: '/market/swap',
    payload: { ask_denom: to, offer_coin: { amount, denom: from } },
    contents: [
      {
        name: t('Common:Tx:Amount'),
        displays: [format.display({ amount, denom: from })]
      },
      {
        name: t('Post:Swap:Receive'),
        displays: [format.display({ amount: receive, denom: to })]
      }
    ],
    feeDenom: { defaultValue: from, list: getFeeDenomList(bank.balance) },
    validate: (fee: Coin) =>
      isAvailable({ amount, denom: from, fee }, bank.balance),
    submitLabels: [t('Post:Swap:Swap'), t('Post:Swap:Swapping...')],
    message: t('Post:Swap:Swapped {{coin}} to {{unit}}', {
      coin: format.coin({ amount, denom: from }),
      unit: format.denom(to)
    }),
    warning: t(
      'Post:Swap:Final amount you receive in {{unit}} may vary due to the swap rate changes',
      { unit: format.denom(to) }
    )
  })

  return {
    ui,
    error: error || paramsError || receiveError,
    loading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank)
  }
}

/* fetch */
type Result = { swapped: string; rate: string }
const fetch = async ({ from, to, input }: Values): Promise<Result> => {
  const amount = toAmount(input)
  const params = { offer_coin: amount + from, ask_denom: to }
  const swapped = await fcd.get<{ result: Coin }>(`/market/swap`, { params })
  const rateList = await fcd.get<Rate[]>(`/v1/market/swaprate/${from}`)
  const rate = find(`${to}:swaprate`, rateList.data) ?? '0'
  return { swapped: swapped.data.result.amount, rate }
}

const fetchMinimum = async ({ from, to }: Values) => {
  const rateList = await fcd.get<Rate[]>(`/v1/market/swaprate/${to}`)
  const rate = find(`${from}:swaprate`, rateList.data) ?? '0'
  return rate
}

interface MarketData {
  result: {
    min_spread: string
    tobin_tax: string
    illiquid_tobin_tax_list: { denom: string; tax_rate: string }[]
  }
}

const getContent = (result: MarketData['result'], t: TFunction) => {
  const { min_spread, tobin_tax, illiquid_tobin_tax_list } = result

  const min = percent(min_spread, 0)
  const minText = `${[
    t('Post:Swap:Luna swap spread'),
    t('Post:Swap:min.')
  ].join(': ')} ${min}`

  const tobin = percent(tobin_tax)
  let tobinText = `Terra ${t('Post:Swap:tobin tax')}: ${tobin}`

  if (illiquid_tobin_tax_list && illiquid_tobin_tax_list.length) {
    const illiquid = illiquid_tobin_tax_list[0]

    tobinText += ` (${t('Post:Swap:except for {{unit}} set at {{rate}}', {
      unit: format.denom(illiquid.denom),
      rate: percent(illiquid.tax_rate, 0)
    })})`
  }

  return [minText, tobinText].join('\n')
}

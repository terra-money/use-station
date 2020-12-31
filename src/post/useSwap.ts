import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { without } from 'ramda'
import { PostPage, SwapUI, ConfirmProps, BankData, Denom } from '../types'
import { User, Coin, Rate, Field, FormUI } from '../types'
import { find, format, gt, times, gte, percent, minus } from '../utils'
import { toInput, toAmount } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useForm from '../hooks/useForm'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import fcd from '../api/fcd'
import validateForm from './validateForm'
import { getFeeDenomList, isAvailable } from './validateConfirm'
import { getTerraswapURL, simulate as simulateTerraswap } from './terraswap'

type Mode = 'Default' | 'Terraswap'
interface Values {
  from: string
  to: string
  input: string
  mode: Mode
}

interface OracleParamsData {
  result: {
    whitelist: TobinTaxItem[]
  }
}

interface TobinTaxItem {
  name: string
  tobin_tax: string
}

export default (user: User, actives: string[]): PostPage<SwapUI> => {
  const { t } = useTranslation()
  const v = validateForm(t)
  const { chain } = useConfig()
  const { data: bank, loading, error } = useBank(user)
  const paramsResponse = useFCD<MarketData>({ url: '/market/parameters' })
  const { data: oracle } = useFCD<OracleParamsData>({
    url: '/oracle/parameters'
  })
  const { data: params, error: paramsError } = paramsResponse

  const denoms = ['uluna', ...actives]
  const [firstActiveDenom] = actives

  /* max */
  const getMax = (denom: string): Coin => {
    const amount = find(`${denom}:available`, bank?.balance) ?? '0'
    return { amount, denom }
  }

  /* form */
  const validate = ({ from, input }: Values) => ({
    input: v.input(input, { max: toInput(getMax(from).amount) }),
    from: '',
    to: '',
    mode: ''
  })

  const initial = { from: 'uluna', to: '', input: '', mode: 'Default' as Mode }
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<Values>(initial, validate)
  const { values, setValue, setValues, invalid } = form
  const { getDefaultProps, getDefaultAttrs } = form
  const { from, to, input, mode } = values
  const amount = toAmount(input)

  // simulate on change
  const [simulating, setSimulating] = useState(false)
  const [receiveError, setReceiveError] = useState<Error>()
  const [principalNative, setPrincipalNative] = useState('0')
  const [returnNative, setReturnNative] = useState('0')
  const [isEnough, setIsEnough] = useState(false)
  const [returnTerraswap, setReturnTerraswap] = useState('0')
  const [tradingFeeTerraswap, setTradingFeeTerraswap] = useState('0')

  const init = () => {
    setValue('to', '')
    setPrincipalNative('0')
    setReturnNative('0')
    setReturnTerraswap('0')
    setTradingFeeTerraswap('0')
  }

  const pair = (from === 'uluna' ? to : from) as Denom
  useEffect(() => {
    const waitAll = async () => {
      const { swapped, rate } = await fetchSimulate(values)
      setPrincipalNative(times(amount, rate))
      setReturnNative(swapped)

      if ([from, to].includes('uluna')) {
        const { result } = await simulateTerraswap(
          { pair, offer: { amount, denom: from as Denom } },
          chain.current
        )

        result && setReturnTerraswap(result.return_amount)
        result && setTradingFeeTerraswap(result.commission_amount)

        const isBetter = gt(result?.return_amount ?? 0, swapped)
        setValue('mode', isBetter ? 'Terraswap' : 'Default')
      } else {
        setValue('mode', 'Default')
      }
    }

    const simulate = async () => {
      try {
        setSimulating(true)
        from === to ? init() : gt(amount, 0) && (await waitAll())
        setIsEnough(gte(amount, times(await fetchMinimum(values), '1.01')))
      } catch (error) {
        setReceiveError(error)
      } finally {
        setSimulating(false)
      }
    }

    from && to && simulate()
    // eslint-disable-next-line
  }, [amount, from, to])

  useEffect(() => {
    setValues(values => ({ ...values, input: '0' }))
    // eslint-disable-next-line
  }, [from])

  /* render */
  const fields: Field[] = [
    {
      label: '',
      ...getDefaultProps('from'),
      element: 'select',
      attrs: getDefaultAttrs('from'),
      options: denoms.map(denom => ({
        value: denom,
        children: format.denom(denom),
        disabled: !gt(find(`${denom}:available`, bank?.balance) ?? '0', '0')
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
      attrs: getDefaultAttrs('to'),
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
        id: 'receive',
        value: {
          Default: format.amount(returnNative),
          Terraswap: format.amount(returnTerraswap)
        }[mode],
        readOnly: true
      }
    },
    {
      label: '',
      ...getDefaultProps('mode'),
      element: 'select',
      attrs: {
        ...getDefaultAttrs('mode'),
        hidden: ![from, to].includes('uluna')
      },
      options: ['Default', 'Terraswap'].map(value => ({
        value,
        children: value
      }))
    }
  ]

  const disabled =
    invalid ||
    simulating ||
    !!receiveError ||
    !gt(returnNative, '0') ||
    !isEnough

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
      Default: {
        title: t('Post:Swap:Spread'),
        text:
          params &&
          oracle &&
          getContent(
            {
              result: params.result,
              whitelist: oracle.result.whitelist,
              denom: to
            },
            t
          ),
        value: format.amount(minus(principalNative, returnNative)),
        unit: format.denom(to)
      },
      Terraswap: {
        title: 'Trading Fee',
        value: format.amount(tradingFeeTerraswap),
        unit: format.denom(to)
      }
    }[mode]
  }

  const formUI: FormUI = {
    fields,
    disabled,
    title: t('Page:Swap:Swap coins'),
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true)
  }

  const { url, payload } = getTerraswapURL(
    { pair, offer: { amount, denom: from as Denom } },
    chain.current
  )

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: {
      Default: '/market/swap',
      Terraswap: url
    }[mode],
    payload: {
      Default: { ask_denom: to, offer_coin: { amount, denom: from } },
      Terraswap: payload
    }[mode],
    contents: [
      {
        name: 'Mode',
        text: mode
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [format.display({ amount, denom: from })]
      },
      {
        name: t('Post:Swap:Receive'),
        displays: [
          format.display({
            amount: { Default: returnNative, Terraswap: returnTerraswap }[mode],
            denom: to
          })
        ]
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
const fetchSimulate = async ({ from, to, input }: Values): Promise<Result> => {
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
  }
}

interface Params {
  result: MarketData['result']
  whitelist: TobinTaxItem[]
  denom: string
}

const getContent = (params: Params, t: TFunction) => {
  const { result, whitelist, denom } = params
  const { min_spread } = result

  const min = percent(min_spread)
  const minText = `${[
    t('Post:Swap:Luna swap spread'),
    t('Post:Swap:min.')
  ].join(': ')} ${min}`

  const tobinTax = whitelist?.find(list => list.name === denom)?.tobin_tax

  const tobinText = `Terra ${t('Post:Swap:tobin tax')}: ${percent(
    tobinTax ?? 0
  )}`

  return [minText, tobinText].join('\n')
}

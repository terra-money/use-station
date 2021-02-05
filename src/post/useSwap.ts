import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dictionary } from 'ramda'
import { TFunction } from 'i18next'
import { AccAddress } from '@terra-money/terra.js'
import { PostPage, SwapUI, ConfirmProps, BankData, Denom } from '../types'
import { User, Coin, Token, Rate, Field, FormUI } from '../types'
import { find, format, gt, times, percent, minus } from '../utils'
import { toInput, toAmount } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useForm from '../hooks/useForm'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import fcd from '../api/fcd'
import useTokenBalance from '../cw20/useTokenBalance'
import whitelists from '../cw20/tokens.json'
import validateForm from './validateForm'
import { getFeeDenomList, isAvailable } from './validateConfirm'
import { getTerraswapURL, simulate as simulateTerraswap } from './terraswap'
import useFetchTax from './useFetchTax'

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

const LUNA_PAIRS: Dictionary<Record<Denom, string>> = {
  mainnet: {
    ukrw: 'terra1zw0kfxrxgrs5l087mjm79hcmj3y8z6tljuhpmc',
    umnt: 'terra1sndgzq62wp23mv20ndr4sxg6k8xcsudsy87uph',
    usdr: 'terra1vs2vuks65rq7xj78mwtvn7vvnm2gn7adjlr002',
    uusd: 'terra1tndcaqxkpc5ce9qee5ggqf430mr2z3pefe5wj6',
  },

  testnet: {
    ukrw: 'terra1rfzwcdhhu502xws6r5pxw4hx8c6vms772d6vyu',
    umnt: 'terra18x2ld35r4vn5rlygjzpjenyh2rfmvqgqk9lrnn',
    usdr: 'terra1dmrn07plsrr8p7qqq6dmue8ydw0smxfza6f8sc',
    uusd: 'terra156v8s539wtz0sjpn8y8a8lfg8fhmwa7fy22aff',
  },
}

export default (user: User, actives: string[]): PostPage<SwapUI> => {
  const { t } = useTranslation()
  const v = validateForm(t)
  const { chain } = useConfig()
  const { data: bank, loading, error, execute: executeBank } = useBank(user)
  const cw20Tokens = useTokenBalance(user.address)
  const paramsResponse = useFCD<MarketData>({ url: '/market/parameters' })
  const oracleResponse = useFCD<OracleParamsData>({ url: '/oracle/parameters' })
  const { data: params, error: paramsError } = paramsResponse
  const { data: oracle } = oracleResponse

  const load = async () => {
    await executeBank()
    await cw20Tokens.load()
  }

  /* token options */
  const nativeTokensOptions = ['uluna', ...actives].map((denom) => ({
    value: denom,
    children: format.denom(denom),
    balance: find(`${denom}:available`, bank?.balance) ?? '0',
  }))

  const cw20TokensList =
    cw20Tokens.list?.map(({ token, symbol, balance }) => ({
      value: token,
      children: symbol,
      balance,
    })) ?? []

  const tokens = [...nativeTokensOptions, ...cw20TokensList]

  /* max */
  const getMax = (token: string): Coin => {
    const tokenInfo = tokens.find(({ value }) => value === token)
    const taxAmount = tax?.getCoin(tokenInfo?.balance ?? '0').amount
    return {
      amount: minus(tokenInfo?.balance ?? '0', taxAmount),
      denom: tokenInfo?.value ?? '',
    }
  }

  /* form */
  const validate = ({ from, input }: Values) => ({
    input: v.input(input, { max: toInput(getMax(from).amount) }),
    from: '',
    to: '',
    mode: '',
  })

  const initial = { from: '', to: '', input: '', mode: 'Default' as Mode }
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<Values>(initial, validate)
  const { values, setValue, setValues, invalid } = form
  const { getDefaultProps, getDefaultAttrs } = form
  const { from, to, input, mode } = values
  const amount = toAmount(input)

  // tax
  const tax = useFetchTax(from, t)

  // simulate on change
  const [simulating, setSimulating] = useState(false)

  // simulate: Native
  const [returnNative, setReturnNative] = useState('0')
  const [principalNative, setPrincipalNative] = useState('0')
  const [errorNative, setErrorNative] = useState<Error>()

  // simulate: Terraswap
  const [returnTerraswap, setReturnTerraswap] = useState('0')
  const [tradingFeeTerraswap, setTradingFeeTerraswap] = useState('0')

  const init = () => {
    setValue('to', '')
    setPrincipalNative('0')
    setReturnNative('0')
    setReturnTerraswap('0')
    setTradingFeeTerraswap('0')
  }

  const whitelist: Dictionary<Token> =
    whitelists[chain.current.name as 'mainnet' | 'testnet']

  const ismAsset =
    (from === 'uusd' && AccAddress.validate(to)) ||
    (to === 'uusd' && AccAddress.validate(from))

  const pair = [from, to].includes('uluna')
    ? LUNA_PAIRS[chain.current.name]![(from === 'uluna' ? to : from) as Denom]
    : ismAsset
    ? whitelist[from === 'uusd' ? to : from].pair
    : undefined

  const token = ismAsset
    ? whitelist[from === 'uusd' ? to : from].token
    : undefined

  const terraswapParams = { pair, token, offer: { amount, from } }

  useEffect(() => {
    const waitAll = async () => {
      try {
        if (pair) {
          const { result } = await simulateTerraswap(
            terraswapParams,
            chain.current
          )

          result && setReturnTerraswap(result.return_amount)
          result && setTradingFeeTerraswap(result.commission_amount)
        }

        if (![from, to].some(AccAddress.validate)) {
          const { swapped, rate } = await fetchSimulate(values)
          setPrincipalNative(times(amount, rate))
          setReturnNative(swapped)
        }
      } catch (error) {
        // ...
      }
    }

    const simulate = async () => {
      try {
        setSimulating(true)
        from === to ? init() : gt(amount, 0) && (await waitAll())
      } catch (error) {
        setErrorNative(error)
      } finally {
        setSimulating(false)
      }
    }

    from && to && simulate()
    // eslint-disable-next-line
  }, [amount, from, to])

  useEffect(() => {
    const isTerraswapBetter = pair && gt(returnTerraswap, returnNative)

    setValues((values) => ({
      ...values,
      mode: isTerraswapBetter ? 'Terraswap' : 'Default',
    }))
  }, [returnTerraswap, returnNative, setValues])

  useEffect(() => {
    setValues((values) => ({ ...values, input: '', to: '' }))
    // eslint-disable-next-line
  }, [from])

  /* render */
  const fields: Field[] = [
    {
      label: '',
      ...getDefaultProps('from'),
      element: 'select',
      attrs: getDefaultAttrs('from'),
      options: [
        {
          value: '',
          children: t('Post:Swap:Select a coin...'),
          disabled: true,
        },
        ...tokens.filter(({ balance }) => gt(balance, 0)),
      ],
    },
    {
      label: '',
      ...getDefaultProps('input'),
      attrs: { ...getDefaultAttrs('input'), placeholder: '0' },
      unit: format.denom(from),
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
          disabled: true,
        },
        ...tokens
          .filter(({ value }) => value !== from)
          .map((item) => {
            const disabledFromUST =
              from !== 'uusd' &&
              !nativeTokensOptions.find((native) => native.value === item.value)

            const disabledFromCW20 =
              cw20TokensList.find((cw20) => cw20.value === from) &&
              item.value !== 'uusd'

            const disabled = disabledFromUST || disabledFromCW20
            return { ...item, disabled }
          }),
      ],
    },
    {
      label: '',
      element: 'input',
      attrs: {
        id: 'receive',
        value: {
          Default: format.amount(returnNative),
          Terraswap: format.amount(returnTerraswap),
        }[mode],
        readOnly: true,
      },
    },
    {
      label: '',
      ...getDefaultProps('mode'),
      element: 'select',
      attrs: {
        ...getDefaultAttrs('mode'),
        hidden: !pair,
      },
      options: ['Default', 'Terraswap'].map((value) => ({
        value,
        children: value === 'Default' ? 'On-chain' : value,
      })),
    },
  ]

  const disabled =
    invalid ||
    simulating ||
    !!errorNative ||
    !(mode !== 'Default' || gt(returnNative, '0'))

  const [firstActiveDenom] = actives
  const ui: SwapUI = {
    message:
      !firstActiveDenom || errorNative
        ? t('Post:Swap:Swapping is not available at the moment')
        : t('Post:Swap:Select a coin to swap'),
    max: {
      title: t('Post:Swap:Current balance'),
      display: format.display(getMax(from)),
      attrs: {
        onClick: () => setValue('input', toInput(getMax(from).amount)),
      },
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
              denom: to,
            },
            t
          ),
        value: format.amount(minus(principalNative, returnNative)),
        unit: format.denom(to),
      },
      Terraswap: {
        title: 'Trading Fee',
        value: format.amount(tradingFeeTerraswap),
        unit: format.denom(to),
      },
    }[mode],
  }

  const formUI: FormUI = {
    fields,
    disabled,
    title: t('Page:Swap:Swap coins'),
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true),
  }

  const terraswap = pair
    ? getTerraswapURL(terraswapParams, chain.current)
    : undefined

  const getConfirm = (bank: BankData): ConfirmProps => ({
    url: {
      Default: '/market/swap',
      Terraswap: terraswap?.url ?? '',
    }[mode],
    payload: {
      Default: { ask_denom: to, offer_coin: { amount, denom: from } },
      Terraswap: terraswap?.payload,
    }[mode],
    contents: [
      {
        name: 'Mode',
        text: mode,
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [format.display({ amount, denom: from })],
      },
    ]
      .concat(
        mode === 'Terraswap' && gt(tax.getCoin(amount).amount, 0)
          ? { name: tax.label, displays: [format.display(tax.getCoin(amount))] }
          : []
      )
      .concat({
        name: t('Post:Swap:Receive'),
        displays: [
          format.display({
            amount: { Default: returnNative, Terraswap: returnTerraswap }[mode],
            denom: to,
          }),
        ],
      }),
    feeDenom: { defaultValue: from, list: getFeeDenomList(bank.balance) },
    validate: (fee: Coin) =>
      ismAsset || isAvailable({ amount, denom: from, fee }, bank.balance),
    submitLabels: [t('Post:Swap:Swap'), t('Post:Swap:Swapping...')],
    message: t('Post:Swap:Swapped {{coin}} to {{unit}}', {
      coin: format.coin({ amount, denom: from }),
      unit: format.denom(to),
    }),
    warning: t(
      'Post:Swap:Final amount you receive in {{unit}} may vary due to the swap rate changes',
      { unit: format.denom(to) }
    ),
  })

  return {
    ui,
    error: error || paramsError || errorNative,
    load,
    loading,
    submitted,
    form: formUI,
    confirm: bank && getConfirm(bank),
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
    t('Post:Swap:min.'),
  ].join(': ')} ${min}`

  const tobinTax = whitelist?.find((list) => list.name === denom)?.tobin_tax

  const tobinText = `Terra ${t('Post:Swap:tobin tax')}: ${percent(
    tobinTax ?? 0
  )}`

  return [minText, tobinText].join('\n')
}

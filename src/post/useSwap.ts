import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { AccAddress, MsgExecuteContract, MsgSwap } from '@terra-money/terra.js'
import { Coin } from '@terra-money/terra.js'
import { PostPage, SwapUI, ConfirmProps, BankData, Whitelist } from '../types'
import { User, Coin as StationCoin, Rate, Field, FormUI } from '../types'
import { find, floor, format, is, isInteger, lte, max, plus } from '../utils'
import { gt, times, percent, minus, div, isFinite } from '../utils'
import { toInput, toAmount, decimalN } from '../utils/format'
import { useConfig } from '../contexts/ConfigContext'
import useForm from '../hooks/useForm'
import useFCD from '../api/useFCD'
import useBank from '../api/useBank'
import fcd from '../api/fcd'
import useTokenBalance from '../cw20/useTokenBalance'
import validateForm from './validateForm'
import usePairs from '../cw20/usePairs'
import { getFeeDenomList, isAvailable, isFeeAvailable } from './validateConfirm'
import { getTerraswapURL, simulateTerraswap } from './terraswap'
import * as routeswap from './routeswap'
import useCalcTax from './useCalcTax'
import { useCalcFee } from './txHelpers'

const { findPair, getRouteMessage } = routeswap
const { isRouteAvailable, isOnChainAvailable, simulateRoute } = routeswap

const assertLimitOrderContracts: Dictionary = {
  mainnet: 'terra1vs9jr7pxuqwct3j29lez3pfetuu8xmq7tk3lzk',
  testnet: 'terra1z3sf42ywpuhxdh78rr5vyqxpaxa0dx657x5trs',
}

type Mode = 'On-chain' | 'Terraswap' | 'Route'
interface Values {
  slippage: string
  from: string
  to: string
  input: string
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

  /* ready: balance */
  const bank = useBank(user)
  const cw20Tokens = useTokenBalance(user.address)
  const { pairs, loading: loadingPairs } = usePairs(chain.current.name)
  const { whitelist } = cw20Tokens
  const loadingUI = bank.loading || cw20Tokens.loading || loadingPairs

  // tokens
  const nativeTokensOptions = ['uluna', ...actives].map((denom) => ({
    value: denom,
    children: format.denom(denom),
    balance: find(`${denom}:available`, bank.data?.balance) ?? '0',
  }))

  const cw20TokensList =
    cw20Tokens.list?.map(({ token, symbol, balance }) => ({
      value: token,
      children: symbol,
      balance,
    })) ?? []

  const tokens = [...nativeTokensOptions, ...cw20TokensList]

  /* ready: tooltip */
  const paramsResponse = useFCD<MarketData>({ url: '/market/parameters' })
  const oracleResponse = useFCD<OracleParamsData>({ url: '/oracle/parameters' })
  const { data: params, error: paramsError } = paramsResponse
  const { data: oracle } = oracleResponse

  /* ready: refetch */
  const load = async () => {
    init()
    await bank.execute()
    await cw20Tokens.load()
  }

  /* form */
  const validate = ({ input, slippage }: Values) => ({
    slippage: !isInteger(times(slippage, 100))
      ? 'Slippage must be within 2 decimal points'
      : '',
    from: '',
    to: '',
    input: v.input(input),
  })

  const initial = { slippage: '1', from: '', to: '', input: '' }
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<Values>(initial, validate)
  const { values, setValue, setValues, invalid } = form
  const { getDefaultProps, getDefaultAttrs } = form
  const { slippage, from, to, input } = values
  const amount = toAmount(input)
  const slippagePercent = isFinite(slippage) ? div(slippage, 100) : '0.01'

  const pair = findPair({ from, to }, pairs)

  type PairParams = { from: string; to: string }
  const getMode = ({ from, to }: PairParams): Mode | undefined =>
    !(from && to)
      ? undefined
      : isOnChainAvailable({ from, to })
      ? 'On-chain'
      : findPair({ from, to }, pairs)
      ? 'Terraswap'
      : isRouteAvailable({ from, to, chain: chain.current.name, pairs })
      ? 'Route'
      : undefined

  const mode = getMode({ from, to })

  const init = (values?: Partial<Values>) => {
    setValues({ slippage: '1', from: '', to: '', input: '', ...values })
    setPrincipalNative('0')
    setSimulated('0')
    setTradingFeeTerraswap('0')
  }

  /* simulate */
  const [simulating, setSimulating] = useState(false)
  const [simulated, setSimulated] = useState('0')
  const [errorMessage, setErrorMessage] = useState<Error>()
  const minimum_receive = floor(times(simulated, minus(1, slippagePercent)))

  // simulate: Native
  const [principalNative, setPrincipalNative] = useState('0')

  // simulate: Terraswap
  const [tradingFeeTerraswap, setTradingFeeTerraswap] = useState('0')

  // simulate: Expected price
  const [price, setPrice] = useState('0')
  const expectedPrice = div(amount, simulated)

  // simulate: Max & Tax
  const shouldTax = is.nativeTerra(from) && mode !== 'On-chain'
  const calcTax = useCalcTax(from, t)
  const calcFee = useCalcFee()
  const { getMax, getTax, label: taxLabel, loading: loadingTax } = calcTax
  const tax = shouldTax ? getTax(amount) : '0'
  const balance = tokens.find(({ value }) => value === from)?.balance ?? '0'
  const calculatedMaxAmount = shouldTax ? getMax(balance) : balance
  const maxAmount =
    bank.data?.balance.length === 1 && calcFee
      ? max([minus(calculatedMaxAmount, calcFee.feeFromGas('100000', from)), 0])
      : calculatedMaxAmount

  // simulate
  const isTerraswap =
    (from === 'uusd' && AccAddress.validate(to)) ||
    (to === 'uusd' && AccAddress.validate(from))
  const token = isTerraswap
    ? cw20Tokens.whitelist?.[from === 'uusd' ? to : from]?.token
    : undefined
  const terraswapParams = { pair, token, offer: { amount, from } }

  const routeParams = {
    amount,
    from,
    to,
    chain: chain.current,
    minimum_receive,
  }

  const { execute: executeRoute } = getRouteMessage(routeParams)

  useEffect(() => {
    const simulate = async () => {
      try {
        setSimulating(true)

        if (mode === 'Route') {
          const result = await simulateRoute(routeParams)
          setSimulated(result)
        } else if (mode === 'Terraswap') {
          const result = await simulateTerraswap(
            terraswapParams,
            chain.current,
            user.address
          )

          result && setSimulated(result.return_amount)
          result && setTradingFeeTerraswap(result.commission_amount)
        } else if (mode === 'On-chain') {
          const { swapped, rate } = await simulateOnchain({ ...values, amount })
          setPrincipalNative(times(amount, rate!))
          setSimulated(swapped)
        }
      } catch (error) {
        setErrorMessage(error.message)
      } finally {
        setSimulating(false)
      }
    }

    if (from && to) {
      from === to ? init({ from }) : gt(amount, 0) && simulate()
    }

    // eslint-disable-next-line
  }, [amount, from, to])

  useEffect(() => {
    const fetchPrice = async () => {
      const { data } = await fcd.get<Rate[]>(`/v1/market/swaprate/${from}`)
      const price = data?.find(({ denom }) => denom === to)?.swaprate
      price && setPrice(price)
    }

    is.nativeDenom(from) && fetchPrice()
    // eslint-disable-next-line
  }, [from, to])

  useEffect(() => {
    init({ from, slippage })
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
      attrs: {
        ...getDefaultAttrs('input'),
        type: 'number',
        placeholder: '0',
      },
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
          .filter(({ value }) => getMode({ from, to: value })),
      ],
    },
    {
      label: '',
      element: 'input',
      attrs: {
        id: 'receive',
        value: format.amount(simulated),
        readOnly: true,
      },
    },
  ]

  const slippageField: Field = {
    label: '',
    ...getDefaultProps('slippage'),
    element: 'input',
    attrs: getDefaultAttrs('slippage'),
  }

  const validInput = !invalid && from && to && lte(amount, maxAmount)
  const validSimulation = gt(simulated, '0')
  const calculating = loadingTax || simulating
  const disabled =
    !validInput || !validSimulation || calculating || !!errorMessage

  const [firstActiveDenom] = actives
  const ui: SwapUI = {
    bank: bank?.data,
    pairs,
    mode: mode ?? '',
    message:
      !firstActiveDenom || errorMessage
        ? t('Post:Swap:Swapping is not available at the moment')
        : t('Post:Swap:Select a coin to swap'),
    max: !from
      ? undefined
      : {
          title: t('Post:Swap:Available balance'),
          display: format.display(
            { amount: maxAmount, denom: from },
            undefined,
            whitelist
          ),
          attrs: {
            onClick: () => setValue('input', toInput(maxAmount)),
          },
        },
    expectedPrice: !(isFinite(expectedPrice) && gt(expectedPrice, 0))
      ? undefined
      : {
          title: 'Expected price',
          text: gt(expectedPrice, 1)
            ? `1 ${format.denom(to, whitelist)} = ${format.decimal(
                expectedPrice
              )} ${format.denom(from, whitelist)}`
            : `1 ${format.denom(from, whitelist)} = ${format.decimal(
                div(1, expectedPrice)
              )} ${format.denom(to, whitelist)}`,
        },
    spread: !mode
      ? undefined
      : {
          'On-chain': {
            title: t('Post:Swap:Spread'),
            tooltip:
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
            value: format.amount(minus(principalNative, simulated)),
            unit: format.denom(to),
          },
          Terraswap: {
            title: 'Trading Fee',
            value: format.amount(tradingFeeTerraswap),
            unit: format.denom(to),
          },
          Route: {
            title: 'Route',
            text: [
              format.denom(from, whitelist),
              'UST',
              format.denom(to, whitelist),
            ].join(' > '),
          },
        }[mode],
    label: { multipleSwap: t('Post:Swap:Swap multiple coins') },
    slippageField,
  }

  const formUI: FormUI = {
    fields,
    disabled,
    title: t('Page:Swap:Swap coins'),
    submitLabel: t('Common:Form:Next'),
    onSubmit: disabled ? undefined : () => setSubmitted(true),
  }

  const assertLimitOrderContract = assertLimitOrderContracts[chain.current.name]
  const assertLimitOrder = !assertLimitOrderContract
    ? undefined
    : new MsgExecuteContract(user.address, assertLimitOrderContract, {
        assert_limit_order: {
          offer_coin: { denom: from, amount },
          ask_denom: to,
          minimum_receive,
        },
      })

  const swap = new MsgSwap(user.address, new Coin(from, amount), to)

  const terraswap = pair
    ? getTerraswapURL(terraswapParams, chain.current, user.address, {
        belief_price: String(decimalN(expectedPrice, 18)),
        max_spread: slippagePercent,
      })
    : undefined

  const getConfirm = (bank: BankData, whitelist: Whitelist): ConfirmProps => ({
    msgs: !mode
      ? undefined
      : {
          'On-chain': assertLimitOrder ? [assertLimitOrder, swap] : [swap],
          Terraswap: terraswap?.msgs,
          Route: [
            new MsgExecuteContract(
              user.address,
              executeRoute.contract,
              executeRoute.msg,
              executeRoute.coins
            ),
          ],
        }[mode],
    tax: shouldTax ? new Coin(from, tax) : undefined,
    contents: [
      {
        name: 'Mode',
        text: mode,
      },
      {
        name: t('Common:Tx:Amount'),
        displays: [
          format.display({ amount, denom: from }, undefined, whitelist),
        ],
      },
      {
        name: 'Slippage Tolerance',
        text: slippage + '%',
      },
    ]
      .concat(
        shouldTax
          ? {
              name: taxLabel,
              displays: [format.display({ amount: tax, denom: from })],
            }
          : []
      )
      .concat({
        name: t('Post:Swap:Receive'),
        displays: [
          format.display(
            { amount: simulated, denom: to },
            undefined,
            whitelist
          ),
        ],
      }),
    feeDenom: { list: getFeeDenomList(bank.balance) },
    validate: (fee: StationCoin) =>
      is.nativeDenom(from)
        ? isAvailable(
            { amount: plus(amount, tax), denom: from, fee },
            bank.balance
          )
        : isFeeAvailable(fee, bank.balance),
    submitLabels: [t('Post:Swap:Swap'), t('Post:Swap:Swapping...')],
    message: '',
    parseResult: ({ logs }) => {
      if (!logs) return ''

      const { attributes: attributes1 } = logs[0].events[1]

      const { amount: paid } = splitTokenText(
        attributes1.find(({ key }) => key === 'offer' || key === 'offer_amount')
          ?.value
      )

      const { amount: received } = splitTokenText(
        attributes1.find(
          ({ key }) => key === 'swap_coin' || key === 'return_amount'
        )?.value
      )

      const message = t('Post:Swap:Swapped {{coin}} to {{unit}}', {
        coin: format.coin({ amount, denom: from }, undefined, whitelist),
        unit: format.denom(to, whitelist),
      })

      const executed_price = div(received, paid)
      const slippage =
        mode !== 'Route' && price
          ? max([minus(div(executed_price, price), 1), '0'])
          : ''

      return slippage ? `${message} (Slippage: ${percent(slippage)})` : message
    },
    warning: t(
      'Post:Swap:Final amount you receive in {{unit}} may vary due to the swap rate changes',
      { unit: format.denom(to, whitelist) }
    ),
  })

  return {
    ui,
    error: bank.error || paramsError || errorMessage,
    load,
    loading: loadingUI,
    submitted,
    form: formUI,
    confirm:
      bank.data && whitelist ? getConfirm(bank.data, whitelist) : undefined,
  }
}

/* fetch */
interface SimulateParams {
  from: string
  to: string
  amount: string
}

interface SimulateResult {
  swapped: string
  rate?: string
}

export const simulateOnchain = async (
  simulateParams: SimulateParams,
  fetchRate = true
): Promise<SimulateResult> => {
  const { from, to, amount } = simulateParams
  const params = { offer_coin: amount + from, ask_denom: to }
  const url = `/market/swap`
  const swapped = await fcd.get<{ result: StationCoin }>(url, { params })

  if (fetchRate) {
    const rateList = await fcd.get<Rate[]>(`/v1/market/swaprate/${from}`)
    const rate = find(`${to}:swaprate`, rateList.data) ?? '0'
    return { swapped: swapped.data.result.amount, rate }
  } else {
    return { swapped: swapped.data.result.amount }
  }
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

export const splitTokenText = (string = '') => {
  const [, amount, token] = string.split(/(\d+)(\w+)/)
  return Number(string) ? { amount: string, token: '' } : { amount, token }
}

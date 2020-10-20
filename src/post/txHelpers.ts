import { Dictionary } from 'ramda'
import { Result, ParsedRaw, ParsedLog, Base, PostError } from '../types'
import { times, div, ceil, floor } from '../utils/math'
import fcd from '../api/fcd'

const GAS_PRICES_MAINNET: Dictionary<string> = {
  uluna: '0.00506',
  uusd: '0.0015',
  usdr: '0.00102',
  ukrw: '1.7805',
  umnt: '4.31626'
}

const GAS_PRICES_TESTNET: Dictionary<string> = {
  uluna: '0.15',
  uusd: '0.15',
  usdr: '0.1018',
  ukrw: '178.05',
  umnt: '431.6259'
}

const getGasPrices = (denom: string, isMainnet: boolean) =>
  (isMainnet ? GAS_PRICES_MAINNET : GAS_PRICES_TESTNET)[denom]

export const config = { headers: { 'Content-Type': 'application/json' } }
export const calc = {
  gasPrice: (denom: string, isMainnet: boolean) => ({
    amount: getGasPrices(denom, isMainnet),
    denom
  }),
  fee: (denom: string, gas: string, isMainnet: boolean): string =>
    ceil(times(gas, getGasPrices(denom, isMainnet))),
  gas: (denom: string, fee: string, isMainnet: boolean): string =>
    floor(div(fee, getGasPrices(denom, isMainnet)))
}

/* base */
type Latest = { block: { header: { chain_id: string } } }
type Account = Result<{ value: AccountValue | BaseAccountValue }>
type BaseAccountValue = { BaseVestingAccount: { BaseAccount: AccountValue } }
export const getBase = async (from: string): Promise<Base> => {
  const { data: latest } = await fcd.get<Latest>('/blocks/latest')
  const { chain_id } = latest.block.header

  const { data: account } = await fcd.get<Account>(`/auth/accounts/${from}`)
  const { account_number, sequence } = getValue(account)

  return {
    from,
    chain_id,
    account_number: String(account_number),
    sequence: String(sequence)
  }
}

type AccountValue = { account_number: string; sequence: string }
const getValue = ({ result: { value } }: Account): AccountValue =>
  'BaseVestingAccount' in value ? value.BaseVestingAccount.BaseAccount : value

/* error */
export const parseError = (
  e: PostError,
  defaultMessage: string = ''
): string => {
  try {
    if ('response' in e) {
      // API Error
      const { data } = e.response!

      if ('message' in data) {
        return data.message!
      } else if ('error' in data) {
        const { error } = data
        return typeof error === 'string'
          ? checkError(error!)
          : getMessage(error!)
      }
    }

    console.error(e)
    return defaultMessage
  } catch (e) {
    console.error(e)
    return defaultMessage
  }
}

export const checkError = (raw?: string): string => {
  if (!raw) {
    return ''
  } else {
    try {
      const parsed: ParsedRaw = JSON.parse(raw)
      return getMessage(parsed)
    } catch {
      return raw
    }
  }
}

const getMessage = (parsed: ParsedRaw): string => {
  if (Array.isArray(parsed)) {
    const { log } = parsed.find(({ success }) => !success) ?? {}
    const { message = '' }: ParsedLog = log ? JSON.parse(log) : {}
    return message
  } else if (typeof parsed === 'object') {
    const { message = '' } = parsed
    return message
  }

  return ''
}

export const stringify = (object: object): string | undefined => {
  const string = JSON.stringify(compact(object))
  return string === '{}' ? undefined : string
}

const compact = (object: object): object =>
  Object.entries(object).reduce(
    (acc, [key, value]) => Object.assign({}, acc, value && { [key]: value }),
    {}
  )

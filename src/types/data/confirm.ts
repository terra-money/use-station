import { FormUI, FieldAttrs, Options } from '..'
import { Card, Coin, DisplayCoin, ConfirmLedger } from '..'

export interface ConfirmProps {
  url: string
  payload?: object
  memo?: string
  contents: ConfirmContent[]
  feeDenom: { defaultValue: string; list: string[] }
  validate: (fee: Coin) => boolean
  submitLabels: string[]
  message: string
  warning?: string
  cancel?: () => void
}

export interface ConfirmContent {
  name: string
  text?: string
  displays?: DisplayCoin[]
}

export interface ConfirmPage extends Pick<ConfirmProps, 'contents'> {
  fee: {
    label: string
    status?: string
    select: {
      options: Options
      attrs: FieldAttrs
      setValue: (value: string) => void
    }
    input: {
      attrs: FieldAttrs
      setValue: (value: string) => void
    }
    message?: string
  }
  form: FormUI
  ledger?: ConfirmLedger
  result?: Card
}

export interface Base {
  from: string
  chain_id: string
  account_number: string
  sequence: string
}

export type Sign = (params: {
  tx: string
  base: Base
  password: string
}) => Promise<string>

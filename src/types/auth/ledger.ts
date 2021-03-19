import { Card, ButtonAttrs } from '..'

export interface ConfirmLedger {
  buttons?: { bip: number; desc: string; onClick: () => void }[]
  card: Card
  retry?: Retry
}

export interface Retry {
  attrs: ButtonAttrs
  message: string
}

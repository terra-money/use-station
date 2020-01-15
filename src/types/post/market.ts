import { DisplayCoin } from '..'

export interface SwapUI {
  message: string
  max: { title: string; display: DisplayCoin }
  spread: { title: string; text?: string; value: string; unit?: string }
  receive: { title: string; value: string; unit?: string }
}

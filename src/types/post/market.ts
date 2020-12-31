import { DisplayCoin } from '..'

export interface SwapUI {
  message: string
  max: { title: string; display: DisplayCoin; attrs: { onClick: () => void } }
  spread: { title: string; text?: string; value: string; unit?: string }
}

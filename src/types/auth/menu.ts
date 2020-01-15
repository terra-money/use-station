import { FormUI, Field, Card, ButtonAttrs, BankData } from '..'

export interface AuthMenu {
  ui: { mobile: Card; web: AuthMenuUI }
  list: AuthMenuItem[]
}

export type AuthMenuKey =
  | 'recover'
  | 'signUp'
  | 'signIn'
  | 'signInWithAddress'
  | 'signInWithLedger'

export interface AuthMenuUI {
  signInWithLedger: [string, string]
  tooltip: { label: string; link: string; i18nKey: string }
}

export interface AuthMenuItem {
  label: string
  key: AuthMenuKey
}

/* Sign up */
export type Seed = string[]
export type Bip = 118 | 330
export type BipList = [Bip, Bip]
export type SignUpFn = (bip?: Bip) => Promise<void>
export type SignUpStep = 'select' | 'confirm'

export interface SignUp {
  form: FormUI
  mnemonics: Mnemonics
  warning: SignUpWarning
  error?: Error
  next?: SignUpNext
  reset?: () => void
}

export interface SignUpWarning {
  tooltip: [string, string]
  i18nKey: string
}

export interface Mnemonics {
  title: string
  fields: Field[]
  paste: (clipboard: string, index: number) => void
  suggest: (input: string) => string[]
}

export interface SignUpNext {
  step: SignUpStep
  seed: Seed
  accounts?: Account[]
  signUp: SignUpFn
}

export interface Account {
  bip: Bip
  address: string
  bank: BankData
}

export type Generate = (
  phrase: string,
  list: BipList
) => Promise<[string, string]>

export interface SelectAccount {
  form?: FormUI<AccountUI>
  result?: Card
}

export interface AccountUI {
  bip: Bip
  badges: string[]
  balances: string | string[]
}

export interface ConfirmSeed {
  form: FormUI
  hint: { label: string; onClick: (i: number) => void }[]
  result?: Card
}

/* SignIn */
export interface SignIn {
  form: FormUI
}

export interface SignInWithAddress {
  form: FormUI
}

export interface ManageAccounts {
  title: string
  delete: Card
}

export interface RecentAddresses {
  title: string
  deleteAll: string
  buttons: ButtonAttrs[]
}

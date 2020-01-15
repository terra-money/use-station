export type Address = string

export interface User {
  name?: string
  address: Address
  ledger?: boolean
}

export interface LocalUser extends User {
  name: string
}

export interface Auth {
  user?: User
  signIn: (user: User) => void
  signOut: () => void
}

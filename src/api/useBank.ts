import { BankAPI, BankData, User } from '../types'
import useFCD from './useFCD'

export default ({ address }: User): BankAPI => {
  const response = useFCD<BankData>({ url: `/v1/bank/${address}` })
  return response
}

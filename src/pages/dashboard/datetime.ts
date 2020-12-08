import { DateTime } from 'luxon'

// Fix the timezone miss-match issue on the mainnet
export const fix = (datetime: number): Date =>
  DateTime.fromMillis(datetime)
    .plus({ hour: 9 })
    .toJSDate()

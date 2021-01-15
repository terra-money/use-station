import { useEffect, useState } from 'react'
import { TFunction } from 'i18next'
import { Result } from '../types'
import { format, is } from '../utils'
import { times, min, ceil, percent } from '../utils/math'
import fcd from '../api/fcd'

type Response = Result<string>
const useFetchTax = (denom: string, t: TFunction) => {
  const [rate, setRate] = useState('0')
  const [cap, setCap] = useState('0')

  useEffect(() => {
    const fetchRate = async () => {
      const { data } = await fcd.get<Response>('/treasury/tax_rate')
      const { result } = data
      setRate(result)
    }

    fetchRate()
  }, [])

  useEffect(() => {
    const fetchCap = async () => {
      const { data } = await fcd.get<Response>(`/treasury/tax_cap/${denom}`)
      const { result } = data
      setCap(result)
    }

    const noTax = denom === 'uluna' || is.address(denom)
    !noTax && denom && fetchCap()
  }, [denom])

  return {
    getCoin: (amount: string) => ({
      amount: ceil(min([times(amount, rate), cap])),
      denom
    }),
    label: t('Post:Send:Tax ({{percent}}, Max {{max}})', {
      percent: percent(rate, 3),
      max: format.coin({ amount: cap, denom })
    })
  }
}

export default useFetchTax

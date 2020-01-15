import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AssetsPage, BankData, Schedule, User } from '../../types'
import { format } from '../../utils'
import { percent, gte } from '../../utils/math'
import useBank from '../../api/useBank'

const SMALL = '1000000'

interface Config {
  hideSmall: boolean
}

export default (user: User, config?: Config): AssetsPage => {
  const { t } = useTranslation()
  const bank = useBank(user)
  const [hideSmall, setHideSmall] = useState<boolean>(!!config?.hideSmall)

  const render = ({ balance, vesting }: BankData) => ({
    card:
      !balance.length && !vesting.length
        ? {
            title: t('Page:Bank:Account empty'),
            content: t("Page:Bank:This account doesn't hold any coins yet")
          }
        : undefined,
    available: !balance.length
      ? undefined
      : {
          title: t('Page:Bank:Available'),
          list: balance
            .filter(({ available }) => !hideSmall || gte(available, SMALL))
            .map(({ available, denom }) => ({
              denom,
              display: format.display({ amount: available, denom })
            })),
          hideSmall: {
            label: t('Page:Bank:Hide small balances'),
            checked: hideSmall,
            toggle: () => setHideSmall(v => !v)
          },
          send: t('Post:Send:Send')
        },
    vesting: !vesting.length
      ? undefined
      : {
          title: t('Page:Bank:Vesting schedule'),
          desc: t(
            'Page:Bank:This displays your investment with Terra. Vested Luna can be delegated in the meantime.'
          ),
          list: vesting.map(({ total, denom, schedules }) => ({
            display: format.display({ amount: total, denom }),
            schedule: schedules.map(item => getSchedule(item, denom))
          }))
        }
  })

  const getSchedule = (schedule: Schedule, denom: string) => {
    const { amount, startTime, endTime, ratio, freedRate } = schedule
    const now = new Date().getTime()
    const released = endTime < now
    const releasing = startTime < now && now < endTime

    return {
      released,
      releasing,
      percent: percent(ratio),
      display: format.display({ amount, denom }),
      status: released
        ? t('Page:Bank:Released')
        : releasing
        ? t('Page:Bank:Releasing')
        : t('Page:Bank:Release on'),
      duration: [startTime, endTime].map(t => `${toISO(t)}`).join(' ~ '),
      width: percent(freedRate, 0)
    }
  }

  return Object.assign(
    { address: { title: t('Page:Bank:My wallet'), content: user.address } },
    bank,
    bank.data && { ui: render(bank.data) }
  )
}

/* helper */
const toISO = (date: number) => format.date(new Date(date).toISOString())

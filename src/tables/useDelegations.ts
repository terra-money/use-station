import { useTranslation } from 'react-i18next'
import { DelegationsPage, DelegationsUI, DelegationsData } from '../types'
import { format, gt } from '../utils'
import useFCD from '../api/useFCD'
import useFinder from '../hooks/useFinder'

export default (
  address: string,
  { page }: { page?: number }
): DelegationsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const url = `/v1/staking/validators/${address}/delegations`
  const params = { page: page ?? 1 }
  const response = useFCD<DelegationsData>({ url, params })

  /* render */
  const render = (data: DelegationsData): DelegationsUI => {
    const { totalCnt, page, limit, events } = data
    return Object.assign(
      {
        pagination: {
          totalCnt: Number(totalCnt),
          page: Number(page),
          limit: Number(limit),
        },
      },
      !events || !gt(totalCnt, 0)
        ? {
            card: {
              content: t('Page:Staking:No events'),
            },
          }
        : {
            table: {
              headings: {
                hash: t('Common:Tx:Tx Hash'),
                type: t('Common:Type'),
                change: t('Common:Change'),
                date: t('Common:Time'),
              },

              contents: events.map(({ txhash, type, amount, timestamp }) => ({
                link: getLink!({ q: 'tx', v: txhash }),
                hash: format.truncate(txhash, [6, 6]),
                type: t('Post:Staking:' + type),
                display: format.display(amount),
                date: format.date(timestamp),
              })),
            },
          }
    )
  }

  return Object.assign(
    { title: t('Page:Staking:Event log') },
    response,
    response.data && { ui: render(response.data) }
  )
}

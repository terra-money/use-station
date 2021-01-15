import { useTranslation } from 'react-i18next'
import { ClaimsPage, ClaimsUI, ClaimsData } from '../types'
import { format, gt } from '../utils'
import useFCD from '../api/useFCD'
import useFinder from '../hooks/useFinder'

export default (address: string, { page }: { page?: number }): ClaimsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const url = `/v1/staking/validators/${address}/claims`
  const params = { page: page ?? 1 }
  const response = useFCD<ClaimsData>({ url, params })

  /* render */
  const render = ({ totalCnt, page, limit, claims }: ClaimsData): ClaimsUI =>
    Object.assign(
      {
        pagination: {
          totalCnt: Number(totalCnt),
          page: Number(page),
          limit: Number(limit),
        },
      },
      !claims || !gt(totalCnt, 0)
        ? {
            card: {
              content: t(
                'Page:Staking:This validator has no claim history yet'
              ),
            },
          }
        : {
            table: {
              headings: {
                hash: t('Common:Tx:Tx Hash'),
                type: t('Common:Type'),
                displays: t('Common:Tx:Amount'),
                date: t('Common:Time'),
              },

              contents: claims.map(({ txhash, type, amounts, timestamp }) => ({
                link: getLink!({ q: 'tx', v: txhash }),
                hash: format.truncate(txhash, [6, 6]),
                type: t('Page:Staking:' + type),
                displays: amounts?.map((coin) => format.display(coin)) ?? [],
                date: format.date(timestamp),
              })),
            },
          }
    )

  return Object.assign(
    { title: t('Page:Staking:Claim log') },
    response,
    response.data && { ui: render(response.data) }
  )
}

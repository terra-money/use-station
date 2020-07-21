import { useTranslation } from 'react-i18next'
import { ContractsPage, ContractsData } from '../../types'
import { gt, format } from '../../utils'
import useFCD from '../../api/useFCD'
import useFinder from '../../hooks/useFinder'

interface Params {
  page?: number
  owner?: string
  search?: string
}

export default (params: Params): ContractsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const url = '/v1/wasm/contracts'
  const response = useFCD<ContractsData>({ url, params })

  /* render */
  const render = ({ totalCnt, page, limit, contracts }: ContractsData) =>
    Object.assign(
      {
        pagination: {
          totalCnt: Number(totalCnt),
          page: Number(page),
          limit: Number(limit)
        }
      },
      !gt(totalCnt, 0)
        ? {
            card: {
              title: t('Page:Contracts:No contracts'),
              content: t('Page:Contracts:No contracts yet')
            }
          }
        : {
            search: { placeholder: t('Page:Contracts:Search') },
            list: contracts.map(
              ({ contract_address, timestamp, code, info }) => ({
                address: contract_address,
                link: getLink?.({ q: 'account', v: contract_address }),
                date: format.date(timestamp, { toLocale: true }),
                code: {
                  label: t('Post:Contracts:Code'),
                  value: code.info.name
                },
                contract: {
                  label: t('Page:Contracts:Contract'),
                  value: info.name
                },
                interact: t('Page:Contracts:Interact'),
                query: t('Page:Contracts:Query')
              })
            )
          }
    )

  return Object.assign(
    {
      create: { attrs: { children: t('Page:Contracts:Create') } },
      upload: { attrs: { children: t('Page:Contracts:Upload') } }
    },
    response,
    response.data && { ui: render(response.data) }
  )
}

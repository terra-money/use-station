import { useTranslation } from 'react-i18next'
import { ContractsPage, ContractsData } from '../../types'
import { gt } from '../../utils'
import useFCD from '../../api/useFCD'
import useFinder from '../../hooks/useFinder'
import renderContract from './renderContract'

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
          limit: Number(limit),
        },
      },
      !gt(totalCnt, 0)
        ? {
            card: {
              title: t('Page:Contracts:No contracts'),
              content: t('Page:Contracts:No contracts yet'),
            },
          }
        : {
            search: { placeholder: t('Page:Contracts:Search') },
            list: contracts.map((contract) =>
              renderContract(contract, getLink, t)
            ),
          }
    )

  return Object.assign(
    {
      create: { attrs: { children: t('Page:Contracts:Create') } },
      upload: { attrs: { children: t('Page:Contracts:Upload') } },
    },
    response,
    response.data && { ui: render(response.data) }
  )
}

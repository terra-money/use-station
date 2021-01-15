import { useTranslation } from 'react-i18next'
import { TxsPage, TxType, TxsData, User } from '../../types'
import useFCD from '../../api/useFCD'
import { format, gt } from '../../utils'
import useFinder from '../../hooks/useFinder'

/** tabs */
export const useTxTypes = (): { key: TxType; label: string }[] => {
  const { t } = useTranslation()

  return [
    { key: '', label: t('Common:All') },
    { key: 'send', label: t('Page:Txs:Send') },
    { key: 'receive', label: t('Page:Txs:Receive') },
    { key: 'staking', label: t('Page:Txs:Staking') },
    { key: 'market', label: t('Page:Txs:Swap') },
    { key: 'governance', label: t('Page:Txs:Governance') },
    { key: 'contract', label: t('Page:Txs:Contract') },
  ]
}

export default (
  { address }: User,
  { type, page }: { type?: TxType; page?: number }
): TxsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const url = '/v1/msgs'
  const params = { account: address, action: type, page: page ?? 1 }
  const response = useFCD<TxsData>({ url, params })

  /* render */
  const render = ({ totalCnt, page, limit, txs }: TxsData) =>
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
              title: t('Page:Txs:No transaction history'),
              content: t(
                "Page:Txs:Looks like you haven't made any transaction yet"
              ),
            },
          }
        : {
            list: txs.map(({ chainId, txhash, timestamp, msgs, ...tx }) => {
              const { success, txFee, memo, errorMessage } = tx
              return {
                link: getLink!({ network: chainId, q: 'tx', v: txhash }),
                hash: txhash,
                date: format.date(timestamp, { toLocale: true }),
                messages: msgs.map(({ tag, text }) => ({
                  tag: t('Page:Txs:' + tag),
                  text,
                  success,
                })),
                details: [
                  {
                    title: t('Common:Tx:Tx fee'),
                    content: txFee?.map((coin) => format.coin(coin)).join(', '),
                  },
                  { title: t('Common:Tx:Memo'), content: memo },
                  { title: t('Common:Tx:Log'), content: errorMessage },
                ].filter(({ content }) => !!content),
              }
            }),
          }
    )

  return Object.assign(
    {},
    response,
    response.data && { ui: render(response.data) }
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TxsPage, TxType, User, Tx } from '../../types'
import useFCD from '../../api/useFCD'
import { format } from '../../utils'
import useFinder from '../../hooks/useFinder'
import { LIMIT } from '../constants'

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
  { type }: { type?: TxType; offset?: number }
): TxsPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const [txs, setTxs] = useState<Tx[]>([])
  const [offset, setOffset] = useState<number>()
  const [done, setDone] = useState(false)

  const url = '/v1/msgs'
  const params = { account: address, action: type, limit: LIMIT, offset }
  const response = useFCD<{ txs: Tx[] }>({ url, params })
  const { data } = response

  useEffect(() => {
    if (data) {
      setTxs((txs) => [...txs, ...data.txs])
      setDone(data.txs.length < LIMIT)
    }
  }, [data])

  const more =
    txs.length && !done ? () => setOffset(txs[txs.length - 1].id) : undefined

  /* render */
  const ui =
    !response.loading && !txs.length
      ? {
          card: {
            title: t('Page:Txs:No transaction history'),
            content: t(
              "Page:Txs:Looks like you haven't made any transaction yet"
            ),
          },
        }
      : {
          more,
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

  return Object.assign({ ...response, ui })
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dictionary } from 'ramda'
import { VotesPage, VotesData, VoteItem } from '../types'
import { sum, toNumber } from '../utils'
import useFinder from '../hooks/useFinder'
import useFCD from '../api/useFCD'
import { getVoter } from '../pages/governance/helpers'

const LIMIT = 5

/** tabs */
export const useVoteOptions = (
  count: Dictionary<number>
): { key: string; label: string }[] => {
  const { Yes, No, NoWithVeto, Abstain } = count
  const total = toNumber(sum([Yes, No, NoWithVeto, Abstain]))
  const { t } = useTranslation()

  return [
    {
      key: '',
      label: `${t('Common:All')} (${total})`,
    },
    {
      key: 'Yes',
      label: `${t('Page:Governance:Yes')} (${Yes})`,
    },
    {
      key: 'No',
      label: `${t('Page:Governance:No')} (${No})`,
    },
    {
      key: 'NoWithVeto',
      label: `${t('Page:Governance:NoWithVeto')} (${NoWithVeto})`,
    },
    {
      key: 'Abstain',
      label: `${t('Page:Governance:Abstain')} (${Abstain})`,
    },
  ]
}

interface Params {
  id: string
  option: string
}

export default ({ id, option }: Params): VotesPage => {
  const { t } = useTranslation()
  const getLink = useFinder()

  /* api */
  const [votes, setVotes] = useState<VoteItem[]>([])
  const [offset, setOffset] = useState<number>()
  const [next, setNext] = useState<number>()
  const [done, setDone] = useState(false)

  const url = `/v1/gov/proposals/${id}/votes`
  const params = { option, limit: LIMIT, offset }
  const response = useFCD<VotesData>({ url, params })
  const { data } = response

  useEffect(() => {
    if (data) {
      setVotes((votes) => [...votes, ...data.votes])
      setNext(data.next)
      setDone(data.votes.length < LIMIT)
    }
  }, [data])

  const more = votes.length && !done ? () => setOffset(next) : undefined

  /* render */
  const ui = !votes.length
    ? {
        card: {
          content: t('Page:Governance:No votes yet'),
        },
      }
    : {
        more,
        table: {
          headings: {
            voter: t('Page:Governance:Voter'),
            answer: t('Page:Governance:Answer'),
          },
          contents: votes.map(({ voter, answer }: VoteItem) => ({
            voter: getVoter(voter, getLink),
            answer: t('Page:Governance:' + answer),
          })),
        },
      }

  return { ...response, title: '', ui }
}

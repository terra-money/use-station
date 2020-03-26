import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './lang/en'
import zh from './lang/zh.json'
import fr from './lang/fr.json'
import ko from './lang/ko.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      fr: { translation: fr },
      ko: { translation: ko }
    },
    keySeparator: ':'
  })

/* types */
export * from './types'

/* component */
export { default as ErrorBoundary } from './components/ErrorBoundary'

/* utility */
export * from './utils'
export { default as useText } from './lang/useText'
export { default as useInfo } from './lang/useInfo'
export { Trans } from 'react-i18next'

/* contexts */
export * from './contexts/ConfigContext'
export * from './contexts/AuthContext'
export { default as createContext } from './contexts/createContext'
export { default as useSocket } from './contexts/useSocket'
export { Languages, getLang } from './contexts/useLang'

/* hooks:api */
export { default as useBank } from './api/useBank'

/* hooks:auth */
export { default as useAuthMenu } from './auth/useAuthMenu'
export { default as useSignUp } from './auth/useSignUp'
export { default as useSelectAccount } from './auth/useSelectAccount'
export { default as useConfirmSeed } from './auth/useConfirmSeed'
export { default as useSignIn } from './auth/useSignIn'
export { default as useSignInWithAddress } from './auth/useSignInWithAddress'
export { default as useSignInWithLedger } from './auth/useSignInWithLedger'
export { default as useManageAccounts } from './auth/useManageAccounts'
export { default as useRecentAddresses } from './auth/useRecentAddresses'

/* hooks:pages */
export { default as useMenu } from './pages/useMenu'
export { default as useDashboard } from './pages/dashboard/useDashboard'
export { default as useChart } from './pages/dashboard/useChart'
export { default as useChartCard } from './pages/dashboard/useChartCard'
export { default as useAssets } from './pages/bank/useAssets'
export { default as useTxs } from './pages/txs/useTxs'
export { useTxTypes } from './pages/txs/useTxs'
export { default as useStaking } from './pages/staking/useStaking'
export { default as useValidator } from './pages/staking/useValidator'
export { default as useMarket } from './pages/market/useMarket'
export { default as usePrice } from './pages/market/usePrice'
export { default as useRate } from './pages/market/useRate'
export { default as useGovernance } from './pages/governance/useGovernance'
export { useProposalStatus } from './pages/governance/useGovernance'
export { default as useProposal } from './pages/governance/useProposal'

/* hooks:tables */
export { default as useClaims } from './tables/useClaims'
export { default as useDelegations } from './tables/useDelegations'
export { default as useDelegators } from './tables/useDelegators'
export { default as useDepositors } from './tables/useDepositors'
export { default as useVotes } from './tables/useVotes'
export { useVoteOptions } from './tables/useVotes'

/* hooks:post */
export { default as useConfirm } from './post/useConfirm'
export { default as useSend } from './post/useSend'
export { default as useDelegate } from './post/useDelegate'
export { default as useWithdraw } from './post/useWithdraw'
export { default as useSwap } from './post/useSwap'
export { default as usePropose } from './post/usePropose'
export { default as useDeposit } from './post/useDeposit'
export { default as useVote } from './post/useVote'

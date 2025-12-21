import { useEffect, useCallback } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { DAO_ABI, DAO_CONTRACT_ADDRESS, type ProposalCreatedEvent, type ProposalExecutedEvent } from '../contracts/dao'

interface UseDAOEventsParams {
  onProposalCreated?: (event: ProposalCreatedEvent) => void
  onProposalExecuted?: (event: ProposalExecutedEvent) => void
}

export const useDAOEvents = ({ onProposalCreated, onProposalExecuted }: UseDAOEventsParams) => {
  const setupListeners = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    const provider = new BrowserProvider(window.ethereum)
    const contract = new Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider)

    return contract
  }, [])

  useEffect(() => {
    let contract: Contract | null = null

    const initListeners = async () => {
      contract = await setupListeners()
      if (!contract) return

      // Listen for ProposalCreated events
      if (onProposalCreated) {
        contract.on('ProposalCreated', (id: bigint, creator: string, description: string) => {
          onProposalCreated({ id, creator, description })
        })
      }

      // Listen for ProposalExecuted events
      if (onProposalExecuted) {
        contract.on('ProposalExecuted', (id: bigint, executor: string) => {
          onProposalExecuted({ id, executor })
        })
      }
    }

    initListeners()

    // Cleanup listeners on unmount
    return () => {
      if (contract) {
        contract.removeAllListeners('ProposalCreated')
        contract.removeAllListeners('ProposalExecuted')
      }
    }
  }, [setupListeners, onProposalCreated, onProposalExecuted])
}

export default useDAOEvents

import { useWallet } from '../../contexts/WalletContext'
import { useTransaction } from '../../hooks/useTransaction'
import { proposalsAPI, ProposalState } from '../../services/api'
import TransactionStatus from '../common/TransactionStatus'

interface QueueButtonProps {
  proposalId: string
  proposalState?: ProposalState
  onSuccess?: () => void
}

export function QueueButton({ proposalId, proposalState, onSuccess }: QueueButtonProps) {
  const { account, provider, isConnected } = useWallet()
  const { status, error, txHash, executeTransaction, reset } = useTransaction()

  // Only show button if proposal is in Succeeded state
  if (proposalState !== ProposalState.Succeeded) {
    return null
  }

  const handleQueue = async () => {
    if (!account || !provider) {
      alert('Please connect your wallet first')
      return
    }

    if (!confirm('Are you sure you want to queue this proposal for execution?')) {
      return
    }

    try {
      reset()

      // Prepare transaction via backend
      const preparedTx = await proposalsAPI.prepareQueueTransaction({
        proposalId,
        userAddress: account
      })

      // Execute transaction
      await executeTransaction(preparedTx, provider)

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Failed to queue proposal:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="queue-action">
        <p className="muted">Connect wallet to queue this proposal</p>
      </div>
    )
  }

  return (
    <div className="queue-action">
      <button
        className="queue-button"
        onClick={handleQueue}
        disabled={status === 'pending' || status === 'confirming'}
      >
        {status === 'pending' || status === 'confirming' ? 'Queuing...' : 'Queue Proposal'}
      </button>

      <TransactionStatus status={status} error={error} txHash={txHash} />
    </div>
  )
}

export default QueueButton

import { useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { useTransaction } from '../../hooks/useTransaction'
import { proposalsAPI, VoteSupport } from '../../services/api'
import TransactionStatus from '../common/TransactionStatus'

interface VoteFormProps {
  proposalId: string
  onSuccess?: () => void
}

export function VoteForm({ proposalId, onSuccess }: VoteFormProps) {
  const { account, provider, isConnected } = useWallet()
  const { status, error, txHash, executeTransaction, reset } = useTransaction()
  const [reason, setReason] = useState('')
  const [selectedSupport, setSelectedSupport] = useState<VoteSupport | null>(null)
  const [showReasonInput, setShowReasonInput] = useState(false)

  const handleVote = async (support: VoteSupport) => {
    if (!account || !provider) {
      alert('Please connect your wallet first')
      return
    }

    setSelectedSupport(support)
    setShowReasonInput(true)
  }

  const submitVote = async () => {
    if (!account || !provider || selectedSupport === null) {
      return
    }

    try {
      reset()

      // Prepare transaction via backend
      const preparedTx = await proposalsAPI.prepareVoteTransaction({
        proposalId,
        support: selectedSupport,
        reason: reason.trim() || undefined,
        voterAddress: account
      })

      // Execute transaction
      await executeTransaction(preparedTx, provider)

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      setReason('')
      setShowReasonInput(false)
      setSelectedSupport(null)
    } catch (err) {
      console.error('Failed to vote:', err)
    }
  }

  const cancelVote = () => {
    setShowReasonInput(false)
    setSelectedSupport(null)
    setReason('')
    reset()
  }

  if (!isConnected) {
    return (
      <div className="voting-action">
        <p className="muted">Please connect your wallet to vote</p>
      </div>
    )
  }

  if (showReasonInput) {
    const supportLabels = {
      [VoteSupport.For]: 'For',
      [VoteSupport.Against]: 'Against',
      [VoteSupport.Abstain]: 'Abstain'
    }

    return (
      <div className="voting-action">
        <h3>
          Voting: {selectedSupport !== null ? supportLabels[selectedSupport] : ''}
        </h3>

        <div className="vote-reason-form">
          <label htmlFor="vote-reason">
            Reason (optional)
            <textarea
              id="vote-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you voting this way?"
              rows={3}
              disabled={status === 'pending' || status === 'confirming'}
            />
          </label>

          <div className="vote-actions">
            <button
              className="vote-button vote-submit"
              onClick={submitVote}
              disabled={status === 'pending' || status === 'confirming'}
            >
              {status === 'pending' || status === 'confirming' ? 'Submitting...' : 'Submit Vote'}
            </button>
            <button
              className="vote-button vote-cancel"
              onClick={cancelVote}
              disabled={status === 'pending' || status === 'confirming'}
            >
              Cancel
            </button>
          </div>
        </div>

        <TransactionStatus status={status} error={error} txHash={txHash} />
      </div>
    )
  }

  return (
    <div className="voting-action">
      <h3>Cast Your Vote</h3>
      <p className="muted">Choose your position on this proposal</p>

      <div className="vote-buttons">
        <button
          className="vote-button vote-for"
          onClick={() => handleVote(VoteSupport.For)}
          disabled={status === 'pending' || status === 'confirming'}
        >
          Vote For
        </button>

        <button
          className="vote-button vote-against"
          onClick={() => handleVote(VoteSupport.Against)}
          disabled={status === 'pending' || status === 'confirming'}
        >
          Vote Against
        </button>

        <button
          className="vote-button vote-abstain"
          onClick={() => handleVote(VoteSupport.Abstain)}
          disabled={status === 'pending' || status === 'confirming'}
        >
          Abstain
        </button>
      </div>

      <TransactionStatus status={status} error={error} txHash={txHash} />
    </div>
  )
}

export default VoteForm

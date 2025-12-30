import { useState, useEffect } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { useTransaction } from '../../hooks/useTransaction'
import { proposalsAPI, ProposalState } from '../../services/api'
import TransactionStatus from '../common/TransactionStatus'

interface ExecuteButtonProps {
  proposalId: string
  proposalState?: ProposalState
  etaSeconds?: string
  onSuccess?: () => void
}

export function ExecuteButton({ proposalId, proposalState, etaSeconds, onSuccess }: ExecuteButtonProps) {
  const { account, provider, isConnected } = useWallet()
  const { status, error, txHash, executeTransaction, reset } = useTransaction()
  const [canExecute, setCanExecute] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!etaSeconds || proposalState !== ProposalState.Queued) {
      setCanExecute(false)
      setTimeRemaining('')
      return
    }

    const eta = parseInt(etaSeconds, 10) * 1000 // Convert to milliseconds
    const now = Date.now()

    if (now >= eta) {
      setCanExecute(true)
      setTimeRemaining('')
      return
    }

    // Update countdown
    const updateCountdown = () => {
      const remaining = eta - Date.now()

      if (remaining <= 0) {
        setCanExecute(true)
        setTimeRemaining('')
      } else {
        setCanExecute(false)
        const seconds = Math.floor((remaining / 1000) % 60)
        const minutes = Math.floor((remaining / (1000 * 60)) % 60)
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24)
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24))

        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s`)
        } else {
          setTimeRemaining(`${seconds}s`)
        }
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [etaSeconds, proposalState])

  // Only show button if proposal is in Queued state
  if (proposalState !== ProposalState.Queued) {
    return null
  }

  const handleExecute = async () => {
    if (!account || !provider) {
      alert('Please connect your wallet first')
      return
    }

    if (!canExecute) {
      alert('The timelock delay has not passed yet. Please wait before executing.')
      return
    }

    if (!confirm('Are you sure you want to execute this proposal?')) {
      return
    }

    try {
      reset()

      // Prepare transaction via backend
      const preparedTx = await proposalsAPI.prepareExecuteTransaction({
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
      console.error('Failed to execute proposal:', err)
    }
  }

  if (!isConnected) {
    return (
      <div className="execute-action">
        <p className="muted">Connect wallet to execute this proposal</p>
      </div>
    )
  }

  return (
    <div className="execute-action">
      {!canExecute && timeRemaining && (
        <p className="muted">
          Timelock: {timeRemaining} remaining
        </p>
      )}

      <button
        className="execute-button"
        onClick={handleExecute}
        disabled={!canExecute || status === 'pending' || status === 'confirming'}
      >
        {status === 'pending' || status === 'confirming'
          ? 'Executing...'
          : canExecute
          ? 'Execute Proposal'
          : 'Waiting for Timelock'}
      </button>

      <TransactionStatus status={status} error={error} txHash={txHash} />
    </div>
  )
}

export default ExecuteButton

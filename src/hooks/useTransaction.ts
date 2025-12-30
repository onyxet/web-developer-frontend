import { useState, useCallback } from 'react'
import type { BrowserProvider, TransactionReceipt } from 'ethers'
import type { PreparedTransaction } from '../services/api'

export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface UseTransactionReturn {
  status: TransactionStatus
  error: string | null
  txHash: string | null
  receipt: TransactionReceipt | null
  executeTransaction: (preparedTx: PreparedTransaction, provider: BrowserProvider) => Promise<TransactionReceipt>
  reset: () => void
}

/**
 * Parse transaction error into user-friendly message
 */
function parseTransactionError(err: unknown): string {
  if (err instanceof Error) {
    const message = err.message.toLowerCase()

    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'Transaction was rejected'
    }

    if (message.includes('insufficient funds')) {
      return 'Insufficient funds for gas'
    }

    if (message.includes('rate limit')) {
      return 'RPC rate limit reached. Please try again in a moment.'
    }

    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.'
    }

    // Try to extract revert reason
    const revertMatch = err.message.match(/revert (.+?)(?:\n|$)/)
    if (revertMatch) {
      return `Transaction failed: ${revertMatch[1]}`
    }

    // Return the original error message if no specific pattern matches
    return err.message
  }

  return 'Transaction failed. Please try again.'
}

/**
 * Hook for executing blockchain transactions with status tracking
 *
 * @example
 * ```typescript
 * const { executeTransaction, status, error, txHash } = useTransaction()
 *
 * const handleVote = async () => {
 *   try {
 *     const preparedTx = await proposalsAPI.prepareVoteTransaction({ ... })
 *     await executeTransaction(preparedTx, provider)
 *     // Transaction successful
 *   } catch (err) {
 *     // Handle error (already tracked in hook)
 *   }
 * }
 * ```
 */
export function useTransaction(): UseTransactionReturn {
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<TransactionReceipt | null>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
    setReceipt(null)
  }, [])

  const executeTransaction = useCallback(
    async (preparedTx: PreparedTransaction, provider: BrowserProvider): Promise<TransactionReceipt> => {
      setStatus('pending')
      setError(null)
      setTxHash(null)
      setReceipt(null)

      try {
        // Get signer from provider
        const signer = await provider.getSigner()

        // Send transaction
        const tx = await signer.sendTransaction({
          to: preparedTx.to,
          data: preparedTx.data,
          value: preparedTx.value || '0',
          gasLimit: preparedTx.gasLimit
        })

        setTxHash(tx.hash)
        setStatus('confirming')

        // Wait for transaction to be mined
        const txReceipt = await tx.wait()

        if (!txReceipt) {
          throw new Error('Transaction receipt is null')
        }

        if (txReceipt.status === 0) {
          throw new Error('Transaction failed (status 0)')
        }

        setReceipt(txReceipt)
        setStatus('success')
        return txReceipt
      } catch (err) {
        const message = parseTransactionError(err)
        setError(message)
        setStatus('error')
        throw err
      }
    },
    []
  )

  return {
    status,
    error,
    txHash,
    receipt,
    executeTransaction,
    reset
  }
}

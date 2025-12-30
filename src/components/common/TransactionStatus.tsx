import type { TransactionStatus as TxStatus } from '../../hooks/useTransaction'

interface TransactionStatusProps {
  status: TxStatus
  error?: string | null
  txHash?: string | null
}

const BLOCK_EXPLORER_URL = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io'

export function TransactionStatus({ status, error, txHash }: TransactionStatusProps) {
  if (status === 'idle') {
    return null
  }

  return (
    <div className="transaction-status">
      {status === 'pending' && (
        <div className="status-message pending">
          <p>⏳ Please sign the transaction in your wallet...</p>
        </div>
      )}

      {status === 'confirming' && (
        <div className="status-message pending">
          <p>⏳ Confirming transaction...</p>
          {txHash && (
            <p className="muted">
              <a
                href={`${BLOCK_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash-link"
              >
                View on Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </p>
          )}
        </div>
      )}

      {status === 'success' && (
        <div className="status-message success">
          <p>✅ Transaction confirmed successfully!</p>
          {txHash && (
            <p className="muted">
              <a
                href={`${BLOCK_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash-link"
              >
                View on Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="status-message error">
          <p>❌ Transaction failed</p>
          {error && <p className="error-message">{error}</p>}
          {txHash && (
            <p className="muted">
              <a
                href={`${BLOCK_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash-link"
              >
                View on Explorer: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default TransactionStatus

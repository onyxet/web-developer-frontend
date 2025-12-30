import { FormEvent, useState } from 'react'
import { type ProposalCreatedEvent } from '../contracts/dao'
import { useDAOEvents } from '../hooks/useDAOEvents'
import { useWallet } from '../contexts/WalletContext'
import { proposalsAPI } from '../services/api'

type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface CreateProposalProps {
  onProposalCreated?: () => void
}

export const CreateProposal = ({ onProposalCreated }: CreateProposalProps) => {
  const { account, provider, isConnected } = useWallet()
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Listen for ProposalCreated events
  useDAOEvents({
    onProposalCreated: (_event: ProposalCreatedEvent) => {
      if (status === 'confirming') {
        setStatus('success')
        if (onProposalCreated) {
          onProposalCreated()
        }
      }
    }
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validation
    if (!description.trim()) {
      setError('Опис пропозиції є обов\'язковим')
      return
    }

    if (!isConnected || !provider || !account) {
      setError('Будь ласка, підключіть гаманець')
      return
    }

    setStatus('pending')
    setError(null)
    setTxHash(null)

    try {
      // Call API to prepare proposal transaction and check voting power
      const response = await proposalsAPI.createProposal({
        proposerAddress: account,
        targets: ['0x0000000000000000000000000000000000000000'],
        values: ['0'],
        calldatas: ['0x'],
        description
      })

      // Check if user has sufficient voting power
      if (!response.success) {
        setError(response.message || response.error || 'Не вдалося створити пропозицію')
        setStatus('error')
        return
      }

      // User has voting power, now send the transaction
      if (!response.transactionData) {
        setError('Не отримано даних транзакції')
        setStatus('error')
        return
      }

      const signer = await provider.getSigner()

      // Send transaction
      const tx = await signer.sendTransaction({
        to: response.transactionData.to,
        data: response.transactionData.data
      })

      setTxHash(tx.hash)
      setStatus('confirming')

      // Wait for confirmation
      await tx.wait()

      // Event listener will update status to 'success'
      // and call onProposalCreated callback
      setDescription('')
    } catch (err) {
      let message = 'Не вдалося створити пропозицію'

      if (err instanceof Error) {
        // Check for user rejection
        if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          message = 'Транзакцію відхилено користувачем'
        }
        // Check for insufficient funds
        else if (err.message.includes('insufficient funds')) {
          message = 'Недостатньо коштів для оплати gas'
        }
        // Check for rate limiting
        else if (err.message.includes('rate limit') || err.message.includes('UNKNOWN_ERROR')) {
          message = 'RPC провайдер обмежує запити. Спробуйте через декілька секунд або змініть мережу.'
        }
        else {
          message = err.message
        }
      }

      setError(message)
      setStatus('error')
    }
  }

  return (
    <section className="create-proposal">
      <h2>Створити пропозицію</h2>
      <p className="muted">Заповніть форму нижче, щоб створити нову пропозицію для голосування</p>

      {isConnected && (
        <div className="status-message success" style={{ marginBottom: '16px' }}>
          <p>✓ Будь-хто з правом голосу може створювати пропозиції</p>
          <p className="muted" style={{ marginTop: '8px', fontSize: '0.9em' }}>
            Ваш гаманець: {account}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">Опис пропозиції:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введіть опис вашої пропозиції..."
            rows={4}
            disabled={status === 'pending' || status === 'confirming'}
            required
          />
        </div>

        <button type="submit" disabled={status === 'pending' || status === 'confirming' || !description.trim() || !isConnected}>
          {status === 'pending' ? 'Перевірка права голосу...' : status === 'confirming' ? 'Підтвердження...' : 'Створити'}
        </button>
      </form>

      {status === 'pending' && (
        <div className="status-message pending">
          <p>Очікування підписання транзакції у MetaMask...</p>
          <p className="muted" style={{ marginTop: '8px' }}>Перевірте, чи відкрилося вікно MetaMask</p>
          <button
            onClick={() => {
              setStatus('idle')
              setError('Транзакцію скасовано користувачем')
            }}
            style={{ marginTop: '12px' }}
          >
            Скасувати
          </button>
        </div>
      )}

      {status === 'confirming' && (
        <div className="status-message pending">
          <p>Очікування підтвердження...</p>
          {txHash && <p className="muted">Hash: {txHash}</p>}
        </div>
      )}

      {status === 'success' && (
        <div className="status-message success">
          <p>Пропозицію успішно створено!</p>
          {txHash && <p className="muted">Hash: {txHash}</p>}
        </div>
      )}

      {status === 'error' && error && (
        <div className="status-message error">
          <p>{error}</p>
        </div>
      )}
    </section>
  )
}

export default CreateProposal

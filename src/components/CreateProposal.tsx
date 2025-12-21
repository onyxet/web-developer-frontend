import { FormEvent, useState, useEffect } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { DAO_ABI, DAO_CONTRACT_ADDRESS, type ProposalCreatedEvent } from '../contracts/dao'
import { useDAOEvents } from '../hooks/useDAOEvents'

type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface CreateProposalProps {
  onProposalCreated?: () => void
}

export const CreateProposal = ({ onProposalCreated }: CreateProposalProps) => {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [isCheckingOwner, setIsCheckingOwner] = useState(true)

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

  // Check if current user is owner
  useEffect(() => {
    const checkOwner = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setIsCheckingOwner(false)
        return
      }

      if (!DAO_CONTRACT_ADDRESS || DAO_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        setIsCheckingOwner(false)
        return
      }

      try {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_accounts', [])

        if (!accounts || accounts.length === 0) {
          setIsOwner(false)
          setIsCheckingOwner(false)
          return
        }

        const contract = new Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider)
        const owner = await contract.owner()
        setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase())
      } catch (err) {
        console.error('Error checking owner:', err)
        setIsOwner(false)
      } finally {
        setIsCheckingOwner(false)
      }
    }

    checkOwner()

    // Re-check when account changes
    const handleAccountsChanged = () => {
      checkOwner()
    }

    if (window.ethereum) {
      window.ethereum.on?.('accountsChanged', handleAccountsChanged)
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validation
    if (!description.trim()) {
      setError('Опис пропозиції є обов\'язковим')
      return
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Будь ласка, встановіть MetaMask')
      return
    }

    // Check if DAO contract address is configured
    if (!DAO_CONTRACT_ADDRESS || DAO_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('DAO контракт не налаштовано. Будь ласка, встановіть реальну адресу DAO контракту у .env файлі')
      return
    }

    setStatus('pending')
    setError(null)
    setTxHash(null)

    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer)

      // Call createProposal with timeout
      const txPromise = contract.createProposal(description)

      // Add timeout for user response (60 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Транзакцію не підписано протягом 60 секунд')), 60000)
      })

      const tx = await Promise.race([txPromise, timeoutPromise])
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
        // Check for rate limiting
        if (err.message.includes('rate limit') || err.message.includes('UNKNOWN_ERROR')) {
          message = 'RPC провайдер обмежує запити. Спробуйте через декілька секунд або змініть мережу.'
        }
        // Check for user rejection
        else if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          message = 'Транзакцію відхилено користувачем'
        }
        // Check for insufficient funds
        else if (err.message.includes('insufficient funds')) {
          message = 'Недостатньо коштів для оплати gas'
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

      {isCheckingOwner && <p className="muted">Перевірка прав доступу...</p>}

      {!isCheckingOwner && !isOwner && (
        <div className="status-message error">
          <p>⚠️ Тільки власник контракту може створювати пропозиції</p>
          <p className="muted">Підключіть гаманець власника контракту</p>
        </div>
      )}

      {!isCheckingOwner && isOwner && (
        <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">Опис пропозиції:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Введіть опис вашої пропозиції..."
            rows={4}
            disabled={status === 'pending'}
            required
          />
        </div>

          <button type="submit" disabled={status === 'pending' || !description.trim()}>
            {status === 'pending' ? 'Створення...' : 'Створити'}
          </button>
        </form>
      )}

      {!isCheckingOwner && isOwner && status === 'pending' && (
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

      {!isCheckingOwner && isOwner && status === 'confirming' && (
        <div className="status-message pending">
          <p>Очікування підтвердження...</p>
          {txHash && <p className="muted">Hash: {txHash}</p>}
        </div>
      )}

      {!isCheckingOwner && isOwner && status === 'success' && (
        <div className="status-message success">
          <p>Пропозицію успішно створено!</p>
          {txHash && <p className="muted">Hash: {txHash}</p>}
        </div>
      )}

      {!isCheckingOwner && isOwner && status === 'error' && error && (
        <div className="status-message error">
          <p>{error}</p>
        </div>
      )}
    </section>
  )
}

export default CreateProposal

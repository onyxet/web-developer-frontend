import { useCallback, useEffect, useState } from 'react'
import { BrowserProvider, Contract } from 'ethers'
import { DAO_ABI, DAO_CONTRACT_ADDRESS, type Proposal } from '../contracts/dao'

type ExecuteStatus = 'idle' | 'pending' | 'success' | 'error'

interface ProposalWithExecuteStatus extends Proposal {
  executeStatus: ExecuteStatus
  executeError: string | null
}

export const ProposalList = () => {
  const [proposals, setProposals] = useState<ProposalWithExecuteStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState<boolean>(false)

  const fetchProposals = useCallback(async (userAccount?: string) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('Будь ласка, встановіть MetaMask')
      setLoading(false)
      return
    }

    if (!DAO_CONTRACT_ADDRESS) {
      setError('DAO контракт не налаштовано. Будь ласка, встановіть VITE_DAO_CONTRACT_ADDRESS у .env файлі')
      setLoading(false)
      return
    }

    try {
      const provider = new BrowserProvider(window.ethereum)
      const contract = new Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider)

      const count = await contract.proposalCount()
      const proposalCount = Number(count)

      if (proposalCount === 0) {
        setProposals([])
        setLoading(false)
        return
      }

      // Check if user is owner
      if (userAccount) {
        try {
          const owner = await contract.owner()
          setIsOwner(owner.toLowerCase() === userAccount.toLowerCase())
        } catch {
          setIsOwner(false)
        }
      }

      const proposalPromises = []
      for (let i = 1; i <= proposalCount; i++) {
        proposalPromises.push(contract.getProposal(i))
      }

      const proposalData = await Promise.all(proposalPromises)

      const proposalsWithStatus = proposalData.map((proposal) => ({
        id: proposal.id,
        description: proposal.description,
        executed: proposal.executed,
        executeStatus: 'idle' as ExecuteStatus,
        executeError: null
      }))

      setProposals(proposalsWithStatus)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не вдалося завантажити пропозиції'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleExecute = async (proposalId: bigint) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return
    }

    // Update proposal status to pending
    setProposals((prev) =>
      prev.map((p) => (p.id === proposalId ? { ...p, executeStatus: 'pending', executeError: null } : p))
    )

    try {
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer)

      const tx = await contract.executeProposal(proposalId)
      await tx.wait()

      // Update proposal status to success and mark as executed
      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, executeStatus: 'success', executed: true } : p))
      )

      // Refresh proposals to get updated data
      if (account) {
        await fetchProposals(account)
      }
    } catch (err) {
      let message = 'Не вдалося виконати пропозицію'

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

      setProposals((prev) =>
        prev.map((p) => (p.id === proposalId ? { ...p, executeStatus: 'error', executeError: message } : p))
      )
    }
  }

  useEffect(() => {
    const loadAccountAndProposals = async () => {
      if (typeof window === 'undefined' || !window.ethereum) {
        setLoading(false)
        return
      }

      try {
        const provider = new BrowserProvider(window.ethereum)
        const accounts = await provider.send('eth_accounts', [])

        if (accounts && accounts.length > 0) {
          setAccount(accounts[0])
          await fetchProposals(accounts[0])
        } else {
          await fetchProposals()
        }
      } catch {
        await fetchProposals()
      }
    }

    loadAccountAndProposals()
  }, [fetchProposals])

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return
    }

    const handleAccountsChanged = (accounts: string[]) => {
      const newAccount = accounts && accounts.length > 0 ? accounts[0] : null
      setAccount(newAccount)
      fetchProposals(newAccount || undefined)
    }

    window.ethereum.on?.('accountsChanged', handleAccountsChanged)

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
    }
  }, [fetchProposals])

  if (loading) {
    return (
      <section className="proposal-list">
        <h2>Пропозиції</h2>
        <p className="muted">Завантаження пропозицій...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="proposal-list">
        <h2>Пропозиції</h2>
        <p className="balance-error">{error}</p>
      </section>
    )
  }

  if (proposals.length === 0) {
    return (
      <section className="proposal-list">
        <h2>Пропозиції</h2>
        <p className="muted">Пропозицій поки немає. Створіть першу!</p>
      </section>
    )
  }

  return (
    <section className="proposal-list">
      <h2>Пропозиції</h2>

      <div className="proposals">
        {proposals.map((proposal) => (
          <div key={proposal.id.toString()} className="proposal-card">
            <div className="proposal-header">
              <h3>Пропозиція #{proposal.id.toString()}</h3>
              {proposal.executed ? (
                <span className="proposal-status executed">✓ Виконано</span>
              ) : (
                <span className="proposal-status pending">Очікує</span>
              )}
            </div>

            <p className="proposal-description">{proposal.description}</p>

            {!proposal.executed && isOwner && (
              <div className="execute-actions">
                <button
                  onClick={() => handleExecute(proposal.id)}
                  disabled={proposal.executeStatus === 'pending'}
                  className="execute-button"
                >
                  {proposal.executeStatus === 'pending' ? 'Виконання...' : 'Виконати пропозицію'}
                </button>
              </div>
            )}

            {!proposal.executed && !isOwner && account && (
              <p className="muted">Тільки власник може виконати пропозицію</p>
            )}

            {proposal.executeStatus === 'success' && (
              <div className="status-message success">
                <p>Пропозицію виконано!</p>
              </div>
            )}

            {proposal.executeStatus === 'error' && proposal.executeError && (
              <div className="status-message error">
                <p>{proposal.executeError}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default ProposalList

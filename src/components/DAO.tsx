import { useCallback } from 'react'
import { CreateProposal } from './CreateProposal'
import { DAO_CONTRACT_ADDRESS, type ProposalExecutedEvent } from '../contracts/dao'
import { useDAOEvents } from '../hooks/useDAOEvents'

export const DAO = () => {
  const isDAOConfigured = DAO_CONTRACT_ADDRESS

  const handleProposalCreated = useCallback(() => {
    console.log('Proposal created')
  }, [])

  const handleProposalExecuted = useCallback((event: ProposalExecutedEvent) => {
    console.log('Proposal executed:', event)
  }, [])

  // Listen for DAO events
  useDAOEvents({
    onProposalCreated: handleProposalCreated,
    onProposalExecuted: handleProposalExecuted
  })

  return (
    <div className="dao-container">
      <h1>DAO Governance</h1>
      <p className="muted">
        Створюйте пропозиції та голосуйте за зміни в організації
      </p>

      {!isDAOConfigured && (
        <div className="status-message error" style={{ maxWidth: '800px', margin: '20px auto' }}>
          <h3>⚠️ DAO контракт не налаштовано</h3>
          <p>
            Для роботи з DAO необхідно встановити адресу контракту у файлі <code>.env</code>:
          </p>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
            VITE_DAO_CONTRACT_ADDRESS=YOUR_DAO_CONTRACT_ADDRESS
          </pre>
          <p style={{ marginTop: '10px' }}>
            <strong>Важливо:</strong> Поточна адреса <code>{DAO_CONTRACT_ADDRESS}</code> вказує на ERC20 токен, а не на DAO контракт.
            Замініть її на адресу вашого задеплоєного DAO контракту.
          </p>
        </div>
      )}

      <CreateProposal onProposalCreated={handleProposalCreated} />
    </div>
  )
}

export default DAO

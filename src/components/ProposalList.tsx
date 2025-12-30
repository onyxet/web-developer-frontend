import { useCallback, useEffect, useState } from 'react'
import { proposalsAPI, type ProposalDetailed, ProposalState } from '../services/api'
import { useWallet } from '../contexts/WalletContext'
import { VoteForm } from './proposals/VoteForm'
import { StateLabel } from './common/StateLabel'
import { formatEther } from 'ethers'

export const ProposalList = () => {
  const { isConnected } = useWallet()
  const [proposals, setProposals] = useState<ProposalDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null)

  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true)
      const response = await proposalsAPI.getAllDetailedProposals()
      setProposals(response.proposals)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не вдалося завантажити пропозиції'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  const toggleProposal = (proposalId: string) => {
    setExpandedProposal(expandedProposal === proposalId ? null : proposalId)
  }

  const getStateColor = (state: ProposalState): string => {
    switch (state) {
      case ProposalState.Active:
        return 'active'
      case ProposalState.Succeeded:
        return 'success'
      case ProposalState.Executed:
        return 'executed'
      case ProposalState.Defeated:
      case ProposalState.Canceled:
      case ProposalState.Expired:
        return 'error'
      default:
        return 'pending'
    }
  }

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
      <h2>Пропозиції DAO</h2>
      <p className="muted">Переглядайте та голосуйте за пропозиції</p>

      <div className="proposals">
        {proposals.map((proposal) => (
          <div key={proposal.proposalId} className="proposal-card">
            <div className="proposal-header">
              <div>
                <h3>{proposal.description.split('\n')[0] || `Пропозиція #${proposal.proposalId.slice(0, 10)}...`}</h3>
                <p className="muted" style={{ fontSize: '0.85em', marginTop: '4px' }}>
                  ID: {proposal.proposalId}
                </p>
              </div>
              {proposal.state !== undefined && (
                <span className={`proposal-status ${getStateColor(proposal.state)}`}>
                  <StateLabel state={proposal.state} />
                </span>
              )}
            </div>

            <p className="proposal-description">{proposal.description}</p>

            {/* Proposal Details */}
            <div className="proposal-details">
              <div className="detail-row">
                <span className="label">Proposer:</span>
                <span className="value">{proposal.proposer.slice(0, 10)}...{proposal.proposer.slice(-8)}</span>
              </div>

              {/* Voting Results */}
              {(proposal.forVotes || proposal.againstVotes || proposal.abstainVotes) && (
                <div className="voting-results">
                  <h4>Результати голосування:</h4>
                  <div className="votes-breakdown">
                    <div className="vote-item vote-for">
                      <span>За:</span>
                      <strong>{proposal.forVotes ? formatEther(proposal.forVotes) : '0'}</strong>
                    </div>
                    <div className="vote-item vote-against">
                      <span>Проти:</span>
                      <strong>{proposal.againstVotes ? formatEther(proposal.againstVotes) : '0'}</strong>
                    </div>
                    <div className="vote-item vote-abstain">
                      <span>Утрималися:</span>
                      <strong>{proposal.abstainVotes ? formatEther(proposal.abstainVotes) : '0'}</strong>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => toggleProposal(proposal.proposalId)}
                className="toggle-details"
              >
                {expandedProposal === proposal.proposalId ? 'Приховати деталі ▲' : 'Показати деталі ▼'}
              </button>

              {expandedProposal === proposal.proposalId && (
                <div className="expanded-details">
                  <div className="detail-row">
                    <span className="label">Targets:</span>
                    <span className="value">{proposal.targets.join(', ')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Values:</span>
                    <span className="value">{proposal.values.join(', ')}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Vote Start:</span>
                    <span className="value">Block #{proposal.voteStart}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Vote End:</span>
                    <span className="value">Block #{proposal.voteEnd}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Show voting form only for Active proposals */}
            {proposal.state === ProposalState.Active && isConnected && (
              <div className="vote-section">
                <VoteForm
                  proposalId={proposal.proposalId}
                  onSuccess={() => {
                    // Refresh proposals after successful vote
                    fetchProposals()
                  }}
                />
              </div>
            )}

            {/* Show message for non-active proposals */}
            {proposal.state !== ProposalState.Active && (
              <div className="muted" style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                {proposal.state === ProposalState.Pending && 'Голосування ще не почалося'}
                {proposal.state === ProposalState.Succeeded && 'Голосування завершено - пропозиція прийнята'}
                {proposal.state === ProposalState.Defeated && 'Голосування завершено - пропозиція відхилена'}
                {proposal.state === ProposalState.Executed && 'Пропозиція виконана'}
                {proposal.state === ProposalState.Canceled && 'Пропозиція скасована'}
                {proposal.state === ProposalState.Expired && 'Пропозиція прострочена'}
                {proposal.state === ProposalState.Queued && 'Пропозиція в черзі на виконання'}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default ProposalList

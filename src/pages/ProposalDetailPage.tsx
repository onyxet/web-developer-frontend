import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { proposalsAPI, ProposalState, type ProposalDetailed } from '../services/api'
import StateLabel from '../components/common/StateLabel'
import VoteForm from '../components/proposals/VoteForm'
import QueueButton from '../components/proposals/QueueButton'
import ExecuteButton from '../components/proposals/ExecuteButton'

export const ProposalDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<ProposalDetailed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProposal = useCallback(async () => {
    if (!id) {
      setError('Invalid proposal ID')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const proposalData = await proposalsAPI.getDetailedProposal(id)
      setProposal(proposalData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  const handleActionSuccess = () => {
    // Refresh proposal data after successful action
    fetchProposal()
  }

  if (loading) {
    return (
      <div className="app-container">
        <Link to="/proposals" className="back-link">
          ← Back to Proposals
        </Link>
        <h1>Proposal Details</h1>
        <p className="muted">Loading proposal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <Link to="/proposals" className="back-link">
          ← Back to Proposals
        </Link>
        <h1>Proposal Details</h1>
        <div className="status-message error">
          <p>{error}</p>
        </div>
        <button className="retry-button" onClick={fetchProposal}>
          Retry
        </button>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="app-container">
        <Link to="/proposals" className="back-link">
          ← Back to Proposals
        </Link>
        <h1>Proposal Details</h1>
        <p className="muted">Proposal not found</p>
      </div>
    )
  }

  const forVotes = proposal.forVotes ? BigInt(proposal.forVotes) : 0n
  const againstVotes = proposal.againstVotes ? BigInt(proposal.againstVotes) : 0n
  const abstainVotes = proposal.abstainVotes ? BigInt(proposal.abstainVotes) : 0n
  const totalVotes = forVotes + againstVotes + abstainVotes

  const forPercentage = totalVotes > 0n ? Math.round(Number((forVotes * 100n) / totalVotes)) : 0
  const againstPercentage = totalVotes > 0n ? Math.round(Number((againstVotes * 100n) / totalVotes)) : 0
  const abstainPercentage = totalVotes > 0n ? Math.round(Number((abstainVotes * 100n) / totalVotes)) : 0

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <div className="app-container">
      <Link to="/proposals" className="back-link">
        ← Back to Proposals
      </Link>

      <div className="proposal-detail">
        <div className="proposal-header">
          <div>
            <h1>Proposal</h1>
            <p className="proposal-id muted">{proposal.proposalId}</p>
          </div>
          {proposal.state !== undefined && <StateLabel state={proposal.state} />}
        </div>

        <hr className="section-divider" />

        <div className="proposal-info">
          <h2>Description</h2>
          <p>{proposal.description}</p>
        </div>

        <div className="proposal-info">
          <h3>Proposer</h3>
          <p className="address">{truncateAddress(proposal.proposer)}</p>
        </div>

        <div className="proposal-info">
          <h3>Vote Timeline</h3>
          <p className="muted">
            Start Block: {proposal.voteStart} | End Block: {proposal.voteEnd}
          </p>
        </div>

        <hr className="section-divider" />

        <div className="voting-results">
          <h2>Voting Results</h2>

          <div className="results-summary">
            <div className="result-item for">
              <h3>For</h3>
              <p className="vote-count">{forVotes.toString()}</p>
              <p className="vote-percentage">{forPercentage}%</p>
            </div>

            <div className="result-item against">
              <h3>Against</h3>
              <p className="vote-count">{againstVotes.toString()}</p>
              <p className="vote-percentage">{againstPercentage}%</p>
            </div>

            <div className="result-item abstain">
              <h3>Abstain</h3>
              <p className="vote-count">{abstainVotes.toString()}</p>
              <p className="vote-percentage">{abstainPercentage}%</p>
            </div>
          </div>

          {totalVotes > 0n && (
            <div className="vote-bar">
              <div
                className="vote-bar-for"
                style={{ width: `${forPercentage}%` }}
                title={`For: ${forVotes.toString()} votes (${forPercentage}%)`}
              />
              <div
                className="vote-bar-against"
                style={{ width: `${againstPercentage}%` }}
                title={`Against: ${againstVotes.toString()} votes (${againstPercentage}%)`}
              />
              <div
                className="vote-bar-abstain"
                style={{ width: `${abstainPercentage}%` }}
                title={`Abstain: ${abstainVotes.toString()} votes (${abstainPercentage}%)`}
              />
            </div>
          )}

          {totalVotes === 0n && <p className="muted">No votes yet</p>}
        </div>

        <hr className="section-divider" />

        {/* Debug info */}
        <div style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px', fontSize: '12px' }}>
          <strong>Debug:</strong> Proposal State = {proposal.state} |
          Active = {ProposalState.Active} |
          Is Active? {proposal.state === ProposalState.Active ? 'YES' : 'NO'} |
          State Type: {typeof proposal.state}
        </div>

        {/* VOTING SECTION - Show for Active proposals */}
        {(proposal.state === ProposalState.Active || Number(proposal.state) === 1) && (
          <div className="voting-section">
            <h2>🗳️ Cast Your Vote</h2>
            <p className="muted">This proposal is active and ready for voting</p>
            <VoteForm proposalId={proposal.proposalId} onSuccess={handleActionSuccess} />
          </div>
        )}

        {/* Show QueueButton for Succeeded proposals */}
        {proposal.state === ProposalState.Succeeded && (
          <div className="action-section">
            <h2>Queue Proposal</h2>
            <QueueButton
              proposalId={proposal.proposalId}
              proposalState={proposal.state}
              onSuccess={handleActionSuccess}
            />
          </div>
        )}

        {/* Show ExecuteButton for Queued proposals */}
        {proposal.state === ProposalState.Queued && (
          <div className="action-section">
            <h2>Execute Proposal</h2>
            <ExecuteButton
              proposalId={proposal.proposalId}
              proposalState={proposal.state}
              etaSeconds={proposal.etaSeconds}
              onSuccess={handleActionSuccess}
            />
          </div>
        )}

        {/* Show message for other states */}
        {proposal.state === ProposalState.Executed && (
          <div className="status-message success">
            <p>✅ This proposal has been executed successfully</p>
          </div>
        )}

        {proposal.state === ProposalState.Defeated && (
          <div className="status-message error">
            <p>❌ This proposal was defeated</p>
          </div>
        )}

        {proposal.state === ProposalState.Canceled && (
          <div className="status-message error">
            <p>❌ This proposal was canceled</p>
          </div>
        )}

        {proposal.state === ProposalState.Expired && (
          <div className="status-message error">
            <p>⏱️ This proposal has expired</p>
          </div>
        )}

        {proposal.state === ProposalState.Pending && (
          <div className="status-message">
            <p>⏳ This proposal is pending - voting has not started yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProposalDetailPage

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { proposalsAPI, type ProposalFromAPI, type VotingResults } from '../services/api'

export const ProposalDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<ProposalFromAPI | null>(null)
  const [results, setResults] = useState<VotingResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProposalData = async () => {
      if (!id) {
        setError('Invalid proposal ID')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const [proposalData, resultsData] = await Promise.all([
          proposalsAPI.getProposalById(Number(id)),
          proposalsAPI.getVotingResults(Number(id))
        ])

        setProposal(proposalData)
        setResults(resultsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposal')
      } finally {
        setLoading(false)
      }
    }

    fetchProposalData()
  }, [id])

  if (loading) {
    return (
      <div className="app-container">
        <h1>Proposal Details</h1>
        <p className="muted">Loading proposal...</p>
        <Link to="/proposals" className="back-link">Back to Proposals</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <h1>Proposal Details</h1>
        <div className="status-message error">
          <p>{error}</p>
        </div>
        <Link to="/proposals" className="back-link">Back to Proposals</Link>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="app-container">
        <h1>Proposal Details</h1>
        <p className="muted">Proposal not found</p>
        <Link to="/proposals" className="back-link">Back to Proposals</Link>
      </div>
    )
  }

  const forPercentage = results && results.totalVotes > 0
    ? Math.round((results.forVotes / results.totalVotes) * 100)
    : 0
  const againstPercentage = results && results.totalVotes > 0
    ? Math.round((results.againstVotes / results.totalVotes) * 100)
    : 0

  return (
    <div className="app-container">
      <Link to="/proposals" className="back-link">Back to Proposals</Link>

      <div className="proposal-detail">
        <div className="proposal-header">
          <h1>Proposal #{proposal.id}</h1>
          {proposal.executed ? (
            <span className="proposal-status executed">Executed</span>
          ) : (
            <span className="proposal-status pending">Pending</span>
          )}
        </div>

        <div className="proposal-info">
          <h2>Description</h2>
          <p>{proposal.description}</p>
        </div>

        <div className="proposal-info">
          <h3>Creator</h3>
          <p className="address">{proposal.creator}</p>
        </div>

        <div className="proposal-info">
          <h3>Status</h3>
          <p>
            {proposal.executed
              ? `Executed by ${proposal.executed.executor.slice(0, 6)}...${proposal.executed.executor.slice(-4)} at block ${proposal.executed.blockNumber}`
              : 'Waiting to be executed'}
          </p>
        </div>

        {results && (
          <div className="voting-results">
            <h2>Voting Results</h2>

            <div className="results-summary">
              <div className="result-item for">
                <h3>For</h3>
                <p className="vote-count">{results.forVotes}</p>
                <p className="vote-percentage">{forPercentage}%</p>
              </div>

              <div className="result-item against">
                <h3>Against</h3>
                <p className="vote-count">{results.againstVotes}</p>
                <p className="vote-percentage">{againstPercentage}%</p>
              </div>

              <div className="result-item total">
                <h3>Total Votes</h3>
                <p className="vote-count">{results.totalVotes}</p>
              </div>
            </div>

            {results.totalVotes > 0 && (
              <div className="vote-bar">
                <div
                  className="vote-bar-for"
                  style={{ width: `${forPercentage}%` }}
                  title={`For: ${results.forVotes} votes (${forPercentage}%)`}
                />
                <div
                  className="vote-bar-against"
                  style={{ width: `${againstPercentage}%` }}
                  title={`Against: ${results.againstVotes} votes (${againstPercentage}%)`}
                />
              </div>
            )}

            {results.totalVotes === 0 && (
              <p className="muted">No votes yet</p>
            )}
          </div>
        )}

        {!proposal.executed && (
          <div className="voting-action">
            <p className="muted">To vote on this proposal, use your wallet</p>
            <button className="vote-button" disabled>
              Vote (Coming soon)
            </button>
          </div>
        )}

        {proposal.executed && (
          <div className="status-message success">
            <p>This proposal has been executed and voting is closed</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProposalDetailPage

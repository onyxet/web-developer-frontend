import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { proposalsAPI, type ProposalFromAPI } from '../services/api'

export const ProposalListPage = () => {
  const [proposals, setProposals] = useState<ProposalFromAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await proposalsAPI.getAllProposals()
        setProposals(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load proposals')
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [])

  if (loading) {
    return (
      <div className="app-container">
        <h1>Proposals</h1>
        <p className="muted">Loading proposals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <h1>Proposals</h1>
        <div className="status-message error">
          <p>{error}</p>
        </div>
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="app-container">
        <h1>Proposals</h1>
        <p className="muted">No proposals found. Create the first one!</p>
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    )
  }

  return (
    <div className="app-container">
      <h1>All Proposals</h1>
      <p className="muted">Click on a proposal to view details</p>

      <div className="proposals">
        {proposals.map((proposal) => (
          <Link
            key={proposal.id}
            to={`/proposals/${proposal.id}`}
            className="proposal-card-link"
          >
            <div className="proposal-card">
              <div className="proposal-header">
                <h3>Proposal #{proposal.id}</h3>
                {proposal.executed ? (
                  <span className="proposal-status executed">Executed</span>
                ) : (
                  <span className="proposal-status pending">Pending</span>
                )}
              </div>

              <p className="proposal-description">{proposal.description}</p>

              <div className="proposal-meta">
                <p className="muted">
                  Creator: {proposal.creator.slice(0, 6)}...{proposal.creator.slice(-4)}
                </p>
                <p className="muted">
                  Votes: {proposal.votes.length}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link to="/" className="back-link">Back to Home</Link>
    </div>
  )
}

export default ProposalListPage

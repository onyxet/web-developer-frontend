import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { proposalsAPI, ProposalState, type ProposalDetailed } from '../services/api'
import StateLabel from '../components/common/StateLabel'
import CreateProposal from '../components/CreateProposal'

type FilterType = 'all' | ProposalState

export const ProposalListPage = () => {
  const [proposals, setProposals] = useState<ProposalDetailed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchProposals = async () => {
    try {
      setLoading(true)
      setError(null)

      if (filter === 'all') {
        const data = await proposalsAPI.getAllDetailedProposals()
        setProposals(data.proposals || [])
      } else {
        const data = await proposalsAPI.getProposalsByState(filter as ProposalState)
        setProposals(data.proposals || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [filter])

  const handleProposalCreated = () => {
    setShowCreateForm(false)
    fetchProposals()
  }

  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

  // Filter by search term
  const filteredProposals = proposals.filter((proposal) =>
    proposal.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="app-container">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <h1>Proposals</h1>
        <p className="muted">Loading proposals...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-container">
        <Link to="/" className="back-link">
          ← Back to Home
        </Link>
        <h1>Proposals</h1>
        <div className="status-message error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Link to="/" className="back-link">
        ← Back to Home
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>DAO Proposals</h1>
          <p className="muted">Browse and filter governance proposals</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ height: 'fit-content', padding: '0.75rem 1.5rem' }}
        >
          {showCreateForm ? 'Скасувати' : '+ Створити пропозицію'}
        </button>
      </div>

      {showCreateForm && (
        <>
          <CreateProposal onProposalCreated={handleProposalCreated} />
          <hr className="section-divider" />
        </>
      )}

      <hr className="section-divider" />

      {/* State Filters */}
      <div className="proposal-filters">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Active ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Active)}
          >
            🗳️ Active
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Pending ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Pending)}
          >
            Pending
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Succeeded ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Succeeded)}
          >
            Succeeded
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Queued ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Queued)}
          >
            Queued
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Executed ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Executed)}
          >
            Executed
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Defeated ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Defeated)}
          >
            Defeated
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Canceled ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Canceled)}
          >
            Canceled
          </button>
          <button
            className={`filter-tab ${filter === ProposalState.Expired ? 'active' : ''}`}
            onClick={() => setFilter(ProposalState.Expired)}
          >
            Expired
          </button>
        </div>

        {/* Search */}
        <div className="filter-search">
          <input
            type="text"
            placeholder="Search by description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <p className="muted">
        Showing {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
      </p>

      {filteredProposals.length === 0 ? (
        <p className="muted">No proposals found</p>
      ) : (
        <div className="proposals">
          {filteredProposals.map((proposal) => (
            <Link
              key={proposal.proposalId}
              to={`/proposals/${proposal.proposalId}`}
              className="proposal-card-link"
            >
              <div className="proposal-card">
                <div className="proposal-header">
                  <div>
                    <h3>Proposal</h3>
                    <p className="proposal-id-small muted">{proposal.proposalId.slice(0, 20)}...</p>
                  </div>
                  {proposal.state !== undefined && <StateLabel state={proposal.state} />}
                </div>

                <p className="proposal-description">{proposal.description}</p>

                <div className="proposal-meta">
                  <p className="muted">Proposer: {truncateAddress(proposal.proposer)}</p>
                  {proposal.forVotes && proposal.againstVotes && (
                    <p className="muted">
                      Votes: {BigInt(proposal.forVotes || '0').toString()} For /{' '}
                      {BigInt(proposal.againstVotes || '0').toString()} Against
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProposalListPage

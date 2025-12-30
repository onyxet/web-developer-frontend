import { Link } from 'react-router-dom'
import type { ReactElement } from 'react'
import { EventType, type DAOEvent, VoteSupport } from '../../services/api'

interface EventCardProps {
  event: DAOEvent
}

const BLOCK_EXPLORER_URL = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io'

function getEventIcon(type: EventType): string {
  switch (type) {
    case EventType.ProposalCreated:
      return '📝'
    case EventType.VoteCast:
      return '🗳️'
    case EventType.ProposalQueued:
      return '⏰'
    case EventType.ProposalExecuted:
      return '✅'
    case EventType.ProposalCanceled:
      return '❌'
    case EventType.DelegateChanged:
      return '👥'
    default:
      return '📌'
  }
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return 'Unknown time'

  const date = new Date(timestamp * 1000)
  const now = Date.now()
  const diff = now - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getEventDescription(event: DAOEvent): ReactElement {
  const data = event.data

  switch (event.type) {
    case EventType.ProposalCreated:
      return (
        <span>
          Proposal created by <strong>{truncateAddress(data.proposer || 'Unknown')}</strong>
          {data.proposalId && (
            <>
              {' '}
              (ID: <Link to={`/proposals/${data.proposalId}`}>{data.proposalId.slice(0, 10)}...</Link>)
            </>
          )}
        </span>
      )

    case EventType.VoteCast:
      const supportLabels = {
        [VoteSupport.For]: 'FOR',
        [VoteSupport.Against]: 'AGAINST',
        [VoteSupport.Abstain]: 'ABSTAIN'
      }
      const supportLabel = supportLabels[data.support as VoteSupport] || 'Unknown'

      return (
        <span>
          <strong>{truncateAddress(data.voter || 'Unknown')}</strong> voted{' '}
          <strong className={`vote-label vote-${supportLabel.toLowerCase()}`}>{supportLabel}</strong>
          {data.proposalId && (
            <>
              {' '}
              on <Link to={`/proposals/${data.proposalId}`}>Proposal</Link>
            </>
          )}
          {data.reason && <div className="vote-reason muted">Reason: {data.reason}</div>}
        </span>
      )

    case EventType.ProposalQueued:
      return (
        <span>
          Proposal{' '}
          {data.proposalId && <Link to={`/proposals/${data.proposalId}`}>{data.proposalId.slice(0, 10)}...</Link>}{' '}
          queued for execution
          {data.etaSeconds && (
            <span className="muted"> (ETA: {new Date(parseInt(data.etaSeconds) * 1000).toLocaleString()})</span>
          )}
        </span>
      )

    case EventType.ProposalExecuted:
      return (
        <span>
          Proposal{' '}
          {data.proposalId && <Link to={`/proposals/${data.proposalId}`}>{data.proposalId.slice(0, 10)}...</Link>}{' '}
          executed successfully
        </span>
      )

    case EventType.ProposalCanceled:
      return (
        <span>
          Proposal{' '}
          {data.proposalId && <Link to={`/proposals/${data.proposalId}`}>{data.proposalId.slice(0, 10)}...</Link>}{' '}
          was canceled
        </span>
      )

    case EventType.DelegateChanged:
      return (
        <span>
          <strong>{truncateAddress(data.delegator || 'Unknown')}</strong> changed delegation from{' '}
          <strong>{truncateAddress(data.fromDelegate || '0x0')}</strong> to{' '}
          <strong>{truncateAddress(data.toDelegate || '0x0')}</strong>
        </span>
      )

    default:
      return <span>Unknown event type</span>
  }
}

export function EventCard({ event }: EventCardProps) {
  const icon = getEventIcon(event.type)
  const timestamp = formatTimestamp(event.timestamp)

  return (
    <div className={`event-card event-type-${event.type.toLowerCase()}`}>
      <div className="event-icon">{icon}</div>
      <div className="event-content">
        <div className="event-type">{event.type}</div>
        <div className="event-description">{getEventDescription(event)}</div>
        <div className="event-meta">
          <span className="event-time">{timestamp}</span>
          <span className="event-separator">•</span>
          <span className="event-block">Block {event.blockNumber}</span>
          {event.transactionHash && (
            <>
              <span className="event-separator">•</span>
              <a
                href={`${BLOCK_EXPLORER_URL}/tx/${event.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="event-tx-link"
              >
                Tx
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventCard

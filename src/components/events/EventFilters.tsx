import { EventType } from '../../services/api'

interface EventFiltersProps {
  selectedEventType: EventType | 'All'
  onEventTypeChange: (eventType: EventType | 'All') => void
  proposalIdFilter: string
  onProposalIdChange: (proposalId: string) => void
  addressFilter: string
  onAddressChange: (address: string) => void
}

const EVENT_TYPES = [
  { value: 'All', label: 'All Events' },
  { value: EventType.ProposalCreated, label: 'Proposal Created' },
  { value: EventType.VoteCast, label: 'Vote Cast' },
  { value: EventType.ProposalQueued, label: 'Proposal Queued' },
  { value: EventType.ProposalExecuted, label: 'Proposal Executed' },
  { value: EventType.ProposalCanceled, label: 'Proposal Canceled' },
  { value: EventType.DelegateChanged, label: 'Delegate Changed' }
]

export function EventFilters({
  selectedEventType,
  onEventTypeChange,
  proposalIdFilter,
  onProposalIdChange,
  addressFilter,
  onAddressChange
}: EventFiltersProps) {
  return (
    <div className="event-filters">
      <div className="filter-group">
        <label htmlFor="event-type-filter">
          Event Type
          <select
            id="event-type-filter"
            value={selectedEventType}
            onChange={(e) => onEventTypeChange(e.target.value as EventType | 'All')}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-group">
        <label htmlFor="proposal-id-filter">
          Proposal ID (optional)
          <input
            id="proposal-id-filter"
            type="text"
            value={proposalIdFilter}
            onChange={(e) => onProposalIdChange(e.target.value)}
            placeholder="0x..."
          />
        </label>
      </div>

      <div className="filter-group">
        <label htmlFor="address-filter">
          Address (voter/proposer)
          <input
            id="address-filter"
            type="text"
            value={addressFilter}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="0x..."
          />
        </label>
      </div>
    </div>
  )
}

export default EventFilters

import { useEffect, useState } from 'react'
import { proposalsAPI, type DAOEvent, EventType } from '../../services/api'
import EventCard from './EventCard'
import EventFilters from './EventFilters'

const REFRESH_INTERVAL = 15000 // 15 seconds

export function EventList() {
  const [events, setEvents] = useState<DAOEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedEventType, setSelectedEventType] = useState<EventType | 'All'>('All')
  const [proposalIdFilter, setProposalIdFilter] = useState('')
  const [addressFilter, setAddressFilter] = useState('')

  const fetchEvents = async () => {
    try {
      setError(null)

      const filters: any = {}

      if (selectedEventType !== 'All') {
        filters.eventType = selectedEventType
      }

      if (proposalIdFilter.trim()) {
        filters.proposalId = proposalIdFilter.trim()
      }

      if (addressFilter.trim()) {
        filters.address = addressFilter.trim()
      }

      const response = await proposalsAPI.getEvents(filters)
      setEvents(response.events || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()

    // Set up auto-refresh
    const interval = setInterval(fetchEvents, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [selectedEventType, proposalIdFilter, addressFilter])

  if (loading) {
    return (
      <div className="event-list">
        <p className="muted">Loading events...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="event-list">
        <div className="status-message error">
          <p>{error}</p>
        </div>
        <button className="retry-button" onClick={() => fetchEvents()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="event-list">
      <EventFilters
        selectedEventType={selectedEventType}
        onEventTypeChange={setSelectedEventType}
        proposalIdFilter={proposalIdFilter}
        onProposalIdChange={setProposalIdFilter}
        addressFilter={addressFilter}
        onAddressChange={setAddressFilter}
      />

      <div className="event-count">
        <p className="muted">
          Showing {events.length} event{events.length !== 1 ? 's' : ''}
          {selectedEventType !== 'All' && ` (filtered by ${selectedEventType})`}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="muted">No events found</p>
      ) : (
        <div className="events-container">
          {events.map((event, index) => (
            <EventCard key={`${event.transactionHash}-${index}`} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export default EventList

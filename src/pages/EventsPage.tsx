import { Link } from 'react-router-dom'
import EventList from '../components/events/EventList'

export function EventsPage() {
  return (
    <div className="app-container">
      <Link to="/" className="back-link">
        ← Back to Home
      </Link>

      <h1>DAO Events</h1>
      <p className="muted">Track all governance activity in real-time</p>

      <hr className="section-divider" />

      <EventList />
    </div>
  )
}

export default EventsPage

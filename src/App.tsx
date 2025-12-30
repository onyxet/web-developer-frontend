import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WalletProvider } from './contexts/WalletContext'

import Navigation from './components/layout/Navigation'
import BalanceDisplay from './components/BalanceDisplay'
import DAO from './components/DAO'
import ProposalListPage from './pages/ProposalListPage'
import ProposalDetailPage from './pages/ProposalDetailPage'
import EventsPage from './pages/EventsPage'

function HomePage() {
  const customTokenAddress = import.meta.env.VITE_CUSTOM_TOKEN_ADDRESS

  return (
    <div className="app-container">
      <h1>RBT DAO Governance</h1>
      <p className="muted">
        Decentralized governance for the RBT community
      </p>

      <hr className="section-divider" />

      <BalanceDisplay customTokenAddress={customTokenAddress} heading="Wallet Balances" />

      <hr className="section-divider" />

      <div className="home-info">
        <h2>Quick Links</h2>
        <p>Use the navigation above to:</p>
        <ul>
          <li><strong>Proposals</strong> - View and vote on active proposals</li>
          <li><strong>Events</strong> - Track all governance activity</li>
        </ul>
      </div>

      <hr className="section-divider" />

      <DAO />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <div className="app">
          <Navigation />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/proposals" element={<ProposalListPage />} />
            <Route path="/proposals/:id" element={<ProposalDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
          </Routes>
        </div>
      </WalletProvider>
    </BrowserRouter>
  )
}

export default App

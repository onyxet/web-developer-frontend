import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

import BalanceDisplay from './components/BalanceDisplay'
import DAO from './components/DAO'
import ProposalListPage from './pages/ProposalListPage'
import ProposalDetailPage from './pages/ProposalDetailPage'

function App() {
  const customTokenAddress = import.meta.env.VITE_CUSTOM_TOKEN_ADDRESS

  return (
	<div className="app-container">
	  <h1>Web3 DApp</h1>
	  <p className="muted">
		Підключіть гаманець для взаємодії з балансами та DAO
	  </p>

	  <nav className="main-nav">
		<Link to="/proposals" className="nav-link">Переглянути всі пропозиції</Link>
	  </nav>

	  <BalanceDisplay customTokenAddress={customTokenAddress} heading="Баланси" />

	  <hr className="section-divider" />

	  <DAO />
	</div>
  )
}

function HomeApp() {
  return (
	<BrowserRouter>
	  <Routes>
		<Route path="/" element={<App />} />
		<Route path="/proposals" element={<ProposalListPage />} />
		<Route path="/proposals/:id" element={<ProposalDetailPage />} />
	  </Routes>
	</BrowserRouter>
  )
}

export default HomeApp

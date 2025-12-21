import './App.css'

import BalanceDisplay from './components/BalanceDisplay'
import DAO from './components/DAO'

function App() {
  const customTokenAddress = import.meta.env.VITE_CUSTOM_TOKEN_ADDRESS

  return (
	<div className="app-container">
	  <h1>Web3 DApp</h1>
	  <p className="muted">
		Підключіть гаманець для взаємодії з балансами та DAO
	  </p>

	  <BalanceDisplay customTokenAddress={customTokenAddress} heading="Баланси" />

	  <hr className="section-divider" />

	  <DAO />
	</div>
  )
}

export default App

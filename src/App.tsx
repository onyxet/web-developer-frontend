import './App.css'

import BalanceDisplay from './components/BalanceDisplay'

function App() {
  const customTokenAddress = import.meta.env.VITE_CUSTOM_TOKEN_ADDRESS

  return (
	<div className="app-container">
	  <h1>Balance overview</h1>
	  <p className="muted">
		Підключіть гаманець через AppKit/Web3Modal або будь-яку іншу інтеграцію, після чого баланси
		завантажаться автоматично.
	  </p>
	  <BalanceDisplay customTokenAddress={customTokenAddress} heading="Current balances" />
	</div>
  )
}

export default App

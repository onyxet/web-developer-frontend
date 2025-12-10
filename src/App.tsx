import './App.css'
import { WalletConnect } from './components/WalletConnect'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Web3 Hoodi Wallet</h1>
        <p>Connect your wallet to interact with Hoodi Network</p>
      </header>
      <main className="app-main">
        <WalletConnect />
      </main>
    </div>
  )
}

export default App

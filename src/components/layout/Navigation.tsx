import { Link, useLocation } from 'react-router-dom'
import { useWallet } from '../../contexts/WalletContext'

export function Navigation() {
  const location = useLocation()
  const { account, isConnected, connect, disconnect, status } = useWallet()

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : ''
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <nav className="main-navigation">
      <div className="nav-brand">
        <Link to="/">RBT DAO</Link>
      </div>

      <div className="nav-links">
        <Link to="/" className={`nav-link ${isActive('/')}`}>
          Home
        </Link>
        <Link to="/proposals" className={`nav-link ${isActive('/proposals')}`}>
          Proposals
        </Link>
        <Link to="/events" className={`nav-link ${isActive('/events')}`}>
          Events
        </Link>
      </div>

      <div className="nav-wallet">
        {!isConnected ? (
          <button
            className="connect-button"
            onClick={connect}
            disabled={status === 'connecting' || status === 'no-wallet'}
          >
            {status === 'connecting' ? 'Connecting...' : status === 'no-wallet' ? 'No Wallet' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <span className="wallet-address">{account ? truncateAddress(account) : ''}</span>
            <button className="disconnect-button" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation

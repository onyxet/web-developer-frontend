import { useEffect } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { Avatar } from './Avatar'
import { HOODI_CHAIN_ID } from '../config/appConfig'
import { formatEther } from 'viem'

export const WalletConnect = () => {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()

  const { data: balanceData, isLoading: balanceLoading, error: balanceError } = useBalance({
    address: address,
    chainId: chain?.id,
  })

  useEffect(() => {
    if (balanceError) {
      console.error('Balance error:', balanceError)
    }
  }, [balanceError])

  useEffect(() => {
    if (isConnected && address) {
      console.log('Account changed:', address)
    }
  }, [address, isConnected])

  useEffect(() => {
    if (chain) {
      console.log('Chain changed:', chain.id)
    }
  }, [chain])

  const isWrongNetwork = isConnected && chain?.id !== HOODI_CHAIN_ID

  const handleConnect = async () => {
    await open()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="wallet-connect-container">
        <button onClick={handleConnect} className="connect-button">
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="wallet-connect-container">
      <div className="wallet-info">
        {address && (
          <>
            <div className="wallet-header">
              <Avatar address={address} size={8} />
              <div className="wallet-details">
                <div className="wallet-address">
                  <strong>Address:</strong> {formatAddress(address)}
                </div>
                <div className="wallet-balance">
                  <strong>Balance:</strong>{' '}
                  {balanceLoading
                    ? 'Loading...'
                    : balanceError
                    ? 'Error loading balance'
                    : balanceData
                    ? `${parseFloat(formatEther(balanceData.value)).toFixed(4)} ETH`
                    : '0.0000 ETH'}
                </div>
                <div className="wallet-chain">
                  <strong>Chain ID:</strong> {chain?.id || 'Unknown'}
                </div>
                <div className="wallet-network">
                  <strong>Network:</strong> {chain?.name || 'Unknown'}
                </div>
              </div>
            </div>

            {isWrongNetwork && (
              <div className="wrong-network">
                <p className="error-message">Wrong network</p>
                <p className="network-instruction">
                  Please switch to Hoodi network (Chain ID: {HOODI_CHAIN_ID}) manually in your wallet
                </p>
              </div>
            )}

            <button onClick={handleDisconnect} className="disconnect-button">
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

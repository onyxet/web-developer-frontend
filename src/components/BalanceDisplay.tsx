import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserProvider, Contract, formatUnits, getAddress } from 'ethers'

import type { BalanceType } from '../types/global'

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

const NATIVE_TOKEN_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  5: 'ETH',
  10: 'ETH',
  56: 'BNB',
  97: 'BNB',
  137: 'MATIC',
  250: 'FTM',
  324: 'ETH',
  42161: 'ETH',
  421614: 'ETH',
  43113: 'AVAX',
  43114: 'AVAX',
  8453: 'ETH',
  84532: 'ETH',
  560048: 'ETH'
}

type WalletStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'disconnected'
  | 'no-wallet'
  | 'error'

type BalanceDisplayProps = {
  customTokenAddress?: string
  heading?: string
}

const formatBalanceValue = (value: bigint, decimals: number) => {
  const formatted = formatUnits(value, decimals)
  const numeric = Number.parseFloat(formatted)

  if (Number.isNaN(numeric)) {
    return formatted
  }

  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: 6
  })
}

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`
const AUTO_CONNECT_STORAGE_KEY = 'balance-display:auto-connect'

const readAutoConnectPreference = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true
  }

  return window.localStorage.getItem(AUTO_CONNECT_STORAGE_KEY) !== '0'
}

export const BalanceDisplay = ({
  customTokenAddress,
  heading = 'Wallet balances'
}: BalanceDisplayProps) => {
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [nativeBalance, setNativeBalance] = useState<BalanceType | null>(null)
  const [tokenBalance, setTokenBalance] = useState<BalanceType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [shouldAutoConnect, setShouldAutoConnect] = useState<boolean>(() => readAutoConnectPreference())
  const providerRef = useRef<BrowserProvider | null>(null)

  const { normalizedTokenAddress, tokenAddressError } = useMemo(() => {
    if (!customTokenAddress) {
      return { normalizedTokenAddress: undefined, tokenAddressError: 'Custom token address is not provided.' }
    }

    try {
      return { normalizedTokenAddress: getAddress(customTokenAddress.trim()), tokenAddressError: null }
    } catch (err) {
      return { normalizedTokenAddress: undefined, tokenAddressError: 'Custom token address is invalid.' }
    }
  }, [customTokenAddress])

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    if (!providerRef.current) {
      providerRef.current = new BrowserProvider(window.ethereum)
    }

    return providerRef.current
  }, [])

  const resetBalances = useCallback((nextStatus: WalletStatus) => {
    setNativeBalance(null)
    setTokenBalance(null)
    setStatus(nextStatus)
  }, [])

  const fetchBalances = useCallback(
    async (walletAddress: string) => {
      const provider = getProvider()

      if (!provider) {
        setError('Browser wallet was not detected.')
        setStatus('no-wallet')
        return
      }

      setStatus('loading')
      setError(null)

      try {
        const [network, nativeValue] = await Promise.all([
          provider.getNetwork(),
          provider.getBalance(walletAddress)
        ])

        const resolvedChainId = Number(network.chainId)
        setChainId(resolvedChainId)

        setNativeBalance({
          decimals: 18,
          symbol: NATIVE_TOKEN_SYMBOLS[resolvedChainId] ?? 'ETH',
          value: nativeValue,
          formatted: formatBalanceValue(nativeValue, 18)
        })

        if (normalizedTokenAddress) {
          const tokenContract = new Contract(normalizedTokenAddress, ERC20_ABI, provider)
          const [tokenValue, decimals, symbol] = await Promise.all([
            tokenContract.balanceOf(walletAddress) as Promise<bigint>,
            tokenContract.decimals() as Promise<number>,
            tokenContract.symbol() as Promise<string>
          ])

          setTokenBalance({
            decimals,
            symbol,
            value: tokenValue,
            formatted: formatBalanceValue(tokenValue, decimals)
          })
        } else {
          setTokenBalance(null)
        }

        setStatus('ready')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch balances.'
        setError(message)
        setStatus('error')
      }
    },
    [getProvider, normalizedTokenAddress]
  )

  const persistAutoConnectPreference = useCallback((value: boolean) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTO_CONNECT_STORAGE_KEY, value ? '1' : '0')
    }

    setShouldAutoConnect(value)
  }, [])

  const initializeConnection = useCallback(async () => {
    if (!shouldAutoConnect) {
      return
    }

    const provider = getProvider()

    if (!provider) {
      setStatus('no-wallet')
      setError('Browser wallet was not detected.')
      return
    }

    try {
      const accounts = await provider.send('eth_accounts', [])

      if (!accounts || accounts.length === 0) {
        setAccount(null)
        resetBalances('disconnected')
        return
      }

      const walletAddress = accounts[0]
      setAccount(walletAddress)
      await fetchBalances(walletAddress)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to read wallet accounts.'
      setError(message)
      setStatus('error')
    }
  }, [fetchBalances, getProvider, resetBalances, shouldAutoConnect])

  const handleConnect = useCallback(async () => {
    const provider = getProvider()

    if (!provider) {
      setStatus('no-wallet')
      setError('Browser wallet was not detected.')
      return
    }

    setIsConnecting(true)

    try {
      try {
        await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      } catch (permissionError) {
        // wallet_requestPermissions is optional; ignore method errors and only stop on rejections
        const err = permissionError as { code?: number }
        const isUserRejected = err?.code === 4001
        const isMethodMissing = err?.code === -32601

        if (!isUserRejected && !isMethodMissing) {
          console.warn('wallet_requestPermissions failed, falling back to eth_requestAccounts', permissionError)
        }

        if (isUserRejected) {
          throw permissionError
        }
      }

      const accounts = await provider.send('eth_requestAccounts', [])

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet account was returned.')
      }

      const walletAddress = accounts[0]
      setAccount(walletAddress)
      await fetchBalances(walletAddress)
      persistAutoConnectPreference(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.'
      setError(message)
    } finally {
      setIsConnecting(false)
    }
  }, [fetchBalances, getProvider, persistAutoConnectPreference])

  const handleManualDisconnect = useCallback(() => {
    providerRef.current = null
    setAccount(null)
    setChainId(null)
    resetBalances('disconnected')
    persistAutoConnectPreference(false)
  }, [persistAutoConnectPreference, resetBalances])

  useEffect(() => {
    if (!shouldAutoConnect) {
      setAccount(null)
      resetBalances('disconnected')
      return
    }

    initializeConnection()
  }, [initializeConnection, resetBalances, shouldAutoConnect])

  useEffect(() => {
    const ethereum = window.ethereum

    if (!ethereum) {
      return
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null)
        persistAutoConnectPreference(false)
        resetBalances('disconnected')
        return
      }

      const walletAddress = accounts[0]
      setAccount(walletAddress)
      fetchBalances(walletAddress)
    }

    const handleChainChanged = () => {
      providerRef.current = null
      initializeConnection()
    }

    const handleDisconnect = () => {
      handleManualDisconnect()
    }

    ethereum.on?.('accountsChanged', handleAccountsChanged)
    ethereum.on?.('chainChanged', handleChainChanged)
    ethereum.on?.('disconnect', handleDisconnect)

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum.removeListener?.('chainChanged', handleChainChanged)
      ethereum.removeListener?.('disconnect', handleDisconnect)
    }
  }, [
    fetchBalances,
    handleManualDisconnect,
    initializeConnection,
    persistAutoConnectPreference,
    resetBalances
  ])

  useEffect(() => {
    if (account) {
      fetchBalances(account)
    }
  }, [account, fetchBalances])

  const shouldShowBalances = status === 'ready' && !!account
  const isWalletDetected = typeof window !== 'undefined' && !!window.ethereum

  return (
    <section className="balance-display">
      <div className="balance-heading">
        <h2>{heading}</h2>
        {chainId && shouldShowBalances ? <span className="chain-pill">Chain ID: {chainId}</span> : null}
      </div>

      {status === 'loading' && <p className="muted">Fetching balances...</p>}
      {status === 'no-wallet' && <p className="balance-error">Please install a Web3 wallet (e.g. MetaMask).</p>}
      {status === 'disconnected' && <p className="muted">Connect your wallet to see balances.</p>}
      {tokenAddressError && <p className="balance-error">{tokenAddressError}</p>}
      {status === 'error' && error ? <p className="balance-error">{error}</p> : null}

      {isWalletDetected ? (
        <div className="balance-actions">
          {!account ? (
            <button
              className="connect-button"
              onClick={handleConnect}
              disabled={isConnecting || status === 'loading'}
            >
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          ) : (
            <button className="disconnect-button" onClick={handleManualDisconnect}>
              Disconnect
            </button>
          )}
        </div>
      ) : null}

      {shouldShowBalances ? (
        <div className="balance-card">
          <p className="muted">Account: {truncateAddress(account)}</p>

          {nativeBalance ? (
            <div className="balance-row">
              <span>Native token</span>
              <strong>
                {nativeBalance.formatted} {nativeBalance.symbol}
              </strong>
            </div>
          ) : null}

          {tokenBalance ? (
            <div className="balance-row">
              <span>Custom token</span>
              <strong>
                {tokenBalance.formatted} {tokenBalance.symbol}
              </strong>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default BalanceDisplay

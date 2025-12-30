import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { BrowserProvider } from 'ethers'

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'no-wallet' | 'error'

interface WalletContextType {
  account: string | null
  chainId: number | null
  provider: BrowserProvider | null
  isConnected: boolean
  status: WalletStatus
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const AUTO_CONNECT_STORAGE_KEY = 'wallet:auto-connect'

const readAutoConnectPreference = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true
  }
  return window.localStorage.getItem(AUTO_CONNECT_STORAGE_KEY) !== '0'
}

const persistAutoConnectPreference = (value: boolean) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(AUTO_CONNECT_STORAGE_KEY, value ? '1' : '0')
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shouldAutoConnect, setShouldAutoConnect] = useState<boolean>(readAutoConnectPreference)
  const providerRef = useRef<BrowserProvider | null>(null)

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    if (!providerRef.current) {
      providerRef.current = new BrowserProvider(window.ethereum)
    }

    return providerRef.current
  }, [])

  const resetState = useCallback((nextStatus: WalletStatus) => {
    setStatus(nextStatus)
    setError(null)
  }, [])

  const updateChainId = useCallback(async () => {
    const provider = getProvider()
    if (!provider) return

    try {
      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))
    } catch (err) {
      console.error('Failed to fetch chain ID:', err)
    }
  }, [getProvider])

  const initializeConnection = useCallback(async () => {
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
        resetState('disconnected')
        return
      }

      // Only auto-connect if preference is enabled
      if (!shouldAutoConnect) {
        setAccount(null)
        resetState('disconnected')
        return
      }

      const walletAddress = accounts[0]
      setAccount(walletAddress)
      await updateChainId()
      setStatus('connected')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to read wallet accounts.'
      setError(message)
      setStatus('error')
    }
  }, [getProvider, resetState, shouldAutoConnect, updateChainId])

  const connect = useCallback(async () => {
    const provider = getProvider()

    if (!provider) {
      setStatus('no-wallet')
      setError('Browser wallet was not detected.')
      return
    }

    setStatus('connecting')
    setError(null)

    try {
      // Try to request permissions first (optional)
      try {
        await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      } catch (permissionError) {
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
      await updateChainId()
      setStatus('connected')
      persistAutoConnectPreference(true)
      setShouldAutoConnect(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet.'
      setError(message)
      setStatus('error')
      throw err
    }
  }, [getProvider, updateChainId])

  const disconnect = useCallback(() => {
    providerRef.current = null
    setAccount(null)
    setChainId(null)
    resetState('disconnected')
    persistAutoConnectPreference(false)
    setShouldAutoConnect(false)
  }, [resetState])

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection()
  }, [initializeConnection])

  // Listen to wallet events
  useEffect(() => {
    const ethereum = window.ethereum

    if (!ethereum) {
      return
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnect()
        return
      }

      const walletAddress = accounts[0]
      setAccount(walletAddress)
      setStatus('connected')
    }

    const handleChainChanged = () => {
      providerRef.current = null
      initializeConnection()
    }

    const handleDisconnect = () => {
      disconnect()
    }

    ethereum.on?.('accountsChanged', handleAccountsChanged)
    ethereum.on?.('chainChanged', handleChainChanged)
    ethereum.on?.('disconnect', handleDisconnect)

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum.removeListener?.('chainChanged', handleChainChanged)
      ethereum.removeListener?.('disconnect', handleDisconnect)
    }
  }, [disconnect, initializeConnection])

  const value: WalletContextType = {
    account,
    chainId,
    provider: providerRef.current,
    isConnected: status === 'connected' && !!account,
    status,
    error,
    connect,
    disconnect
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

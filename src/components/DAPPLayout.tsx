import { BrowserProvider } from 'ethers'
import axios, { AxiosError } from 'axios'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

type AuthStatus = 'idle' | 'wallet-missing' | 'authenticating' | 'authenticated' | 'error'

type AuthContextValue = {
  isAuthenticated: boolean
  walletAddress: string | null
  status: AuthStatus
  errorMessage: string | null
  retryAuthentication: () => void
}

const authBaseUrl = (import.meta.env.VITE_AUTH_API_URL ?? '').trim()

const buildEndpoint = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!authBaseUrl) {
    return normalizedPath
  }

  const sanitizedBase = authBaseUrl.endsWith('/') ? authBaseUrl.slice(0, -1) : authBaseUrl
  return `${sanitizedBase}${normalizedPath}`
}

const NONCE_ENDPOINT = buildEndpoint('/auth/nonce')
const VERIFY_ENDPOINT = buildEndpoint('/auth/verify')

type NonceResponse = {
  nonce?: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within DAPPLayout')
  }

  return context
}

const getInitialProviderState = () => typeof window !== 'undefined' && !!window.ethereum

const DAPPLayout = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    getInitialProviderState() ? 'idle' : 'wallet-missing'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null)
  const [authAttemptedAddress, setAuthAttemptedAddress] = useState<string | null>(null)
  const [hasProvider, setHasProvider] = useState<boolean>(() => getInitialProviderState())
  const authInFlightRef = useRef(false)
  const providerRef = useRef<BrowserProvider | null>(null)

  const ensureProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    if (!providerRef.current) {
      providerRef.current = new BrowserProvider(window.ethereum)
    }

    return providerRef.current
  }, [])

  const updateWalletAddress = useCallback((accounts: string[] | undefined | null) => {
    if (!accounts || accounts.length === 0) {
      setWalletAddress(null)
      setStatus(prev => (prev === 'wallet-missing' ? prev : 'idle'))
      setErrorMessage(null)
      setIsAuthenticated(false)
      setAuthenticatedAddress(null)
      setAuthAttemptedAddress(null)
      return
    }

    const nextAddress = accounts[0]
    setWalletAddress(nextAddress)
    setErrorMessage(null)
    setIsAuthenticated(false)
    setAuthenticatedAddress(null)
    setAuthAttemptedAddress(null)
  }, [])

  const connectWallet = useCallback(async () => {
    const provider = ensureProvider()

    if (!provider) {
      setHasProvider(false)
      setStatus('wallet-missing')
      setErrorMessage('Web3 гаманець не знайдено.')
      return
    }

    try {
      setErrorMessage(null)

      try {
        await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      } catch (permissionError) {
        const err = permissionError as { code?: number }
        const isUserRejected = err?.code === 4001
        const isMethodMissing = err?.code === -32601

        if (!isUserRejected && !isMethodMissing) {
          console.warn('wallet_requestPermissions failed; continuing with eth_requestAccounts', permissionError)
        }

        if (isUserRejected) {
          throw permissionError
        }
      }

      const accounts = (await provider.send('eth_requestAccounts', [])) as string[] | undefined
      updateWalletAddress(accounts)
    } catch (error) {
      const err = error as { code?: number }
      const message =
        err?.code === 4001
          ? 'Користувач скасував підключення гаманця.'
          : 'Не вдалося підключити гаманець.'
      setErrorMessage(message)
    }
  }, [ensureProvider, updateWalletAddress])

  const parseAuthError = (error: unknown) => {
    if ((error as { code?: number })?.code === 4001) {
      return 'Підпис запиту скасовано користувачем.'
    }

    if (axios.isAxiosError(error)) {
      const responseMessage =
        (error as AxiosError<{ message?: string }>).response?.data?.message ?? error.message
      return responseMessage ?? 'Авторизація не вдалася.'
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'Авторизація не вдалася.'
  }

  const authenticate = useCallback(
    async (address: string) => {
      if (authInFlightRef.current) {
        return
      }

      const provider = ensureProvider()

      if (!provider) {
        setHasProvider(false)
        setStatus('wallet-missing')
        setErrorMessage('Web3 гаманець не знайдено.')
        return
      }

      authInFlightRef.current = true
      setAuthAttemptedAddress(address)
      setStatus('authenticating')
      setErrorMessage(null)

      try {
        const { data } = await axios.get<NonceResponse>(NONCE_ENDPOINT, {
          params: { address }
        })
        const nonce = data?.nonce

        if (!nonce) {
          throw new Error('Сервер не повернув nonce.')
        }

        const signer = await provider.getSigner()
        const signature = await signer.signMessage(nonce)

        const response = await axios.post(
          VERIFY_ENDPOINT,
          { address, signature },
          { headers: { 'Content-Type': 'application/json' } }
        )

        if (response.status !== 200) {
          throw new Error('Бекенд відхилив підпис.')
        }

        setIsAuthenticated(true)
        setAuthenticatedAddress(address)
        setStatus('authenticated')
        setErrorMessage(null)
      } catch (error) {
        setIsAuthenticated(false)
        setAuthenticatedAddress(null)
        setStatus('error')
        setErrorMessage(parseAuthError(error))
      } finally {
        authInFlightRef.current = false
      }
    },
    [ensureProvider]
  )

  const retryAuthentication = useCallback(() => {
    if (!walletAddress) {
      return
    }

    setStatus('idle')
    setErrorMessage(null)
    setIsAuthenticated(false)
    setAuthenticatedAddress(null)
    setAuthAttemptedAddress(null)
  }, [walletAddress])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const { ethereum } = window

    if (!ethereum) {
      setHasProvider(false)
      setStatus('wallet-missing')
      providerRef.current = null
      return
    }

    setHasProvider(true)
    providerRef.current = new BrowserProvider(ethereum)

    const handleAccountsChanged = (accounts: string[]) => {
      updateWalletAddress(accounts)
    }

    const handleDisconnect = () => {
      providerRef.current = null
      updateWalletAddress([])
    }

    ethereum.on?.('accountsChanged', handleAccountsChanged)
    ethereum.on?.('disconnect', handleDisconnect)

    ethereum
      .request?.({ method: 'eth_accounts' })
      .then((accounts: string[] | undefined) => {
        updateWalletAddress(accounts ?? [])
      })
      .catch(() => {
        updateWalletAddress([])
      })

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum.removeListener?.('disconnect', handleDisconnect)
    }
  }, [updateWalletAddress])

  useEffect(() => {
    if (!walletAddress) {
      return
    }

    if (isAuthenticated && authenticatedAddress === walletAddress) {
      return
    }

    if (authAttemptedAddress === walletAddress) {
      return
    }

    if (authInFlightRef.current) {
      return
    }

    void authenticate(walletAddress)
  }, [walletAddress, isAuthenticated, authenticatedAddress, authAttemptedAddress, authenticate])

  const fallbackContent = useMemo(() => {
    if (!hasProvider) {
      return (
        <div className="balance-display">
          <h2>Потрібен Web3 гаманець</h2>
          <p className="muted">
            Встановіть MetaMask або інший гаманець, після чого повторно відкрийте сторінку.
          </p>
        </div>
      )
    }

    if (!walletAddress) {
      return (
        <div className="balance-display">
          <h2>Підключіть гаманець</h2>
          <p className="muted">Будь ласка, підключіть гаманець, щоб пройти авторизацію.</p>
          <div className="balance-actions">
            <button onClick={connectWallet}>Підключити гаманець</button>
          </div>
          {errorMessage ? <p className="balance-error">{errorMessage}</p> : null}
        </div>
      )
    }

    if (status === 'authenticating') {
      return (
        <div className="balance-display">
          <p className="muted">Авторизація... Підтвердьте підпис у гаманці.</p>
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className="balance-display">
          <p className="balance-error">{errorMessage ?? 'Авторизація не вдалася.'}</p>
          <div className="balance-actions">
            <button onClick={retryAuthentication}>Спробувати ще раз</button>
          </div>
        </div>
      )
    }

    if (status === 'idle') {
      return (
        <div className="balance-display">
          <p className="muted">Готуємо авторизацію...</p>
        </div>
      )
    }

    return null
  }, [connectWallet, errorMessage, hasProvider, retryAuthentication, status, walletAddress])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      walletAddress,
      status,
      errorMessage,
      retryAuthentication
    }),
    [errorMessage, isAuthenticated, retryAuthentication, status, walletAddress]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {isAuthenticated ? children : fallbackContent}
    </AuthContext.Provider>
  )
}

export default DAPPLayout

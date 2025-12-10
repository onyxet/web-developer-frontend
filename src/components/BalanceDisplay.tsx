import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserProvider, Contract, formatUnits, getAddress } from 'ethers'

import type { BalanceType } from '../types/global'
import { useAuth } from './DAPPLayout'

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

type WalletStatus = 'idle' | 'loading' | 'ready' | 'provider-missing' | 'error'

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
export const BalanceDisplay = ({
  customTokenAddress,
  heading = 'Wallet balances'
}: BalanceDisplayProps) => {
  const [status, setStatus] = useState<WalletStatus>('idle')
  const [chainId, setChainId] = useState<number | null>(null)
  const [nativeBalance, setNativeBalance] = useState<BalanceType | null>(null)
  const [tokenBalance, setTokenBalance] = useState<BalanceType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const providerRef = useRef<BrowserProvider | null>(null)
  const { walletAddress } = useAuth()
  const resolvedWalletAddress = typeof walletAddress === 'string' ? walletAddress : null

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

  const resetBalances = useCallback(() => {
    setNativeBalance(null)
    setTokenBalance(null)
    setChainId(null)
  }, [])

  const fetchBalances = useCallback(
    async (walletAddress: string) => {
      const provider = getProvider()

      if (!provider) {
        setError('Web3 провайдер не знайдено.')
        setStatus('provider-missing')
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

  useEffect(() => {
    if (!resolvedWalletAddress) {
      setStatus('idle')
      resetBalances()
      return
    }

    void fetchBalances(resolvedWalletAddress)
  }, [fetchBalances, resetBalances, resolvedWalletAddress])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return
    }

    const handleChainChanged = () => {
      providerRef.current = null
      if (resolvedWalletAddress) {
        void fetchBalances(resolvedWalletAddress)
      }
    }

    const handleDisconnect = () => {
      providerRef.current = null
      setStatus('idle')
      resetBalances()
    }

    window.ethereum.on?.('chainChanged', handleChainChanged)
    window.ethereum.on?.('disconnect', handleDisconnect)

    return () => {
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged)
      window.ethereum?.removeListener?.('disconnect', handleDisconnect)
    }
  }, [fetchBalances, resetBalances, resolvedWalletAddress])

  const shouldShowBalances = status === 'ready' && !!resolvedWalletAddress

  return (
    <section className="balance-display">
      <div className="balance-heading">
        <h2>{heading}</h2>
        {chainId && shouldShowBalances ? <span className="chain-pill">Chain ID: {chainId}</span> : null}
      </div>

      {status === 'idle' && !resolvedWalletAddress ? (
        <p className="muted">Очікуємо на адресу гаманця...</p>
      ) : null}
      {status === 'loading' && <p className="muted">Отримуємо баланси...</p>}
      {status === 'provider-missing' && (
        <p className="balance-error">Будь ласка, встановіть Web3 гаманець (MetaMask тощо).</p>
      )}
      {tokenAddressError && <p className="balance-error">{tokenAddressError}</p>}
      {status === 'error' && error ? <p className="balance-error">{error}</p> : null}

      {shouldShowBalances ? (
        <div className="balance-card">
          <p className="muted">Account: {truncateAddress(resolvedWalletAddress)}</p>

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

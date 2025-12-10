import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { hoodi } from './customNetworks'
import type { AppKitNetwork } from '@reown/appkit/networks'

// 0. Додаємо projectId
const projectId = import.meta.env.VITE_PROJECT_ID

// 1. додаємо помилку якщо !projectId
if (!projectId) {
  throw new Error('VITE_PROJECT_ID is not set')
}

// 2. metadata - щоб гаманцю було зрозуміло, хто ти та що саме просиш.
// metadata в AppKit/Web3Modal — це паспорт твого dApp, який летить у гаманець під час конекту
// через WalletConnect/адаптери.
export const metadata = {
  name: 'Web3 Hoodi Wallet',
  description: 'Web3 Wallet Connection App for Hoodi Network',
  url: 'https://hoodi-wallet.app', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// 3. Прописуємо Networks які будемо використовувати
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [hoodi]

// 4. Створити WagmiAdapter і передати в нього projectId та networks
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// 5. Створюємо QueryClient для React Query
export const queryClient = new QueryClient()

// 6. Створюємо AppKit instance
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
  },
})

export { WagmiProvider }

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config, projectId } from './lib/wagmiConfig.ts'

// Setup queryClient
const queryClient = new QueryClient()

// Create Web3Modal instance
createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false, 
  enableOnramp: false
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)

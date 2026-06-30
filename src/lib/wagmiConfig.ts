import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { bsc } from 'wagmi/chains'

export const projectId = import.meta.env.VITE_WC_PROJECT_ID || '36e2a0fbe8b002aeeba76193366e4962'

const metadata = {
  name: 'Parity',
  description: 'BSC Arbitrage Co-Pilot',
  url: 'https://parity-arb.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

export const config = defaultWagmiConfig({
  chains: [bsc],
  projectId,
  metadata,
  auth: {
    email: false, // Disable email login to keep it web3 native
    socials: [],
    showWallets: true,
    walletFeatures: true
  },
})

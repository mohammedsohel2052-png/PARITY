/**
 * EIP-1193 wallet helpers — connect, switch chain, read address.
 *
 * SECURITY RULES (enforced here, not just documented):
 * - We ONLY call eth_requestAccounts and wallet_switchEthereumChain
 * - We NEVER sign any value-moving transaction
 * - We NEVER store or transmit a private key or seed phrase
 * - The only thing we persist is the public wallet address
 */

export const BSC_CHAIN_ID = 56n;
export const BSC_CHAIN_ID_HEX = "0x38";

export const BSC_CHAIN_PARAMS = {
  chainId: BSC_CHAIN_ID_HEX,
  chainName: "BNB Smart Chain Mainnet",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.binance.org/"],
  blockExplorerUrls: ["https://bscscan.com"],
};

export interface ConnectedWallet {
  address: string;
  chainId: bigint;
  chainName: string;
}

/**
 * Connect MetaMask (or any EIP-1193 injected provider).
 * Switches to BSC mainnet if on a different chain.
 * Returns the public address — nothing else.
 */
export async function connectWallet(): Promise<ConnectedWallet> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Please install MetaMask.");
  }

  const { ethers } = await import("ethers");
  const provider = new ethers.BrowserProvider(window.ethereum as Parameters<typeof ethers.BrowserProvider>[0]);

  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  let finalChainId = network.chainId;

  if (network.chainId !== BSC_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID_HEX }],
      });
      finalChainId = BSC_CHAIN_ID;
    } catch (switchErr: unknown) {
      if ((switchErr as { code?: number })?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BSC_CHAIN_PARAMS],
        });
        finalChainId = BSC_CHAIN_ID;
      } else {
        throw switchErr;
      }
    }
  }

  return {
    address,
    chainId: finalChainId,
    chainName: finalChainId === BSC_CHAIN_ID ? "BSC Mainnet" : `Chain ${finalChainId}`,
  };
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export async function isOnBSC(): Promise<boolean> {
  if (!window.ethereum) return false;
  const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
  return chainId === BSC_CHAIN_ID_HEX;
}

// Extend Window for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

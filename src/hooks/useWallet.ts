import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import type { WalletState } from "../types";

export function useWallet(): WalletState & { isOnBSC: boolean; shortAddress: string | null; connect: () => void; disconnect: () => void } {
  const { address, isConnecting, isDisconnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  const [walletState, setWalletState] = useState<WalletState & { isOnBSC: boolean; shortAddress: string | null }>({
    connected: false,
    connecting: false,
    address: null,
    error: null,
    isOnBSC: false,
    shortAddress: null,
  });

  useEffect(() => {
    if (address) {
      setWalletState({
        connected: true,
        connecting: false,
        address,
        error: null,
        isOnBSC: chain?.id === 56,
        shortAddress: `${address.slice(0, 6)}…${address.slice(-4)}`,
      });
    } else if (isConnecting) {
      setWalletState(s => ({ ...s, connecting: true }));
    } else {
      setWalletState({
        connected: false,
        connecting: false,
        address: null,
        error: null,
        isOnBSC: false,
        shortAddress: null,
      });
    }
  }, [address, isConnecting, isDisconnected, chain]);

  return {
    ...walletState,
    connect: () => open(),
    disconnect: () => disconnect(),
  };
}

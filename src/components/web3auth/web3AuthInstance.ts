// Web3Auth Libraries
import { Web3AuthConnector } from "@web3auth/web3auth-wagmi-connector";
import { Web3Auth } from "@web3auth/modal";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { Chain } from "wagmi/chains";

export default function web3AuthConnectorInstance(chains: Chain[]) {
    if (!process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID)
        throw new Error("Missing NEXT_PUBLIC_WEB3AUTH_CLIENT_ID")
    if (!process.env.NEXT_PUBLIC_RPC)
      throw new Error("Missing NEXT_PUBLIC_RPC")
    
    // Create Web3Auth Instance
  const name = "Web3 Auth";
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x" + chains[0].id.toString(16),
    rpcTarget: process.env.NEXT_PUBLIC_RPC,
    displayName: chains[0].name,
    tickerName: chains[0].nativeCurrency?.name,
    ticker: chains[0].nativeCurrency?.symbol,
    blockExplorerUrl: chains[0].blockExplorers?.default.url[0] as string,
  };

  const privateKeyProvider = new EthereumPrivateKeyProvider({ config: { chainConfig } });

  const web3AuthInstance = new Web3Auth({
    clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
    // web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    privateKeyProvider,
    chainConfig,
    enableLogging: true,
  });

  return Web3AuthConnector({
      web3AuthInstance,
  });
}
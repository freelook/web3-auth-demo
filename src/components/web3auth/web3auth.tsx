"use client"
import { Web3Auth } from "@web3auth/modal"
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";

import { Web3AuthConnector } from "@web3auth/web3auth-wagmi-connector"
import { useCallback, useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect, useWalletClient, useBalance } from "wagmi"
import { usePublicClient } from "wagmi"
import { Loader } from "@/components/loader"
import { SmartAccount, signerToSafeSmartAccount } from "permissionless/accounts"
import { Address, Chain, Hash, Transport, http } from "viem"
import { ENTRYPOINT_ADDRESS_V06, SmartAccountClient, createSmartAccountClient, walletClientToSmartAccountSigner } from "permissionless"
import { createPimlicoBundlerClient, createPimlicoPaymasterClient } from "permissionless/clients/pimlico"
import { DemoTransactionButton } from "@/components/demo-transaction"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { ENTRYPOINT_ADDRESS_V06_TYPE } from "permissionless/types";
import { sepolia } from "viem/chains";
import Web3AuthConnectorInstance from "./web3AuthInstance";

if (!process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID)
    throw new Error("Missing NEXT_PUBLIC_WEB3AUTH_CLIENT_ID")

if (!process.env.NEXT_PUBLIC_PIMLICO_API_KEY)
    throw new Error("Missing NEXT_PUBLIC_PIMLICO_API_KEY")

const pimlicoRpcUrl = `https://api.pimlico.io/v2/11155111/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`

const pimlicoPaymaster = createPimlicoPaymasterClient({
    transport: http(pimlicoRpcUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V06
})

const bundlerClient = createPimlicoBundlerClient({
    transport: http(pimlicoRpcUrl),
    entryPoint: ENTRYPOINT_ADDRESS_V06,
})

export const Web3AuthFlow = () => {
    const { isConnected } = useAccount()
    const [showLoader, setShowLoader] = useState<boolean>(false)
    const [smartAccountClient, setSmartAccountClient] =
        useState<SmartAccountClient<ENTRYPOINT_ADDRESS_V06_TYPE> | null>(
            null
        )
    const publicClient = usePublicClient()
    const { data: walletClient } = useWalletClient()
    const [txHash, setTxHash] = useState<string | null>(null)
    const { disconnect } = useDisconnect()

    const { connect } = useConnect()
    
    const connector = Web3AuthConnectorInstance([sepolia])

    const signIn = useCallback(async () => {
        setShowLoader(true)
        connect({ connector })
    }, [connect])

    const signOut = useCallback(async () => {
        setShowLoader(false)
        disconnect()
    }, [disconnect])

    useEffect(() => {
        ;(async () => {
            if (isConnected && walletClient && publicClient) {
                const customSigner = walletClientToSmartAccountSigner(walletClient)

                const safeSmartAccountClient = await signerToSafeSmartAccount(
                    publicClient,
                    {
                        entryPoint: ENTRYPOINT_ADDRESS_V06,
                        signer: customSigner,
                        safeVersion: "1.4.1",
                        saltNonce: BigInt(0)
                    }
                )

                const smartAccountClient = createSmartAccountClient({
                    account: safeSmartAccountClient,
                    entryPoint: ENTRYPOINT_ADDRESS_V06,
                    chain: sepolia,
                    bundlerTransport: http(pimlicoRpcUrl, {
                        timeout: 30_000
                    }),
                    middleware: {
                        gasPrice: async () => (await bundlerClient.getUserOperationGasPrice()).fast,
                        sponsorUserOperation: (args) => pimlicoPaymaster.sponsorUserOperation({
                            ...args,
                            //sponsorshipPolicyId: "..." // add sponsorshipPolicyId to send Gasless Transaction
                        }),
                    },
                })

                setSmartAccountClient(smartAccountClient)
            }
        })()
    }, [isConnected, walletClient, publicClient])

    const onSendTransaction = (txHash: Hash) => {
        setTxHash(txHash)
    }

    const {data: balance} = useBalance({
        address: smartAccountClient?.account?.address
    })

    if (isConnected && smartAccountClient) {
        return (
            <div>
                <div>
                    Smart contract wallet address:{" "}
                    <p className="fixed left-0 top-0 flex flex-col w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                        <code>{smartAccountClient.account?.address}</code>
                    </p>
                </div>
                <div className="mt-4">
                    Smart contract wallet balance:{" "}
                    <p className="fixed left-0 top-0 flex flex-col w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                        <code>{balance?.formatted} ETH</code>
                    </p>
                </div>
                <div className="flex gap-x-4">
                    <button
                        onClick={signOut}
                        className="mt-6 flex justify-center items-center w-64 cursor-pointer border-2 border-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Sign out
                    </button>
                    <DemoTransactionButton
                        smartAccountClient={smartAccountClient}
                        onSendTransaction={onSendTransaction}
                    />
                </div>
                {txHash && (
                    <p className="mt-4">
                        Transaction hash:{" "}
                        <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                        >
                            {txHash}
                        </a>
                    </p>
                )}
            </div>
        )
    }

    return (
        <button
            onClick={signIn}
            className="flex justify-center items-center w-64 cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
            {!showLoader && <p className="mr-4">Sign in with Web3Auth</p>}
            {showLoader && <Loader />}
        </button>
    )
}

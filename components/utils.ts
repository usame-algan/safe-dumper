import { EthersAdapter } from '@safe-global/protocol-kit'
import { BrowserProvider, ethers } from 'ethers'
import { useMemo } from 'react'
import type { Account, Chain, Client, Transport } from 'viem'
import { type Config, useConnectorClient } from 'wagmi'

export const createEthersAdapter = async (provider: BrowserProvider) => {
  const signer = await provider.getSigner(0)
  return new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  })
}

export function clientToProvider(client: Client<Transport, Chain, Account>) {
  const { chain, transport } = client

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }

  return new BrowserProvider(transport, network)
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  return useMemo(() => (client ? clientToProvider(client) : undefined), [client])
}

import { getSafeOverviews } from '@safe-global/safe-gateway-typescript-sdk'

export const fetchOwnedSafes = async (chainId: string, account: string, safeAddresses: string[]) => {
  if (safeAddresses.length === 0) return

  const safesStrings = safeAddresses.map((safe) => `${chainId}:${safe}` as `${number}:0x${string}`)

  return getSafeOverviews(safesStrings, {
    trusted: true,
    exclude_spam: false,
    currency: 'USD',
    walletAddress: account,
  })
}

import { useQuery } from '@tanstack/react-query'
import { getOwnedSafes } from '@safe-global/safe-gateway-typescript-sdk'
import { useAccount } from 'wagmi'

const useFetchOwnedSafes = () => {
  const account = useAccount()

  return useQuery({
    queryKey: [account.chainId, account.address],
    queryFn: () => {
      if (!account.chainId || !account.address) return

      return getOwnedSafes(account.chainId.toString(), account.address)
    },
  })
}

export default useFetchOwnedSafes

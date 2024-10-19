import { useQuery } from '@tanstack/react-query'
import { fetchOwnedSafes } from '../utils/utils'
import { useAccount } from 'wagmi'

const useFetchSafeInfo = (selectedSafes: string[]) => {
  const account = useAccount()

  return useQuery({
    queryKey: [account.chainId, account.address, selectedSafes],
    queryFn: () => {
      if (!account.chainId || !account.address) return

      return fetchOwnedSafes(account.chainId.toString(), account.address, selectedSafes)
    },
  })
}

export default useFetchSafeInfo

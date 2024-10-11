import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import type { NextPage } from 'next'
import Safe, { encodeMultiSendData, getMultiSendCallOnlyContract } from '@safe-global/protocol-kit'
import { getMultiSendCallOnlyDeployment } from '@safe-global/safe-deployments'
import Head from 'next/head'
import { getOwnedSafes, getSafeOverviews, SafeOverview } from '@safe-global/safe-gateway-typescript-sdk'
import { useAccount } from 'wagmi'

import styles from '../styles/Home.module.css'
import { Button, Checkbox, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import { blo } from 'blo'
import Image from 'next/image'
import { createEthersAdapter, useEthersProvider } from '../components/utils'

const Home: NextPage = () => {
  const [ownedSafes, setOwnedSafes] = useState<SafeOverview[]>([])
  const [ownedSafeAddresses, setOwnedSafeAddresses] = useState<string[]>([])
  const [selectedSafeIndexes, setSelectedSafeIndexes] = useState<number[]>([])
  const [loadedSafesIndex, setLoadedSafesIndex] = useState<number>(0)
  const account = useAccount()
  const provider = useEthersProvider({ chainId: account.chainId })

  const onLoadMore = () => {
    setLoadedSafesIndex((prev) => prev + 1)
  }

  useEffect(() => {
    if (!account.chainId || !account.address) return

    getOwnedSafes(account.chainId.toString(), account.address).then(({ safes }) => setOwnedSafeAddresses(safes))
  }, [account.chainId, account.address])

  useEffect(() => {
    if (!account.chainId || !account.address) return

    const startIndex = loadedSafesIndex * 10
    const endIndex = startIndex + 10
    const currentOwnedSafeAddresses = ownedSafeAddresses.slice(startIndex, endIndex)

    const fetchOwnedSafes = async (chainId: string, account: string) => {
      if (currentOwnedSafeAddresses.length === 0) return

      const safesStrings = currentOwnedSafeAddresses.map((safe) => `${chainId}:${safe}` as `${number}:0x${string}`)
      const safeOverviews = await getSafeOverviews(safesStrings, {
        trusted: true,
        exclude_spam: false,
        currency: 'USD',
        walletAddress: account,
      })

      setOwnedSafes((prev) => [...prev, ...safeOverviews])
    }

    fetchOwnedSafes(account.chainId.toString(), account.address)
  }, [account.address, account.chainId, ownedSafeAddresses, loadedSafesIndex])

  const onDump = async () => {
    if (!provider || !account.address || !ownedSafes) return

    try {
      const safeTxs = await Promise.all(
        selectedSafeIndexes.map(async (selectedSafeIndex) => {
          const safeAddress = ownedSafes[selectedSafeIndex].address.value
          const safeSdk = await Safe.create({ safeAddress, provider })

          const safeTx = await safeSdk.createSwapOwnerTx({
            oldOwnerAddress: account.address!,
            newOwnerAddress: '0x0000000000000000000000000000000000000002',
          })

          const signedTx = await safeSdk.signTransaction(safeTx)

          return {
            operation: 0,
            to: safeAddress,
            value: '0',
            data: await safeSdk.getEncodedTransaction(signedTx),
          }
        }),
      )

      const multiSendTx = encodeMultiSendData(safeTxs)

      const multiSendContract = getMultiSendCallOnlyDeployment()

      if (!multiSendContract) return

      const ethersAdapter = await createEthersAdapter(provider)

      const instance = await getMultiSendCallOnlyContract({
        safeVersion: '1.3.0',
        ethAdapter: ethersAdapter,
      })

      await instance.contract.connect(await provider.getSigner()).multiSend(multiSendTx)
    } catch (e) {
      console.log(e)
    }
  }

  const handleToggle = (index: number) => async () => {
    if (!account.chainId || !ownedSafes) return

    const currentIndex = selectedSafeIndexes.indexOf(index)
    const newChecked = [...selectedSafeIndexes]

    // Element is toggled on
    if (currentIndex === -1) {
      newChecked.push(index)
    } else {
      newChecked.splice(currentIndex, 1)
    }

    setSelectedSafeIndexes(newChecked)
  }

  const toggleAll = () => {
    if (!ownedSafes) return

    setSelectedSafeIndexes((prev) => {
      if (prev.length > 0) {
        return []
      } else {
        const multisigSafeIndexes = ownedSafes
          .map((safe, index) => (safe.threshold > 1 ? index : -1))
          .filter((index) => index !== -1)

        const allIndexes = Array.from({ length: ownedSafes.length }, (_, index) => index)
        return allIndexes.filter((_, index) => !multisigSafeIndexes.includes(index))
      }
    })
  }

  const hasMoreSafes = loadedSafesIndex * 10 + 10 < ownedSafeAddresses.length

  return (
    <div className={styles.container}>
      <Head>
        <title>Safe Dump</title>
      </Head>

      <main className={styles.main}>
        <Stack gap={1} alignItems="center" mb={6} textAlign="center">
          <Typography variant="h4" fontWeight="bold">
            Safe Dump
          </Typography>
          <Typography mb={1}>A safe place to quickly get rid of all your 1/1 Safe Accounts</Typography>
          <ConnectButton />
        </Stack>

        {account.address && ownedSafes && (
          <div className={styles.wrapper}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Typography>
                Safe Accounts on {account.chain?.name} ({ownedSafes.length})
              </Typography>
              <Stack direction="row" gap={1}>
                <Button variant="outlined" size="small" onClick={toggleAll}>
                  Toggle all
                </Button>

                <Button onClick={onDump} size="small" variant="contained" disabled={selectedSafeIndexes.length === 0}>
                  Dump Safe(s)
                </Button>
              </Stack>
            </Stack>

            <List dense component="div" role="list" className={styles.list} disablePadding>
              {ownedSafes.map((safe, index) => {
                return (
                  <ListItemButton
                    key={index}
                    role="listitem"
                    onClick={handleToggle(index)}
                    divider
                    disabled={safe.threshold > 1}
                  >
                    <ListItemIcon>
                      <Checkbox
                        size="small"
                        checked={selectedSafeIndexes.indexOf(index) !== -1}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" gap={1} alignItems="center">
                          <Image
                            alt={safe.address.value}
                            src={blo(safe.address.value as `0x${string}`)}
                            width={36}
                            height={36}
                            className={styles.identicon}
                          />
                          <div>
                            <Typography className={styles.address}>{safe.address.value}</Typography>
                            <Typography variant="body2" color="grey.700">
                              {safe.fiatTotal} USD
                            </Typography>
                          </div>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                )
              })}
            </List>

            {hasMoreSafes && <Button onClick={onLoadMore}>Load more</Button>}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home

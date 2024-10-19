import { useEffect, useState } from 'react'
import { blo } from 'blo'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import type { NextPage } from 'next'
import Image from 'next/image'
import Head from 'next/head'
import { useAccount } from 'wagmi'
import { Button, Checkbox, List, ListItemButton, ListItemDecorator, Stack, Typography } from '@mui/joy'
import SafeLogo from '../public/images/safe_logo.svg'

import styles from '../styles/Home.module.css'
import useFetchOwnedSafes from '../hooks/useFetchOwnedSafes'
import ReviewDump from '../components/ReviewDump'

const VISIBLE_SAFES = 10

const Home: NextPage = () => {
  const [selectedSafeAddresses, setSelectedSafeAddresses] = useState<Set<string>>(new Set())
  const [loadedSafesIndex, setLoadedSafesIndex] = useState<number>(0)
  const [open, setOpen] = useState<boolean>(false)
  const account = useAccount()
  const { data: ownedSafes, error, isPending } = useFetchOwnedSafes()

  const visibleSafes = ownedSafes ? ownedSafes.safes.slice(0, VISIBLE_SAFES * loadedSafesIndex + VISIBLE_SAFES) : []

  const onLoadMore = () => {
    setLoadedSafesIndex((prev) => prev + 1)
  }

  const handleToggle = (address: string) => async () => {
    if (!account.chainId || !ownedSafes) return

    setSelectedSafeAddresses((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(address)) {
        newSet.delete(address)
      } else {
        newSet.add(address)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    setSelectedSafeAddresses((prev) => {
      if (prev.size > 0) {
        return new Set()
      } else {
        const newSet = new Set<string>()
        visibleSafes.forEach((safe) => {
          newSet.add(safe)
        })
        return newSet
      }
    })
  }

  useEffect(() => {
    setLoadedSafesIndex(0)
  }, [account.chainId])

  const hasMoreSafes = ownedSafes && loadedSafesIndex * 10 + 10 < ownedSafes.safes.length

  return (
    <div className={styles.container}>
      <Head>
        <title>Safe Dumper</title>
      </Head>

      <main className={styles.main}>
        <Stack gap={1} alignItems="center" mb={6} textAlign="center">
          <Typography level="h1" variant="plain" display="flex" alignItems="center" gap={1}>
            <Image src={SafeLogo} alt="" width={50} height={50} />
            Safe Dumper
          </Typography>
          <Typography mb={1}>Did you create too many Safes again?</Typography>
          <ConnectButton />
        </Stack>

        {account.address && ownedSafes && (
          <div className={styles.wrapper}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
              <Typography>
                Safe Accounts on {account.chain?.name} ({ownedSafes.safes.length})
              </Typography>
              <Stack direction="row" gap={1}>
                <Button variant="outlined" size="sm" onClick={toggleAll}>
                  Toggle all
                </Button>

                <Button
                  onClick={() => setOpen(true)}
                  size="sm"
                  variant="solid"
                  disabled={selectedSafeAddresses.size === 0}
                >
                  Dump Safe(s)
                </Button>
              </Stack>
            </Stack>

            <List component="div" role="list" className={styles.list}>
              {visibleSafes?.map((safe) => {
                return (
                  <ListItemButton key={safe} role="listitem" onClick={handleToggle(safe)} disabled={isPending}>
                    <ListItemDecorator>
                      <Checkbox size="sm" checked={selectedSafeAddresses.has(safe)} tabIndex={-1} />
                    </ListItemDecorator>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Image
                        alt={safe}
                        src={blo(safe as `0x${string}`)}
                        width={36}
                        height={36}
                        className={styles.identicon}
                      />
                      <div>
                        <Typography className={styles.address}>{safe}</Typography>
                      </div>
                    </Stack>
                  </ListItemButton>
                )
              })}
            </List>
            {hasMoreSafes && <Button onClick={onLoadMore}>Load more</Button>}
            {open && <ReviewDump selectedSafes={selectedSafeAddresses} open={open} setOpen={setOpen} />}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home

import {
  Alert,
  Button,
  Modal,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
  ModalDialog,
  ListItemDecorator,
  Skeleton,
  Chip,
  Box,
} from '@mui/joy'
import Image from 'next/image'
import { blo } from 'blo'
import styles from '../styles/Home.module.css'
import useFetchSafeInfo from '../hooks/useFetchSafeInfo'

import Check from '../public/images/check.svg'
import Cross from '../public/images/cross.svg'
import Users from '../public/images/users.svg'
import Safe, { encodeMultiSendData, getMultiSendCallOnlyContract, SafeProvider } from '@safe-global/protocol-kit'
import { getMultiSendCallOnlyDeployment } from '@safe-global/safe-deployments'
import { createWalletClient, custom } from 'viem'
import { useAccount } from 'wagmi'
import { Dispatch, SetStateAction, useState } from 'react'

const ReviewDump = ({
  selectedSafes,
  open,
  setOpen,
}: {
  selectedSafes: Set<string>
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>()
  const { data: selectedSafesInfo = [], isPending } = useFetchSafeInfo(Array.from(selectedSafes))
  const account = useAccount()

  const dumpableSafes = selectedSafesInfo.filter((safe) => safe.threshold === 1)

  const onDump = async () => {
    if (!account.chainId || !account.address || dumpableSafes.length === 0) return

    setError(undefined)
    setIsLoading(true)

    try {
      const safeTxs = await Promise.all(
        dumpableSafes.map(async (safe) => {
          const protocolKit = await Safe.init({ safeAddress: safe.address.value, provider: window.ethereum })

          const safeTx = await protocolKit.createSwapOwnerTx({
            oldOwnerAddress: account.address as `0x${string}`,
            newOwnerAddress: '0x0000000000000000000000000000000000000002',
          })

          const signedTx = await protocolKit.signTransaction(safeTx)

          return {
            operation: 0,
            to: safe.address.value,
            value: '0',
            data: await protocolKit.getEncodedTransaction(signedTx),
          }
        }),
      )

      const multiSendTx = encodeMultiSendData(safeTxs) as `0x${string}`
      const multiSendContract = getMultiSendCallOnlyDeployment()
      if (!multiSendContract) return

      const contract = await getMultiSendCallOnlyContract({
        safeVersion: '1.3.0', // This will not work if there are mixed versions
        safeProvider: new SafeProvider({ provider: window.ethereum }),
      })

      const encodedMultiSendTx = contract.encode('multiSend', [multiSendTx]) as `0x${string}`
      const contractAddress = contract.getAddress() as `0x${string}`

      const client = createWalletClient({
        transport: custom(window.ethereum!),
      })

      await client.sendTransaction({
        chain: account.chain,
        account: account.address,
        to: contractAddress,
        value: BigInt(0),
        data: encodedMultiSendTx,
      })

      setOpen(false)
    } catch (e) {
      // @ts-ignore
      setError(e.shortMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={open}>
      <ModalDialog color="primary" variant="plain" maxWidth={600}>
        <DialogTitle>Dump selected Safes</DialogTitle>
        <DialogContent>
          <Typography>This action will remove your ownership in the following Safes.</Typography>
          <Alert color="warning" size="sm" variant="soft">
            Safes with a higher threshold than 1 are marked and will not be removed.
          </Alert>
          <List sx={{ mt: 1 }}>
            {isPending && <Skeleton />}
            {!isPending &&
              selectedSafesInfo &&
              selectedSafesInfo.map((selectedSafe) => {
                return (
                  <ListItem key={selectedSafe.address.value}>
                    <ListItemDecorator>
                      <Image src={selectedSafe.threshold === 1 ? Check : Cross} width={16} height={16} alt="" />
                    </ListItemDecorator>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Image
                        alt={selectedSafe.address.value}
                        src={blo(selectedSafe.address.value as `0x${string}`)}
                        width={36}
                        height={36}
                        className={styles.identicon}
                      />
                      <div>
                        <Typography className={styles.address}>{selectedSafe.address.value}</Typography>
                        <Box display="flex" gap={1}>
                          {selectedSafe.fiatTotal && <Typography>{selectedSafe.fiatTotal} USD</Typography>}

                          <Chip size="sm">
                            <Typography fontSize="xs" display="flex" alignItems="center" gap="4px">
                              <Image alt="" src={Users} width={16} height={16} />
                              {selectedSafe.threshold} / {selectedSafe.owners.length}
                            </Typography>
                          </Chip>
                        </Box>
                      </div>
                    </Stack>
                  </ListItem>
                )
              })}
          </List>
          {error && (
            <Alert color="danger" variant="soft">
              {error}
            </Alert>
          )}
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={onDump} disabled={dumpableSafes.length === 0 || isPending || isLoading}>
            Submit
          </Button>
          <Button variant="soft" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  )
}

export default ReviewDump

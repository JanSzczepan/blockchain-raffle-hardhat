import { ethers, network } from 'hardhat'
import { developmentChains } from '../helper-hardhat-config'
import { Raffle, VRFCoordinatorV2Mock } from '../typechain-types'
import { BigNumber } from 'ethers'

async function mockKeepers() {
   console.log('Mocking keepers...')
   const raffle: Raffle = await ethers.getContract('Raffle')

   console.log('Calling checkUpkeep...')
   const { upkeepNeeded } = await raffle.checkUpkeep([])

   if (upkeepNeeded) {
      console.log('Calling performUpkeep...')
      const transactionResponse = await raffle.performUpkeep([])
      const transactionReceipt = await transactionResponse.wait(1)
      const requestId = transactionReceipt.events![1].args?.requestId
      console.log(`Request ID: ${requestId}`)

      await mockVrfV2(requestId, raffle)
   } else {
      console.log('Upkeep not needed!')
   }
}

async function mockVrfV2(requestId: BigNumber, raffle: Raffle) {
   console.log('Mocking VrfV2...')
   const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
      'VRFCoordinatorV2Mock'
   )

   console.log('Calling fulfillRandomWords...')
   await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)

   console.log('Responded!')

   const recentWinner = await raffle.getRecentWinner()
   console.log(`The winner is: ${recentWinner}`)
}

async function main() {
   if (developmentChains.includes(network.name)) {
      await mockKeepers()
   } else {
      console.log('This script can only be run on test local networks!')
   }
}

main()
   .then(() => process.exit(0))
   .catch((e) => {
      console.error(e)
      process.exit(1)
   })

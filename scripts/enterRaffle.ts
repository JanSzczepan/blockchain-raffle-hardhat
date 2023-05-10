import { ethers, getNamedAccounts } from 'hardhat'
import { Raffle } from '../typechain-types'

async function main() {
   console.log('Entering raffle...')

   const { deployer } = await getNamedAccounts()
   const raffle: Raffle = await ethers.getContract('Raffle', deployer)
   const entranceFee = await raffle.getEntranceFee()

   const transactionResponse = await raffle.enterRaffle({ value: entranceFee })
   await transactionResponse.wait(1)

   console.log('Raffle entered!')
}

main()
   .then(() => process.exit(0))
   .catch((e) => {
      console.error(e)
      process.exit(1)
   })

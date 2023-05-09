import { ethers, network } from 'hardhat'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Raffle } from '../../typechain-types'
import { developmentChains } from '../../helper-hardhat-config'

!developmentChains.includes(network.name) &&
   describe('Raffle Staging Tests', function () {
      let raffle: Raffle
      let signers: SignerWithAddress[]
      let deployer: SignerWithAddress
      let raffleEntranceFee: BigNumber

      this.beforeEach(async function () {
         signers = await ethers.getSigners()
         deployer = signers[0]
         raffle = await ethers.getContract('Raffle', deployer)
         raffleEntranceFee = await raffle.getEntranceFee()
      })

      describe('fulfillRandomWords', function () {
         it('works with live Chainlink Keepers and Chainlink VRF, we get a random winner', async function () {
            console.log('Setting up test...')
            const startingTimeStamp = await raffle.getLastTimeStamp()

            await new Promise<void>(async (resolve, reject) => {
               raffle.once('WinnerPicked', async () => {
                  console.log('WinnerPicked event fired!')
                  try {
                     const endingPlayerBalance = await deployer.getBalance()
                     const recentWinner = await raffle.getRecentWinner()
                     const endingTimeStamp = await raffle.getLastTimeStamp()
                     const raffleState = await raffle.getRaffleState()

                     await expect(raffle.getPlayer(0)).to.be.reverted
                     expect(raffleState.toString()).to.equal('0')
                     expect(endingTimeStamp > startingTimeStamp)
                     expect(recentWinner.toString()).to.equal(deployer.address)
                     expect(endingPlayerBalance.toString()).to.equal(
                        startingPlayerBalance.add(raffleEntranceFee).toString()
                     )
                     resolve()
                  } catch (error) {
                     console.log(error)
                     reject(error)
                  }
               })

               console.log('Entering Raffle...')
               const transactionResponse = await raffle.enterRaffle({
                  value: raffleEntranceFee,
               })
               await transactionResponse.wait(1)

               console.log('Time to wait for raffle to end...')
               const startingPlayerBalance = await deployer.getBalance()
            })
         })
      })
   })

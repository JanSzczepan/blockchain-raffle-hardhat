import { network, deployments, ethers } from 'hardhat'
import { Raffle, VRFCoordinatorV2Mock } from '../../typechain-types'
import { BigNumber } from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { developmentChains, networkConfig } from '../../helper-hardhat-config'

developmentChains.includes(network.name) &&
   describe('Raffle', function () {
      let raffle: Raffle
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
      let raffleEntranceFee: BigNumber
      let raffleInterval: number
      let signers: SignerWithAddress[]
      let player: SignerWithAddress
      let chainId: number

      beforeEach(async function () {
         await deployments.fixture(['all'])
         signers = await ethers.getSigners()
         player = signers[1]
         const raffleContract: Raffle = await ethers.getContract('Raffle')
         raffle = raffleContract.connect(player)
         vrfCoordinatorV2Mock = await ethers.getContract('VRFCoordinatorV2Mock')
         raffleEntranceFee = await raffle.getEntranceFee()
         raffleInterval = (await raffle.getInterval()).toNumber()
         chainId = network.config.chainId!
      })

      describe('constructor', function () {
         it('initiallizes the raffle correctly', async function () {
            const raffleState = await raffle.getRaffleState()

            expect(raffleState.toString()).to.equal('0')
            expect(raffleInterval.toString()).to.equal(
               networkConfig[chainId]['keepersUpdateInterval']
            )
         })
      })

      describe('enterRaffle', function () {
         it(`reverts when you don't pay enough`, async function () {
            await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
               raffle,
               'Raffle__SendMoreToEnterRaffle'
            )
         })

         it('records player when they enter', async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            const rafflePlayer = await raffle.getPlayer(0)
            expect(rafflePlayer).to.equal(player.address)
         })

         it('emits event on enter', async function () {
            await expect(
               raffle.enterRaffle({ value: raffleEntranceFee })
            ).to.be.emit(raffle, 'RaffleEnter')
         })

         it(`doesn't allow entrance when raffle is calculating`, async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])
            await raffle.performUpkeep([])
            await expect(
               raffle.enterRaffle({ value: raffleEntranceFee })
            ).to.be.revertedWithCustomError(raffle, 'Raffle__RaffleNotOpen')
         })
      })

      describe('checkUpkeep', function () {
         it(`returns false if people haven't sent any ETH`, async function () {
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            expect(!upkeepNeeded)
         })

         it(`returns false if raffle isn't open`, async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])
            await raffle.performUpkeep([])

            const raffleState = await raffle.getRaffleState()
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

            expect(raffleState.toString()).to.equal('1')
            expect(!upkeepNeeded)
         })

         it(`returns false if enough time hasn't passed`, async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval - 1,
            ])
            await network.provider.send('evm_mine', [])

            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])

            expect(!upkeepNeeded)
         })

         it('returns true if enough time has passed, has players, eth, and is open', async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])

            const { upkeepNeeded } = await raffle.checkUpkeep([])

            expect(upkeepNeeded)
         })
      })

      describe('performUpkeep', function () {
         it('can only run if checkupkeep is true', async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])

            const tx = await raffle.performUpkeep([])
            expect(tx)
         })

         it('reverts if checkup is false', async () => {
            await expect(
               raffle.performUpkeep([])
            ).to.be.revertedWithCustomError(raffle, 'Raffle__UpkeepNotNeeded')
         })

         it('updates the raffle state and emits a requestId', async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])

            const transactionResponse = await raffle.performUpkeep([])
            const transactionReceipt = await transactionResponse.wait(1)

            const raffleState = await raffle.getRaffleState()
            const requestId = transactionReceipt.events![1].args?.requestId

            expect(raffleState.toString()).to.equal('1')
            expect(requestId > 0)
         })
      })

      describe('fulfillRandomWords', function () {
         beforeEach(async function () {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send('evm_increaseTime', [
               raffleInterval + 1,
            ])
            await network.provider.send('evm_mine', [])
         })

         it('can only be called after performupkeep', async function () {
            await expect(
               vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
            ).to.be.rejectedWith('nonexistent request')
            await expect(
               vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
            ).to.be.rejectedWith('nonexistent request')
         })

         it('picks a winner, resets, and sends money', async function () {
            const stratingIndex = 2
            const numberOfPlayers = 4

            for (
               let i = stratingIndex;
               i < stratingIndex + numberOfPlayers - 1;
               i++
            ) {
               const newPlayerRaffle = raffle.connect(signers[i])
               await newPlayerRaffle.enterRaffle({ value: raffleEntranceFee })
            }

            const startingTimeStamp = await raffle.getLastTimeStamp()

            await new Promise<void>(async (resolve, reject) => {
               raffle.once('WinnerPicked', async () => {
                  try {
                     const recentWinner = await raffle.getRecentWinner()
                     const raffleState = await raffle.getRaffleState()
                     const endingWinnerBalance = await signers[2].getBalance()
                     const endingTimeStamp = await raffle.getLastTimeStamp()
                     await expect(raffle.getPlayer(0)).to.be.reverted
                     expect(recentWinner.toString()).to.equal(
                        signers[2].address
                     )
                     expect(raffleState.toString()).to.equal('0')
                     expect(endingTimeStamp > startingTimeStamp)
                     expect(endingWinnerBalance.toString()).to.equal(
                        startingWinnerBalance
                           .add(raffleEntranceFee.mul(numberOfPlayers))
                           .toString()
                     )
                     resolve()
                  } catch (error) {
                     reject(error)
                  }
               })

               const transactionResponse = await raffle.performUpkeep([])
               const transactionReceipt = await transactionResponse.wait(1)
               const requestId = transactionReceipt.events![1].args?.requestId
               const startingWinnerBalance = await signers[2].getBalance()
               await vrfCoordinatorV2Mock.fulfillRandomWords(
                  requestId,
                  raffle.address
               )
            })
         })
      })
   })

import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
   VERIFICATION_BLOCK_CONFIRMATIONS,
   developmentChains,
   networkConfig,
} from '../helper-hardhat-config'
import { VRFCoordinatorV2Mock } from '../typechain-types'
import verify from '../utils/verify'

const FUND_AMOUNT = '1000000000000000000000'

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
   const { deployments, getNamedAccounts, network, ethers } = hre
   const { deploy } = deployments
   const { deployer } = await getNamedAccounts()
   const { chainId } = network.config

   let vrfCoordinatorV2Address: string | undefined
   let subscriptionId: string | undefined

   if (developmentChains.includes(network.name)) {
      const vrfCoordinatorV2Mock: VRFCoordinatorV2Mock =
         await ethers.getContract('VRFCoordinatorV2Mock')
      vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

      const transactionResponse =
         await vrfCoordinatorV2Mock.createSubscription()
      const transactionReceipt = await transactionResponse.wait(1)
      subscriptionId = transactionReceipt.events![0].args?.subId as
         | string
         | undefined

      await vrfCoordinatorV2Mock.fundSubscription(subscriptionId!, FUND_AMOUNT)
   } else {
      vrfCoordinatorV2Address = networkConfig[chainId!].vrfCoordinatorV2Address
      subscriptionId = networkConfig[chainId!].subscriptionId
   }

   const waitConfirmations = developmentChains.includes(network.name)
      ? 1
      : VERIFICATION_BLOCK_CONFIRMATIONS

   const args: any[] = [
      vrfCoordinatorV2Address,
      subscriptionId,
      networkConfig[chainId!]['gasLane'],
      networkConfig[chainId!]['requestConfirmations'],
      networkConfig[chainId!]['callbackGasLimit'],
      networkConfig[chainId!]['raffleEntranceFee'],
      networkConfig[chainId!]['keepersUpdateInterval'],
   ]

   const raffle = await deploy('Raffle', {
      from: deployer,
      args,
      log: true,
      waitConfirmations,
   })

   if (
      !developmentChains.includes(network.name) &&
      process.env.ETHERSCAN_API_KEY
   ) {
      await verify(raffle.address, args)
   }
}

deployRaffle.tags = ['all', 'raffle']
export default deployRaffle

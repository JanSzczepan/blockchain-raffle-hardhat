import { ethers } from 'hardhat'

type NetworkConfigInfoItem = {
   name: string
   subscriptionId?: string
   gasLane?: string
   requestConfirmations?: string
   keepersUpdateInterval?: string
   raffleEntranceFee?: string
   callbackGasLimit?: string
   vrfCoordinatorV2Address?: string
}

type NetworkConfigInfo = {
   [key: string]: NetworkConfigInfoItem
}

export const networkConfig: NetworkConfigInfo = {
   31337: {
      name: 'localhost',
      subscriptionId: '588',
      gasLane:
         '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
      requestConfirmations: '3',
      keepersUpdateInterval: '30',
      raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
      callbackGasLimit: '500000',
   },
   11155111: {
      name: 'sepolia',
      vrfCoordinatorV2Address: '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625',
      subscriptionId: '1868',
      gasLane:
         '0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c',
      requestConfirmations: '3',
      keepersUpdateInterval: '30',
      raffleEntranceFee: ethers.utils.parseEther('0.01').toString(),
      callbackGasLimit: '500000',
   },
}

export const developmentChains = ['hardhat', 'localhost']
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
export const frontEndContractAddressesFilePath =
   '../frontend/constants/addresses.json'
export const frontEndContractAbiFilePath = '../frontend/constants/abi.json'

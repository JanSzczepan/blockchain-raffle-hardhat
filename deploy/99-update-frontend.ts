import fs from 'fs-extra'
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Raffle } from '../typechain-types'
import {
   frontEndContractAbiFilePath,
   frontEndContractAddressesFilePath,
} from '../helper-hardhat-config'

const updateUI: DeployFunction = async function (
   hre: HardhatRuntimeEnvironment
) {
   if (process.env.UPDATE_FRONT_END) {
      console.log('Writing to front end...')

      const { ethers, network } = hre
      const raffle: Raffle = await ethers.getContract('Raffle')
      const chainId = network.config.chainId!
      const contractAddresses = JSON.parse(
         fs.readFileSync(frontEndContractAddressesFilePath, 'utf8')
      )

      if (chainId in contractAddresses) {
         if (!contractAddresses[chainId].includes(raffle.address)) {
            contractAddresses[chainId].push(raffle.address)
         }
      } else {
         contractAddresses[chainId] = [raffle.address]
      }

      const abi = raffle.interface.format(ethers.utils.FormatTypes.json)
      fs.writeFileSync(
         frontEndContractAddressesFilePath,
         JSON.stringify(contractAddresses)
      )
      fs.writeFileSync(frontEndContractAbiFilePath, JSON.stringify(abi))

      console.log('Front end written!')
   }
}

updateUI.tags = ['all', 'frontend']
export default updateUI

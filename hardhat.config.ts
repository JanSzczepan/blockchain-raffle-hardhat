import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import 'dotenv/config'

const PRIVATE_KEY = process.env.PRIVATE_KEY || ''
const SEPLOIA_RPC_URL = process.env.SEPLOIA_RPC_URL || ''
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || ''
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || ''

const config: HardhatUserConfig = {
   defaultNetwork: 'hardhat',
   networks: {
      hardhat: {
         chainId: 31337,
      },
      localhost: {
         chainId: 31337,
      },
      sepolia: {
         url: SEPLOIA_RPC_URL,
         chainId: 11155111,
         accounts: [PRIVATE_KEY],
         saveDeployments: true,
      },
   },
   namedAccounts: {
      deployer: {
         default: 0,
         1: 0,
      },
      player: {
         default: 1,
      },
   },
   solidity: '0.8.18',
   etherscan: {
      apiKey: ETHERSCAN_API_KEY,
   },
   gasReporter: {
      enabled: true,
      currency: 'USD',
      outputFile: 'gas-report.txt',
      noColors: true,
      coinmarketcap: COINMARKETCAP_API_KEY,
   },
   mocha: {
      timeout: 200000,
   },
}

export default config

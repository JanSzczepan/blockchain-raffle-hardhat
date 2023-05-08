import { run } from 'hardhat'

const verify = async (address: string, constructorArguments: any[]) => {
   console.log('Verifying contract...')

   try {
      await run('verify:verify', {
         address,
         constructorArguments,
      })
   } catch (error: any) {
      if (error.message.toLowerCase().includes('already verified')) {
         console.log('Already verified!')
      } else {
         console.log(error)
      }
   }
}

export default verify

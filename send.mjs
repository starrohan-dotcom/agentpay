import { createWalletClient, createPublicClient, http, parseEther } from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Paste your MetaMask private key here (export from MetaMask > Account Details)
const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY || '0xYOUR_PRIVATE_KEY_HERE')

const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
})

// This is your "agent" sending money autonomously
const tx = await client.sendTransaction({
    to: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', // paste any wallet address as recipient
    value: parseEther('0.00001'),
})

console.log('Agent payment sent!')
console.log('View on Basescan: https://sepolia.basescan.org/tx/' + tx)

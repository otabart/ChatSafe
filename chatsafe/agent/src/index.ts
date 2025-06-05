import { Client } from "@xmtp/xmtp-js";
import { Wallet, ethers, Contract } from "ethers";
import dotenv from "dotenv";
import { runModeration } from "./ai/moderation";
// Assuming logger.ts exists in utils, if not, this might cause an error
// import { logger } from "./utils/logger"; 

dotenv.config();

// --- Smart Contract Configuration ---
const CONTRACT_ADDRESS = process.env.CHATSAFE_CONTRACT_ADDRESS;
const CONTRACT_ABI = [
  // This ABI should match your deployed ChatSafe.sol contract
  // Ensure all functions and events you interact with are here
  "event MessageFlagged(address offender, string reason)",
  "function logFlag(address offender, string memory reason) external",
  "function getReports() public view returns (tuple(address offender, string reason, uint256 timestamp)[] memory)",
  "function reputation(address) public view returns (uint256)"
];

// --- Environment Variable Checks ---
if (!process.env.XMTP_PRIVATE_KEY) {
  console.error("XMTP_PRIVATE_KEY is not set in .env file.");
  process.exit(1);
}
if (!CONTRACT_ADDRESS) {
  console.error("CHATSAFE_CONTRACT_ADDRESS is not set in .env file.");
  process.exit(1);
}
if (!process.env.BASE_SEPOLIA_RPC_URL) {
  console.error("BASE_SEPOLIA_RPC_URL is not set in .env file for contract interaction.");
  process.exit(1);
}

// --- Ethers.js Setup ---
// Provider connected to the Base network (e.g., Base Sepolia)
const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
// Wallet for the agent to sign transactions (needs funds for gas)
const agentWallet = new Wallet(process.env.XMTP_PRIVATE_KEY, provider);
// Contract instance
let chatSafeContract: Contract;
try {
    chatSafeContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, agentWallet);
} catch (error) {
    console.error("Failed to initialize smart contract instance:", error);
    console.error("Please check CONTRACT_ADDRESS and ABI in .env and agent code.");
    process.exit(1);
}


async function main() {
  console.log("ChatSafe Agent starting...");
  console.log("Agent Wallet Address:", agentWallet.address);
  
  let xmtpClient;
  try {
    xmtpClient = await Client.create(agentWallet, { env: "production" }); // or "dev" for XMTP dev network
    console.log("XMTP client created. Listening for messages on address:", xmtpClient.address);
  } catch (error) {
    console.error("Failed to create XMTP client:", error);
    console.error("Ensure XMTP_PRIVATE_KEY is correct and the wallet is provisioned on XMTP network if needed.");
    process.exit(1);
  }

  console.log(`Listening for new messages...`);

  try {
    for await (const message of await xmtpClient.conversations.streamAllMessages()) {
      // Ignore messages sent by the agent itself or empty messages
      if (message.senderAddress === xmtpClient.address || !message.content) {
        continue;
      }

      console.log(\`[MSG] \${message.senderAddress}: \${message.content}\`);
      // logger?.info(\`[MSG] \${message.senderAddress}: \${message.content}\`); // Optional logging

      const moderationResult = await runModeration(message.content);

      if (moderationResult.flagged) {
        const warningMessage = \`🚨 ChatSafe Warning: Your message was flagged as potentially harmful/unsafe. Reason: \${moderationResult.reason}\`;
        console.log(\`[FLAGGED] User \${message.senderAddress}: \${message.content} | Reason: \${moderationResult.reason}\`);
        // logger?.warn(\`[FLAGGED] User \${message.senderAddress}: \${message.content} | Reason: \${moderationResult.reason}\`);
        
        try {
          // 1. Warn in chat
          await message.conversation.send(warningMessage);
          console.log(\`[ACTION] Sent warning to \${message.senderAddress} in conversation \${message.conversation.topic}\`);
        } catch (e: any) {
          console.error(\`[ERROR] Failed to send warning message to \${message.senderAddress}: \`, e.message);
          // logger?.error(\`[ERROR] Failed to send warning message to \${message.senderAddress}: \`, e.message);
        }

        // 2. Log on-chain
        try {
          console.log(\`[ACTION] Logging infraction to smart contract for \${message.senderAddress} (Reason: \${moderationResult.reason})...\`);
          const tx = await chatSafeContract.logFlag(message.senderAddress, moderationResult.reason);
          const receipt = await tx.wait();
          console.log(\`[SUCCESS] Infraction logged on-chain. Transaction hash: \${receipt.transactionHash}\`);
          // logger?.info(\`[SUCCESS] Infraction logged for \${message.senderAddress}. Tx: \${receipt.transactionHash}\`);
        } catch (e: any) {
          console.error(\`[ERROR] Failed to log infraction to smart contract for \${message.senderAddress}: \`, e.message);
          // logger?.error(\`[ERROR] Failed to log infraction for \${message.senderAddress}: \`, e.message);
          // Potentially send an admin alert here if on-chain logging fails
        }
      }
    }
  } catch (error: any) {
    console.error("[FATAL] Error streaming messages:", error.message);
    // logger?.error("[FATAL] Error streaming messages:", error.message);
    // Implement restart logic or alerting as needed
    process.exit(1); // Exit and let process manager (like PM2) restart if configured
  }
}

main().catch((e) => {
  console.error("Unhandled error in main function:", e);
  // logger?.error("Unhandled error in main function:", e);
  process.exit(1);
});

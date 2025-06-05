require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox"); // A common Hardhat plugin bundle

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19", // Match this with your ChatSafe.sol pragma
  networks: {
    base_sepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "YOUR_BASE_SEPOLIA_RPC_URL_HERE",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 1000000000, // 1 Gwei, adjust as needed
      // verify: { // Optional: for etherscan verification
      //   etherscan: {
      //     apiKey: process.env.BASESCAN_API_KEY,
      //     apiUrl: "https://api-sepolia.basescan.org" // Base Sepolia Etherscan API
      //   }
      // }
    },
    // You can add other networks like localhost for testing
    // localhost: {
    //   url: "http://127.0.0.1:8545"
    // },
  },
  // Optional: Etherscan configuration for contract verification
  // etherscan: {
  //   apiKey: {
  //     baseSepolia: process.env.BASESCAN_API_KEY || ""
  //   },
  //   customChains: [
  //     {
  //       network: "baseSepolia",
  //       chainId: 84532,
  //       urls: {
  //         apiURL: "https://api-sepolia.basescan.org/api",
  //         browserURL: "https://sepolia.basescan.org"
  //       }
  //     }
  //   ]
  // },
};

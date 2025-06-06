const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const ChatSafe = await hre.ethers.getContractFactory("ChatSafe");
  const chatSafe = await ChatSafe.deploy();

  await chatSafe.waitForDeployment(); // Recommended way to wait for deployment

  const deployedAddress = await chatSafe.getAddress(); // Recommended way to get address
  console.log("ChatSafe contract deployed to:", deployedAddress);

  // You can add further steps here, like verifying the contract on Basescan
  // Or writing the address to a file for the frontend to use
  // For example:
  // const fs = require('fs');
  // fs.writeFileSync("../dashboard/src/contract-address.json", JSON.stringify({ address: deployedAddress }));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

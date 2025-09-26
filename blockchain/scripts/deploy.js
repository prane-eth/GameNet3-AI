const main = async () => {
  // Deploy GameNFT first (no constructor arguments needed)
  const nftContractName = "GameNFT";
  const nftContractFactory = await hre.ethers.getContractFactory(nftContractName);
  const nftContract = await nftContractFactory.deploy();
  await nftContract.deployed();
  console.log(
    "Contract", nftContractName, "deployed address: ", nftContract.address,
    "in network:", hre.network.name
  );

  // Deploy GamingPlatform with GameNFT address
  const platformContractName = "GamingPlatform";
  const platformContractFactory = await hre.ethers.getContractFactory(platformContractName);
  const platformContract = await platformContractFactory.deploy(nftContract.address);
  await platformContract.deployed();
  console.log(
    "Contract", platformContractName, "deployed address: ", platformContract.address,
    "in network:", hre.network.name
  );

  // Transfer ownership of GameNFT to GamingPlatform
  const tx = await nftContract.transferOwnership(platformContract.address);
  await tx.wait();
  console.log("Ownership of GameNFT transferred to GamingPlatform");
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();
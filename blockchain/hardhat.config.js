require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const {
  SEPOLIA_RPC_URL,
  LOCAL_RPC_URL,
  ETH_PRIVATE_KEY,
  LOCAL_PRIVATE_KEY,
} = process.env;

module.exports = {
	solidity: {
	  version: "0.8.30",
	  settings: {
		optimizer: {
		  enabled: true,
		  runs: 300,
		},
	  },
	},
	networks: {
		sepolia: {
			url: SEPOLIA_RPC_URL,
			accounts: [ETH_PRIVATE_KEY],
		},
		localhost: {
			url: LOCAL_RPC_URL,
			accounts: [LOCAL_PRIVATE_KEY],
		},
	},
};
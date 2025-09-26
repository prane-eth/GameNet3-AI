const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameNFT", function () {
    let gameNFT, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const GameNFT = await ethers.getContractFactory("GameNFT");
        gameNFT = await GameNFT.deploy();
        await gameNFT.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await gameNFT.owner()).to.equal(owner.address);
        });

        it("Should have correct name and symbol", async function () {
            expect(await gameNFT.name()).to.equal("GameNFT");
            expect(await gameNFT.symbol()).to.equal("GNFT");
        });
    });

    describe("Minting", function () {
        it("Should mint NFT by owner", async function () {
            const imageUrl = "https://example.com/image1.png";
            const metadata = "Test metadata";
            await expect(gameNFT.mintNFT(addr1.address, imageUrl, metadata))
                .to.emit(gameNFT, "NFTMinted")
                .withArgs(1, addr1.address, imageUrl);

            expect(await gameNFT.ownerOf(1)).to.equal(addr1.address);
            expect(await gameNFT.totalSupply()).to.equal(1);
        });

        it("Should not allow non-owner to mint", async function () {
			await expect(gameNFT.connect(addr1).mintNFT(addr1.address, "url", "meta"))
					.to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should store token metadata correctly", async function () {
            const imageUrl = "https://example.com/image2.png";
            const metadata = "Another test metadata";
            await gameNFT.mintNFT(addr1.address, imageUrl, metadata);

            const tokenData = await gameNFT.getTokenMetadata(1);
            expect(tokenData.id).to.equal(1);
            expect(tokenData.creator).to.equal(addr1.address);
            expect(tokenData.imageUrl).to.equal(imageUrl);
            expect(tokenData.metadata).to.equal(metadata);
            expect(tokenData.createdAt).to.be.gt(0);
        });

        it("Should return correct token URI", async function () {
            const imageUrl = "https://example.com/image3.png";
            await gameNFT.mintNFT(addr1.address, imageUrl, "meta");

            expect(await gameNFT.tokenURI(1)).to.equal(imageUrl);
        });
    });

    describe("User Tokens", function () {
        it("Should track user tokens correctly", async function () {
            await gameNFT.mintNFT(addr1.address, "url1", "meta1");
            await gameNFT.mintNFT(addr1.address, "url2", "meta2");
            await gameNFT.mintNFT(addr2.address, "url3", "meta3");

            const addr1Tokens = await gameNFT.getUserTokens(addr1.address);
            expect(addr1Tokens.length).to.equal(2);
            expect(addr1Tokens[0]).to.equal(1);
            expect(addr1Tokens[1]).to.equal(2);

            const addr2Tokens = await gameNFT.getUserTokens(addr2.address);
            expect(addr2Tokens.length).to.equal(1);
            expect(addr2Tokens[0]).to.equal(3);
        });
    });

    describe("Token Existence", function () {
        it("Should revert for non-existent token metadata", async function () {
            await expect(gameNFT.getTokenMetadata(999)).to.be.revertedWith("ERC721: invalid token ID");
        });
    });
});
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GamingPlatform", function () {
    let gameNFT, gamingPlatform, owner, addr1, addr2, addr3, addr4;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        // Deploy GameNFT
        const GameNFT = await ethers.getContractFactory("GameNFT");
        gameNFT = await GameNFT.deploy();
        await gameNFT.deployed();

        // Deploy GamingPlatform
        const GamingPlatform = await ethers.getContractFactory("GamingPlatform");
        gamingPlatform = await GamingPlatform.deploy(gameNFT.address);
        await gamingPlatform.deployed();

        // Transfer ownership of GameNFT to GamingPlatform for minting
        await gameNFT.transferOwnership(gamingPlatform.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await gamingPlatform.owner()).to.equal(owner.address);
        });

        it("Should set the GameNFT contract address", async function () {
            expect(await gamingPlatform.gameNFT()).to.equal(gameNFT.address);
        });
    });

    describe("Participation", function () {
        it("Should allow user to participate in a game mint", async function () {
            await expect(gamingPlatform.connect(addr1).participateInMint("game1", 1))
                .to.emit(gamingPlatform, "UserParticipated")
                .withArgs("game1", 1, addr1.address);

            expect(await gamingPlatform.mintParticipants("game1", 1, addr1.address)).to.equal(true);
            expect(await gamingPlatform.getMintApprovals("game1", 1)).to.equal(1);
        });

        it("Should not allow user to participate twice in the same mint", async function () {
            await gamingPlatform.connect(addr1).participateInMint("game1", 1);
            await expect(gamingPlatform.connect(addr1).participateInMint("game1", 1)).to.be.revertedWith("Already participated in this mint");
        });

        it("Should allow same user to participate in different mints", async function () {
            await gamingPlatform.connect(addr1).participateInMint("game1", 1);
            await gamingPlatform.connect(addr1).participateInMint("game1", 2);

            expect(await gamingPlatform.getMintApprovals("game1", 1)).to.equal(1);
            expect(await gamingPlatform.getMintApprovals("game1", 2)).to.equal(1);
        });
    });

    describe("Get Next Mint", function () {
        it("Should return 1 for new game", async function () {
            expect(await gamingPlatform.getNextMint("game1")).to.equal(1);
        });

        it("Should return incremented mintId after mint completion", async function () {
            // Complete a mint
            for (let i = 1; i <= 10; i++) {
                await gamingPlatform.connect(await ethers.getSigner(i)).participateInMint("game1", 1);
            }
            const topUsers = [addr1.address, addr2.address, addr3.address];
            const imageUrls = ["url1", "url2", "url3"];
            const descriptions = ["desc1", "desc2", "desc3"];

            await gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions);

            expect(await gamingPlatform.getNextMint("game1")).to.equal(2);
        });
    });

    describe("Ready to Mint Check", function () {
        it("Should return false when less than 10 participants", async function () {
            for (let i = 1; i <= 9; i++) {
                await gamingPlatform.connect(await ethers.getSigner(i)).participateInMint("game1", 1);
            }
            expect(await gamingPlatform.readyToMint("game1", 1)).to.equal(false);
        });

        it("Should return true when 10 or more participants", async function () {
            for (let i = 1; i <= 10; i++) {
                await gamingPlatform.connect(await ethers.getSigner(i)).participateInMint("game1", 1);
            }
            expect(await gamingPlatform.readyToMint("game1", 1)).to.equal(true);
        });

        it("Should track multiple participants", async function () {
            await gamingPlatform.connect(addr1).participateInMint("game1", 1);
            await gamingPlatform.connect(addr2).participateInMint("game1", 1);
            await gamingPlatform.connect(addr3).participateInMint("game1", 1);

            expect(await gamingPlatform.getMintApprovals("game1", 1)).to.equal(3);
        });
    });

    describe("Minting NFTs", function () {
        beforeEach(async function () {
            // Get 10 participants for mintId 1
            for (let i = 1; i <= 10; i++) {
                await gamingPlatform.connect(await ethers.getSigner(i)).participateInMint("game1", 1);
            }
        });

        it("Should mint NFTs for top users by owner", async function () {
            const topUsers = [addr1.address, addr2.address, addr3.address];
            const imageUrls = ["url1", "url2", "url3"];
            const descriptions = ["desc1", "desc2", "desc3"];

            // Check initial state
            expect(await gamingPlatform.getMintApprovals("game1", 1)).to.equal(10);
            expect(await gamingPlatform.gameMintCount("game1")).to.equal(0);

            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.emit(gamingPlatform, "NFTMinted")
                .withArgs(addr1.address, 1, "game1", 1, "url1");

            expect(await gameNFT.ownerOf(1)).to.equal(addr1.address);
            expect(await gameNFT.ownerOf(2)).to.equal(addr2.address);
            expect(await gameNFT.ownerOf(3)).to.equal(addr3.address);

            // Check that mint count is incremented
            expect(await gamingPlatform.gameMintCount("game1")).to.equal(1);
        });

        it("Should not allow double minting for the same mintId", async function () {
            const topUsers = [addr1.address, addr2.address, addr3.address];
            const imageUrls = ["url1", "url2", "url3"];
            const descriptions = ["desc1", "desc2", "desc3"];

            // First mint should succeed
            await gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions);
            expect(await gamingPlatform.gameMintCount("game1")).to.equal(1);

            // Second mint with same mintId should fail due to mint already completed
            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Mint already completed");
        });

        it("Should allow multiple mints for the same game with different mintIds", async function () {
            const topUsers = [addr1.address, addr2.address, addr3.address];
            const imageUrls = ["url1", "url2", "url3"];
            const descriptions = ["desc1", "desc2", "desc3"];

            // First mint
            await gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions);
            expect(await gamingPlatform.gameMintCount("game1")).to.equal(1);

            // Get participants for mintId 2
            for (let i = 1; i <= 10; i++) {
                await gamingPlatform.connect(await ethers.getSigner(i)).participateInMint("game1", 2);
            }

            // Second mint with different mintId should succeed
            await gamingPlatform.mintNFTsForTopUsers("game1", 2, topUsers, imageUrls, descriptions);
            expect(await gamingPlatform.gameMintCount("game1")).to.equal(2);
        });

        it("Should not allow non-owner to mint NFTs", async function () {
            const topUsers = [addr1.address];
            const imageUrls = ["url1"];
            const descriptions = ["desc1"];

            await expect(gamingPlatform.connect(addr1).mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not mint if less than 10 participants", async function () {
            // Use mintId 2 which doesn't have enough participants
            const topUsers = [addr1.address];
            const imageUrls = ["url1"];
            const descriptions = ["desc1"];

            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 2, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Not enough participants");
        });

        it("Should revert if array lengths don't match", async function () {
            const topUsers = [addr1.address, addr2.address];
            const imageUrls = ["url1", "url2", "url3"]; // Different length
            const descriptions = ["desc1", "desc2"];

            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Users and images count mismatch");
        });

        it("Should require matching array lengths", async function () {
            const topUsers = [addr1.address, addr2.address];
            const imageUrls = ["url1"];
            const descriptions = ["desc1", "desc2"];

            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Users and images count mismatch");
        });

        it("Should not mint more than 3 NFTs", async function () {
            const topUsers = [addr1.address, addr2.address, addr3.address, addr4.address];
            const imageUrls = ["url1", "url2", "url3", "url4"];
            const descriptions = ["desc1", "desc2", "desc3", "desc4"];

            await expect(gamingPlatform.mintNFTsForTopUsers("game1", 1, topUsers, imageUrls, descriptions))
                .to.be.revertedWith("Maximum 3 NFTs per game");
        });
    });
});
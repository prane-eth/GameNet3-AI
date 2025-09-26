// npm install @playwright/test
// npx playwright install
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log(`Launching browser...`);

  const headless = false;
  const USE_PERSISTENT = true;
  const executablePath = '/usr/bin/chromium-browser';
  const VIDEO_DIR = path.resolve(__dirname, 'demo_videos');
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const EXTENSION_PATH = path.join(__dirname, 'metamask-extension'); // path to unpacked extension
  const USER_DATA_DIR = path.resolve(__dirname, 'user-data-dir');

  const recordVideo = { dir: VIDEO_DIR, size: { width: 1280, height: 720 } };
  let context;
  if (USE_PERSISTENT) {
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless,
      executablePath,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`
      ],
      recordVideo,
    });
  } else {
    // Non-persistent: create a fresh browser and context
    const browser = await chromium.launch({
      headless,
      executablePath,
      args: [],
    });
    context = await browser.newContext({ recordVideo });
  }

  const page = context.pages()[0];

  // Log page console messages so you can see what the page prints
  page.on('console', msg => console.log(`PAGE console.${msg.type()}: ${msg.text()}`));

  console.log('Navigating to http://localhost:5173');
  await page.goto('http://localhost:5173');

  await page.waitForTimeout(7000);
  await page.reload();
  await page.waitForTimeout(1000);

  const buttons = await page.$$('.connect-wallet-btn');
  if (buttons.length) {
    await buttons[0].click();
  } else {
    console.log('No .connect-wallet-btn found on the page.');
  }
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:5173/games');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:5173/game/10');
  await page.waitForTimeout(5000);

  const writeReviewBtn = await page.$('button.btn-primary:has-text("Write Review")');
  if (writeReviewBtn) {
    await writeReviewBtn.click();
    await page.waitForTimeout(3000);
    await page.fill('#review', 'This is a great game! I really enjoyed playing it.');
    await page.waitForTimeout(3000);
    const submitRatingBtn = await page.$('button.btn-primary:has-text("Submit Rating")');
    if (submitRatingBtn) {
      await submitRatingBtn.click();
    } else {
      console.log('No Submit Rating button found.');
    }
  } else {
    console.log('No Write Review button found.');
  }

  await page.waitForTimeout(5000);
  // click on <button class="btn-primary">Participate in Mint</button>
  const participateNftBtn = await page.$('button.btn-primary:has-text("Participate in Mint")');
  if (participateNftBtn) {
    await participateNftBtn.click();
  } else {
    console.log('No Participate in Mint button found.');
  }

  await page.waitForTimeout(5000);
  const mintNftBtn = await page.$('button.btn-primary[title="Request to mint NFTs for top users"]');
  if (!mintNftBtn) {
    console.log('No Mint NFTs for Top Users button found.');
    // Wait for 1 second and try again
    await page.waitForTimeout(1000);
    const mintNftBtnRetry = await page.$('button.btn-primary[title="Request to mint NFTs for top users"]');
    if (mintNftBtnRetry) {
      await mintNftBtnRetry.click();
    } else {
      console.log('Still no Mint NFTs for Top Users button found, giving up.');
    }
  } else {
    await mintNftBtn.click();
  }

  await page.waitForTimeout(20_000); // wait so video captures result

  await context.close();
  console.log('Done. Check demo_videos/ for recorded video.');
})();

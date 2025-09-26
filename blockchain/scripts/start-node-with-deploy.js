// Script to start a Hardhat node and automatically deploy contracts
const { spawn } = require('child_process');

async function main() {
  console.log('🚀 Starting Hardhat node with automatic deployment...\n');

  // Start Hardhat node in the background
  const nodeProcess = spawn('npx', ['hardhat', 'node'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  let nodeReady = false;

  // Listen for node output to know when it's ready
  nodeProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📡 Node:', output.trim());

    // Check if node is ready (usually shows "Started HTTP and WebSocket JSON-RPC server")
    if (output.includes('Started HTTP') && output.includes('JSON-RPC') && !nodeReady) {
      nodeReady = true;
      console.log('\n⏳ Node is ready, deploying contracts...\n');

      // Run deployment after a short delay to ensure node is fully ready
      setTimeout(async () => {
        try {
          await deployContracts();
          console.log('\n✅ Deployment completed! Contracts are ready.');
          console.log('🎮 Your gaming platform is now running on localhost:8545');
        } catch (error) {
          console.error('❌ Deployment failed:', error);
          process.exit(1);
        }
      }, 2000);
    }
  });

  nodeProcess.stderr.on('data', (data) => {
    console.error('❌ Node Error:', data.toString().trim());
  });

  nodeProcess.on('close', (code) => {
    console.log(`\n🛑 Node process exited with code ${code}`);
    process.exit(code);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    nodeProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    nodeProcess.kill('SIGTERM');
    process.exit(0);
  });
}

async function deployContracts() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    console.log('📦 Deploying contract...');
    const { stdout: deployOutput } = await execAsync('npx hardhat run scripts/deploy.js --network localhost');
    console.log(deployOutput);
  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

main().catch((error) => {
  console.error('❌ Failed to start node with deployment:', error);
  process.exit(1);
});
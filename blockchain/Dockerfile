# Use Node.js 24 Alpine for smaller image size
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 8545 (default Hardhat node port)
EXPOSE 8545

# Start the blockchain with deployment
CMD ["npm", "run", "node:deploy"]
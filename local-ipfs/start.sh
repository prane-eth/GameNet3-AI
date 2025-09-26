#!/bin/bash

export ipfs_staging=./ipfs_data/ipfs_staging
export ipfs_data=./ipfs_data/ipfs_data

# Create directories if they don't exist
mkdir -p $ipfs_staging
mkdir -p $ipfs_data

# docker run -d --name ipfs_host -v $ipfs_staging:/export -v $ipfs_data:/data/ipfs -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 ipfs/kubo:latest
# Check if the container exists at all
if [ "$(docker ps -aq -f name=ipfs_host)" ]; then
  echo "Container ipfs_host exists."

  # Check if it's not running
  if [ -z "$(docker ps -q -f name=ipfs_host)" ]; then
    echo "Container ipfs_host is currently stopped. Starting..."
    docker start ipfs_host
  else
    echo "Container ipfs_host is already running."
  fi
else
  echo "Container ipfs_host does not exist. Creating and starting..."
  docker run -d --name ipfs_host \
    -v "$ipfs_staging:/export" \
    -v "$ipfs_data:/data/ipfs" \
    -p 4001:4001 \
    -p 4001:4001/udp \
    -p 127.0.0.1:8080:8080 \
    -p 127.0.0.1:5001:5001 \
    ipfs/kubo:latest
fi

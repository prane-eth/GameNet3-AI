#!/bin/bash

export ipfs_staging=./ipfs_data/ipfs_staging
export ipfs_data=./ipfs_data/ipfs_data

# Create directories if they don't exist
mkdir -p $ipfs_staging
mkdir -p $ipfs_data

docker run -d --name ipfs_host -v $ipfs_staging:/export -v $ipfs_data:/data/ipfs -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 ipfs/kubo:latest

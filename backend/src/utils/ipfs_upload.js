const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

const ipfsApi = process.env.IPFS_API_URL; //  || 'http://127.0.0.1:5001'
const ipfsGateway = process.env.IPFS_GATEWAY_URL; //  || 'https://ipfs.io/ipfs'

async function findExistingFile(baseRelative) {
	// Candidate resolution strategy:
	// 1. If absolute path provided, use it
	// 2. Try resolving relative to current working directory (process.cwd())
	// 3. Try resolving relative to repository layout: two levels up from this utils folder (backend/)
	// 4. Try resolving relative to this utils folder (fallback)

	const candidates = [];
	if (path.isAbsolute(baseRelative)) {
		candidates.push(baseRelative);
	} else {
		// keep the original literal
		candidates.push(path.resolve(process.cwd(), baseRelative));
		// try relative to backend root (utils is backend/src/utils -> go up 2)
		candidates.push(path.resolve(__dirname, '../../', baseRelative.replace(/^\.\//, '')));
		// fallback: relative to this utils folder
		candidates.push(path.resolve(__dirname, baseRelative.replace(/^\.\//, '')));
	}

	const tryExt = ['', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
	for (const base of candidates) {
		for (const ext of tryExt) {
			const p = base + ext;
			try {
				const stat = fs.statSync(p);
				if (stat.isFile()) return p;
			} catch (e) {
				// not found
			}
		}
	}

	return null;
}

async function uploadToIpfs(filePath) {
	const stream = fs.createReadStream(filePath);
	const form = new FormData();
	form.append('file', stream, { filename: path.basename(filePath) });

	const url = `${ipfsApi.replace(/\/+$/g, '')}/api/v0/add?pin=true`;

	const res = await fetch(url, {
		method: 'POST',
		body: form,
		headers: form.getHeaders(),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`IPFS API error (${res.status}): ${text}`);
	}

	// Some IPFS daemons return newline-separated JSON. Parse the last line.
	const lines = text.trim().split(/\r?\n/).filter(Boolean);
	const last = lines[lines.length - 1];
	let parsed;
	try {
		parsed = JSON.parse(last);
	} catch (e) {
		throw new Error(`Failed to parse IPFS response: ${e.message}\nResponse body:\n${text}`);
	}

	const cid = parsed.Hash || (parsed.Cid && (parsed.Cid['/'] || parsed.Cid)) || parsed.cid || parsed.Name;
	if (!cid) throw new Error(`Could not find CID in IPFS response: ${last}`);
	return { cid, raw: parsed, rawText: text };
}

async function uploadLocalFileToIPFS(localImagePath) {
	try {
		if (!ipfsApi)
			throw new Error('IPFS_API_URL environment variable is required');

		const file = await findExistingFile(localImagePath);
		if (!file) {
			console.error('File not found. Tried with common extensions:', localImagePath);
			process.exitCode = 2;
			return;
		}

		console.log('Uploading file to IPFS API:', file);
		const { cid } = await uploadToIpfs(file);
		// const url = `${ipfsGateway}/ipfs/${cid}`;
		// return url;
		return `ipfs://${cid}`;  // file ID in IPFS
	} catch (err) {
		console.error('Upload failed:', err && err.message ? err.message : err);
		process.exitCode = 1;
	}
}

module.exports = { uploadLocalFileToIPFS };
# AI Testing with Request Recording/Replay

This project uses [nock](https://github.com/nock/nock) to record and replay HTTP requests, allowing you to test AI integrations without consuming API credits.

## How it works

- **Recording Mode**: Records actual API calls to JSON files
- **Replay Mode**: Replays recorded responses (default)
- **Security**: API keys and authorization headers are automatically filtered out

## Usage

### Run tests in replay mode (default)
```bash
npm test
```

### Record new API calls
```bash
npm run test:record
```

### Run AI tests specifically
```bash
# Replay mode
node scripts/test-ai.js

# Recording mode
node scripts/test-ai.js --record
```

## Recording Files

API call recordings are stored in `test/recordings/` as JSON files:
- `ai-recordings-YYYY-MM-DDTHH-mm-ss.json`

## Features

- ✅ Automatic filtering of sensitive headers (API keys, authorization)
- ✅ Isolated database instances for each test
- ✅ Comprehensive test coverage for all AI endpoints
- ✅ Error handling and validation tests
- ✅ No API costs during development/testing

## Test Coverage

The AI test suite covers:
- Prompt generation from game data
- Image generation from prompts
- Game artwork generation (prompts + images)
- Chatbot responses
- Error handling for invalid inputs
- API endpoint validation

## Environment Variables

Make sure your `.env` file contains the required API keys for recording mode:
- `OPENAI_API_KEY`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT_NAME`
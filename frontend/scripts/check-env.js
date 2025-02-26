const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to .env file
const envPath = path.resolve(__dirname, '../.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log('.env file does not exist at:', envPath);
  process.exit(1);
}

// Load .env file
try {
  const envConfig = dotenv.config({ path: envPath });
  if (envConfig.error) {
    console.error('Error loading .env file:', envConfig.error);
    process.exit(1);
  }
  
  // Check if OPENAI_API_KEY is set
  const apiKey = envConfig.parsed.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('OPENAI_API_KEY is not set in .env file');
  } else {
    console.log('OPENAI_API_KEY is set in .env file');
    // Print first few characters of the API key for verification
    console.log('API key starts with:', apiKey.substring(0, 5) + '...');
  }
} catch (error) {
  console.error('Error checking .env file:', error);
  process.exit(1);
}

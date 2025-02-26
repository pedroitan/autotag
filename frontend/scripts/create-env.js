const fs = require('fs');
const path = require('path');

// Path to .env file
const envPath = path.resolve(__dirname, '../.env');

// Check if .env file already exists
if (fs.existsSync(envPath)) {
  console.log('.env file already exists at:', envPath);
  process.exit(0);
}

// Create .env file with OpenAI API key
const envContent = `OPENAI_API_KEY=your_openai_api_key_here
`;

try {
  fs.writeFileSync(envPath, envContent);
  console.log('.env file created successfully at:', envPath);
  console.log('Please replace "your_openai_api_key_here" with your actual OpenAI API key');
} catch (error) {
  console.error('Error creating .env file:', error);
  process.exit(1);
}

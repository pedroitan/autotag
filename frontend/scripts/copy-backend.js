const fs = require('fs-extra');
const path = require('path');

// Source and destination paths
const sourcePath = path.join(__dirname, '../../imgtagman');
const destPath = path.join(__dirname, '../build/imgtagman');

// Copy the .env file
const envSource = path.join(__dirname, '../.env');
const envDest = path.join(destPath, '.env');

// Copy the Python backend files
fs.copySync(sourcePath, destPath, {
    filter: (src) => {
        // Skip __pycache__ directories and .pyc files
        return !src.includes('__pycache__') && !src.endsWith('.pyc');
    }
});

// Copy the .env file if it exists
if (fs.existsSync(envSource)) {
    fs.copySync(envSource, envDest);
    console.log('.env file copied successfully!');
} else {
    console.warn('.env file not found at:', envSource);
}

console.log('Python backend files copied successfully!');

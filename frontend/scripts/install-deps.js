const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the absolute path to the python_modules directory
const pythonModulesPath = path.join(__dirname, '..', '..', 'imgtagman', 'python_modules');
console.log('Python modules path:', pythonModulesPath);

try {
    // Create python_modules directory if it doesn't exist
    if (!fs.existsSync(pythonModulesPath)) {
        fs.mkdirSync(pythonModulesPath, { recursive: true });
    }
    
    // Clean any existing installations
    console.log('Cleaning existing installations...');
    execSync(`rm -rf "${pythonModulesPath}/*"`, { stdio: 'inherit' });
    
    // Install dependencies with pip
    console.log('Installing Python dependencies...');
    const pipCommand = `pip3 install --target="${pythonModulesPath}" --no-deps --no-cache-dir openai`;
    execSync(pipCommand, { stdio: 'inherit' });
    
    // Verify installation
    const installedFiles = fs.readdirSync(pythonModulesPath);
    console.log('Installed files:', installedFiles);
    
    if (!installedFiles.includes('openai')) {
        throw new Error('OpenAI package not found in installed files');
    }
    
    console.log('Python dependencies installed successfully');
} catch (error) {
    console.error('Failed to install Python dependencies:', error);
    process.exit(1);
}

const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const { shell } = require('electron'); // Added necessary import
const Store = require('electron-store');
const store = new Store();

// Define supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

let mainWindow;

// Get the correct path for resources
function getResourcePath() {
  if (isDev) {
    return path.join(__dirname, '../../');
  }
  
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath);
  }
  
  return path.join(process.resourcesPath);
}

// Set up Python environment
function setupPythonEnv() {
  const resourcePath = getResourcePath();
  const pythonModulesPath = path.join(resourcePath, 'imgtagman', 'python_modules');
  const imgtagmanPath = path.join(resourcePath, 'imgtagman');
  
  // Add both paths to PYTHONPATH, ensure python_modules comes first
  process.env.PYTHONPATH = [
    pythonModulesPath,
    imgtagmanPath
  ].filter(Boolean).join(':');
  
  // Set OpenAI API key
  // Load from .env file if available
  try {
    const dotenv = require('dotenv');
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.config({ path: envPath });
      if (envConfig.parsed && envConfig.parsed.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = envConfig.parsed.OPENAI_API_KEY;
      }
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
  
  console.log('Python environment:', {
    PYTHONPATH: process.env.PYTHONPATH,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'not set',
    resourcePath,
    pythonModulesPath,
    imgtagmanPath
  });
}

function createWindow() {
  setupPythonEnv();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

// Register protocol
app.whenReady().then(() => {
  protocol.registerFileProtocol('local-image', (request, callback) => {
    const filePath = request.url.replace('local-image://', '');
    try {
      return callback(decodeURIComponent(filePath));
    } catch (error) {
      console.error('Error loading image:', error);
    }
  });
}).then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle directory selection dialog
ipcMain.handle('dialog:openDirectory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.filePaths[0];
  } catch (error) {
    console.error('Error selecting directory:', error);
    throw error;
  }
});

// Handle API key dialog
ipcMain.handle('dialog:getApiKey', async () => {
  try {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['OK'],
      defaultId: 0,
      title: 'Chave da API OpenAI Necessária',
      message: 'Por favor, insira sua chave da API OpenAI:',
      detail: 'A chave da API será usada apenas para esta sessão e não será armazenada.',
      inputField: {
        type: 'password',
        required: true
      }
    });
    
    return result.inputField;
  } catch (error) {
    console.error('Error getting API key:', error);
    throw error;
  }
});

// Handle getting images from directory
ipcMain.handle('directory:getImages', async (event, directoryPath) => {
  try {
    const files = await fs.promises.readdir(directoryPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });

    const images = await Promise.all(imageFiles.map(async (file) => {
      const filePath = path.join(directoryPath, file);
      const stats = await fs.promises.stat(filePath);
      
      // Get tags for the image
      let tags = [];
      try {
        const tagsOutput = await getImageTags(filePath);
        if (tagsOutput) {
          tags = JSON.parse(tagsOutput);
        }
      } catch (error) {
        console.error('Error getting tags for image:', error);
      }

      return {
        name: file,
        path: filePath,
        url: `file://${filePath}`,
        size: stats.size,
        tags: tags || []
      };
    }));

    return {
      success: true,
      images: images
    };
  } catch (error) {
    console.error('Error getting images:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Function to get image tags using xattr
function getImageTags(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = getPythonScriptPath();
    console.log('Using Python script at:', scriptPath);
    
    const pythonProcess = spawnPythonProcess(scriptPath, [filePath]);
    let output = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python script stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Python script stdout:', output);
        try {
          // Ensure we have valid JSON
          JSON.parse(output.trim());
          resolve(output.trim());
        } catch (e) {
          console.error('Invalid JSON from Python script:', e);
          resolve('[]'); // Return empty tags array on invalid JSON
        }
      } else {
        console.error('Error executing Python script:', code);
        resolve('[]'); // Return empty tags array on error
      }
    });
  });
}

// Get the path to the Python script
const getPythonScriptPath = () => {
  const resourcePath = getResourcePath();
  return path.join(resourcePath, 'imgtagman', 'imgtag.py');
};

function spawnPythonProcess(scriptPath, args) {
  // Create a clean environment
  const env = {
    ...process.env,
    PATH: process.env.PATH,
    PYTHONPATH: process.env.PYTHONPATH,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  };

  console.log('Spawning Python process with env:', {
    PYTHONPATH: env.PYTHONPATH,
    OPENAI_API_KEY: env.OPENAI_API_KEY ? 'set' : 'not set',
    scriptPath,
    args
  });

  return spawn('python3', [scriptPath, ...args], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

// Handle directory processing
ipcMain.handle('process:directory', async (event, directoryPath) => {
  console.log('Processing directory:', directoryPath);

  if (!directoryPath) {
    console.error('No directory path provided');
    return {
      success: false,
      error: 'Nenhum diretório selecionado'
    };
  }

  try {
    const scriptPath = getPythonScriptPath();
    console.log('Using Python script at:', scriptPath);
    
    // Validate script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('Python script not found at:', scriptPath);
      return {
        success: false,
        error: `imgtagman script not found at: ${scriptPath}`
      };
    }

    const command = `python3 "${scriptPath}" "${directoryPath}"`;
    console.log('Running command:', command);

    return new Promise((resolve, reject) => {
      const pythonProcess = spawnPythonProcess(scriptPath, [directoryPath]);
      let output = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Command stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Command stdout:', output);
          resolve({
            success: true,
            output: output
          });
        } else {
          console.error('Error executing command:', code);
          console.error('Command stderr:', output);
          resolve({
            success: false,
            error: `Falha ao processar diretório: ${code}\nStderr: ${output}`
          });
        }
      });
    });
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: `Processing failed: ${error.message}`
    };
  }
});

ipcMain.handle('test:getImage', async () => {
  return {
    name: 'test-image.png',
    path: '/path/to/test-image.png',
    url: 'local-image://test-image.png',
    tags: ['test-tag-1', 'test-tag-2']
  };
});

// Handle processing directory
ipcMain.handle('directory:process', async (event, directoryPath) => {
  console.log('Processing directory:', directoryPath);

  if (!directoryPath) {
    console.error('No directory path provided');
    return {
      success: false,
      error: 'Nenhum diretório selecionado'
    };
  }

  try {
    const scriptPath = getPythonScriptPath();
    console.log('Using Python script at:', scriptPath);
    
    // Validate script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('Python script not found at:', scriptPath);
      return {
        success: false,
        error: `imgtagman script not found at: ${scriptPath}`
      };
    }

    const command = `python3 "${scriptPath}" "${directoryPath}"`;
    console.log('Running command:', command);

    return new Promise((resolve) => {
      const pythonProcess = spawnPythonProcess(scriptPath, [directoryPath]);
      let output = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error('Command stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Command stdout:', output);
          resolve({
            success: true,
            output: output
          });
        } else {
          console.error('Error executing command:', code);
          console.error('Command stderr:', output);
          resolve({
            success: false,
            error: `Falha ao processar diretório: ${code}\nStderr: ${output}`
          });
        }
      });
    });
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: `Processing failed: ${error.message}`
    };
  }
});

const config = {
  packagerConfig: {
    extraResource: [
      'imgtagman',
      'requirements.txt',
      'python_modules'
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    }
  ]
};

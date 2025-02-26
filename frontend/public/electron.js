const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec, execSync, spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
const { shell } = require('electron'); // Added necessary import

// Define supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
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
  createWindow();

  // Check if Python is installed
  exec('python3 --version', (error, stdout, stderr) => {
    if (error) {
      console.error('Python3 not found:', error);
      dialog.showErrorBox('Python Not Found', 'Python3 is required to run this application. Please install Python3 and try again.');
    } else {
      console.log('Python version:', stdout.trim());
    }
  });

  // Check if the imgtagman script exists
  const imgtagmanPath = path.resolve(__dirname, '../../imgtagman/imgtag.py');
  console.log('Checking imgtagman script at:', imgtagmanPath);
  if (fs.existsSync(imgtagmanPath)) {
    console.log('imgtagman script found at:', imgtagmanPath);
  } else {
    console.error('imgtagman script NOT found at:', imgtagmanPath);
    dialog.showErrorBox('Script Not Found', `The imgtagman script was not found at: ${imgtagmanPath}. Please ensure the application is properly installed.`);
  }

  protocol.registerFileProtocol('local-image', (request, callback) => {
    const filePath = request.url.replace('local-image://', '');
    try {
      return callback(decodeURIComponent(filePath));
    } catch (error) {
      console.error('Error loading image:', error);
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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

// Function to get image tags using xattr
function getImageTags(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`[DEBUG] Reading tags for: ${filePath}`);
    exec(`xattr -px com.apple.metadata:_kMDItemUserTags "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.log(`[DEBUG] No xattr tags found, trying alternative methods...`);
        exec(`mdls -raw -name kMDItemUserTags "${filePath}"`, (mdlsError, mdlsStdout, mdlsStderr) => {
          if (mdlsError || mdlsStdout.trim() === '(null)') {
            console.log(`[DEBUG] No tags found for ${filePath}`);
            return resolve([]);
          }
          try {
            const tags = mdlsStdout.trim().slice(1, -1).split(',').map(t => t.trim().replace(/^"|"$/g, ''));
            console.log(`[DEBUG] MDLS tags for ${filePath}:`, tags);
            resolve(tags);
          } catch (e) {
            console.error(`[DEBUG] Error parsing MDLS tags:`, e);
            resolve([]);
          }
        });
        return;
      }

      try {
        // Parse hex output to XML
        const hex = stdout.replace(/\s/g, '');
        const buffer = Buffer.from(hex, 'hex');
        const xmlString = buffer.toString('utf8');
        const tags = [...xmlString.matchAll(/<string>(.*?)<\/string>/g)].map(m => m[1]);
        console.log(`[DEBUG] XATTR tags for ${filePath}:`, tags);
        resolve(tags);
      } catch (e) {
        console.error(`[DEBUG] Error parsing XATTR tags:`, e);
        resolve([]);
      }
    });
  });
}

// Handle getting images from directory
ipcMain.handle('directory:getImages', async (event, directoryPath) => {
  try {
    console.log('[DEBUG] Main: Getting images from directory:', directoryPath);
    const files = fs.readdirSync(directoryPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    });
    console.log('[DEBUG] Main: Found image files:', imageFiles);

    const imagePromises = imageFiles.map(async file => {
      const filePath = path.join(directoryPath, file);
      try {
        // Get tags from xattr XML output
        const tags = await new Promise((resolve) => {
          exec(`xattr -l "${filePath}"`, (error, stdout, stderr) => {
            if (error || stderr) {
              console.log(`[DEBUG] Main: No tags found for ${file}, error:`, error || stderr);
              resolve([]);
            } else {
              try {
                console.log(`[DEBUG] Main: Raw xattr output for ${file}:`, stdout);
                // Find the user tags section
                const tagsMatch = stdout.match(/com\.apple\.metadata:_kMDItemUserTags:[\s\S]*?<array>([\s\S]*?)<\/array>/);
                if (!tagsMatch) {
                  console.log(`[DEBUG] Main: No tags section found for ${file} in output:`, stdout);
                  resolve([]);
                  return;
                }

                // Extract tags from XML
                const tagsXml = tagsMatch[1];
                console.log(`[DEBUG] Main: Found tags XML for ${file}:`, tagsXml);
                const tags = tagsXml.match(/<string>(.*?)<\/string>/g)
                  ?.map(tag => tag.replace(/<string>|<\/string>/g, '').trim())
                  .filter(Boolean) || [];
                
                console.log(`[DEBUG] Main: Extracted tags for ${file}:`, tags);
                resolve(tags);
              } catch (parseError) {
                console.error(`[DEBUG] Main: Error parsing tags for ${file}:`, parseError);
                resolve([]);
              }
            }
          });
        });

        const imageData = {
          name: file,
          path: filePath,
          url: `local-image://${encodeURIComponent(filePath)}`,
          tags: tags
        };
        console.log(`[DEBUG] Main: Final image data for ${file}:`, imageData);
        return imageData;
      } catch (error) {
        console.error(`[DEBUG] Main: Error processing ${file}:`, error);
        return {
          name: file,
          path: filePath,
          url: `local-image://${encodeURIComponent(filePath)}`,
          tags: []
        };
      }
    });

    const images = await Promise.all(imagePromises);
    console.log('[DEBUG] Main: All images data:', images);
    return {
      success: true,
      images
    };
  } catch (error) {
    console.error('[DEBUG] Main: Error getting images:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handle directory processing
ipcMain.handle('process:directory', async (event, directoryPath) => {
  console.log('Processing directory:', directoryPath);
  
  // Validate directory exists
  if (!fs.existsSync(directoryPath)) {
    return {
      success: false,
      error: `Directory does not exist: ${directoryPath}`
    };
  }

  try {
    // Get absolute path to imgtagman script
    const imgtagmanPath = path.resolve(__dirname, '../../imgtagman/imgtag.py');
    console.log('imgtagman path:', imgtagmanPath);
    
    // Validate script exists
    if (!fs.existsSync(imgtagmanPath)) {
      return {
        success: false,
        error: `imgtagman script not found at: ${imgtagmanPath}`
      };
    }

    // Log environment variables for debugging
    console.log('Environment variables:');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set (hidden)' : 'Not set');
    
    // Load from .env file
    let apiKey = process.env.OPENAI_API_KEY;
    try {
      const dotenv = require('dotenv');
      const envPath = path.resolve(__dirname, '../.env');
      console.log('Loading .env from:', envPath);
      if (fs.existsSync(envPath)) {
        const envConfig = dotenv.config({ path: envPath });
        if (envConfig.parsed && envConfig.parsed.OPENAI_API_KEY) {
          apiKey = envConfig.parsed.OPENAI_API_KEY;
          console.log('Successfully loaded API key from .env file');
        } else {
          console.log('No API key found in .env file');
        }
      } else {
        console.log('.env file not found at:', envPath);
      }
    } catch (error) {
      console.error('Error loading .env file:', error);
    }

    // Check if API key is available
    if (!apiKey) {
      console.error('No OpenAI API key found. Please set OPENAI_API_KEY in environment or .env file');
      return {
        success: false,
        error: 'No OpenAI API key found. Please set OPENAI_API_KEY in environment or .env file'
      };
    }

    // Try to run python with a simple command to verify it works
    try {
      const testResult = execSync('python3 -c "print(\'Python works\')"', { encoding: 'utf8' });
      console.log('Python test result:', testResult);
    } catch (error) {
      console.error('Python test failed:', error);
      return {
        success: false,
        error: `Python test failed: ${error.message}`
      };
    }

    // Use spawn instead of exec for better handling of large outputs
    const command = `python3 "${imgtagmanPath}" "${directoryPath}"`;
    console.log('Running command:', command);

    return new Promise((resolve, reject) => {
      const childProcess = spawn('python3', [imgtagmanPath, directoryPath], {
        env: {
          ...process.env,
          OPENAI_API_KEY: apiKey
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        console.log('Python output:', dataStr);
        stdout += dataStr;
      });

      childProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        console.error('Python error:', dataStr);
        stderr += dataStr;
      });

      childProcess.on('close', (code) => {
        console.log('Python process exited with code:', code);
        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            details: stderr
          });
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}`,
            output: stdout,
            details: stderr
          });
        }
      });

      childProcess.on('error', (error) => {
        console.error('Error executing Python script:', error);
        resolve({
          success: false,
          error: error.message,
          details: stderr
        });
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

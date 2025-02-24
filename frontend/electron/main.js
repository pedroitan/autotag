const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
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
      title: 'OpenAI API Key Required',
      message: 'Please enter your OpenAI API Key:',
      detail: 'The API key will be used only for this session and will not be stored.',
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

    const command = `python3 "${imgtagmanPath}" "${directoryPath}"`;
    console.log('Running command:', command);

    return new Promise((resolve, reject) => {
      const childProcess = exec(command, {
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY
        }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        console.log('Python output:', data);
        stdout += data;
      });

      childProcess.stderr.on('data', (data) => {
        console.error('Python error:', data);
        stderr += data;
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

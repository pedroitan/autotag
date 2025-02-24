import React, { useContext, useState } from 'react';
import { Grid, Paper, Typography, Box, Button, Alert, ImageList, ImageListItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CloudUpload as CloudUploadIcon, FolderOpenIcon, FolderShared as FolderIcon, FolderIcon as FolderSharedIcon } from '@mui/icons-material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { DirectoryContext } from '../../App';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper
}));

const ImageContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f5f5f5',
});

const StyledImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const Dashboard = () => {
  const { selectedDirectory, setSelectedDirectory, setImages, images } = useContext(DirectoryContext);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [failedImages, setFailedImages] = useState(new Set());

  const handleImageError = (imagePath) => {
    setFailedImages(prev => new Set([...prev, imagePath]));
  };

  const handleSelectDirectory = async () => {
    try {
      const directory = await window.electron.selectDirectory();
      if (directory) {
        setSelectedDirectory(directory);
        setError(null);
        
        // Get images from the selected directory
        const result = await window.electron.getImages(directory);
        if (result.success) {
          setImages(result.images);
          setError(null);
        } else {
          setError(result.error);
          setImages([]);
        }
      }
    } catch (error) {
      setError('Failed to select directory: ' + error.message);
      setSelectedDirectory(null);
      setImages([]);
    }
  };

  const handleProcessDirectory = async () => {
    if (!selectedDirectory) {
      setError('Please select a directory first');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electron.processDirectory(selectedDirectory);
      console.log('Processing response:', result);
      if (result.success) {
        setSuccess('Directory processed successfully!');
        setError(null);
      } else {
        setError(`Failed to process directory: ${result.error}`);
        setSuccess(null);
      }
    } catch (error) {
      setError('Failed to process directory: ' + error.message);
      setSuccess(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to AutoTag Drive
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <StyledPaper elevation={2}>
            <CloudUploadIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" gutterBottom>
              Select Local Directory
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Choose a directory containing images to process
            </Typography>
            
            <Button
              variant="outlined"
              onClick={handleSelectDirectory}
              sx={{ mb: 2 }}
            >
              Choose Directory
            </Button>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleProcessDirectory}
              disabled={!selectedDirectory || processing}
              sx={{ mt: 2 }}
            >
              {processing ? 'Processing...' : 'Process Directory'}
            </Button>
            
            {selectedDirectory && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Selected: {selectedDirectory}
              </Typography>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                {success}
              </Alert>
            )}
          </StyledPaper>
        </Grid>

        <Grid item xs={12} md={6}>
          <StyledPaper elevation={2}>
            <FolderIcon sx={{ fontSize: 60, mb: 2, color: 'secondary.main' }} />
            <Typography variant="h6" gutterBottom>
              Recent Directories
            </Typography>
            <Typography variant="body1">
              Quick access to your recently processed directories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No recent directories
            </Typography>
          </StyledPaper>
        </Grid>

        <Grid item xs={12}>
          <StyledPaper elevation={2}>
            <Typography variant="h6" gutterBottom>
              Processing Status
            </Typography>
            {processing ? (
              <Typography variant="body1" color="primary">
                Processing images...
              </Typography>
            ) : success ? (
              <Typography variant="body1" color="success.main">
                {success}
              </Typography>
            ) : (
              <Typography variant="body1">
                Ready to process
              </Typography>
            )}
          </StyledPaper>
        </Grid>

        <Grid item xs={12}>
          <StyledPaper elevation={2}>
            <Typography variant="h6" gutterBottom>
              Images in Directory
            </Typography>
            {images.length > 0 ? (
              <ImageList sx={{ width: '100%', height: 450 }} cols={3} rowHeight={200}>
                {images.map((image) => (
                  <ImageListItem key={image.path}>
                    <ImageContainer>
                      {failedImages.has(image.path) ? (
                        <Box sx={{ textAlign: 'center' }}>
                          <BrokenImageIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                          <Typography variant="caption" display="block">
                            Failed to load image
                          </Typography>
                        </Box>
                      ) : (
                        <StyledImage
                          src={image.url}
                          alt={image.name}
                          loading="lazy"
                          onError={() => handleImageError(image.path)}
                        />
                      )}
                    </ImageContainer>
                  </ImageListItem>
                ))}
              </ImageList>
            ) : (
              <Typography variant="body1">
                No images found in the selected directory
              </Typography>
            )}
          </StyledPaper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

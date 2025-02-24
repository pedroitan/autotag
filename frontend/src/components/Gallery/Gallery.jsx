import React, { useState, useContext, useEffect } from 'react';
import {
  Box,
  Typography,
  ImageList,
  ImageListItem,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Alert,
  Button,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { DirectoryContext } from '../../App';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  color: theme.palette.text.secondary,
}));

const ImageContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f5f5f5',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8,
  },
});

const StyledImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 1,
});

const DialogImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '80vh',
  objectFit: 'contain',
});

const NavigationButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  color: 'white',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
}));

const Gallery = () => {
  const { selectedDirectory, setSelectedDirectory, images, setImages } = useContext(DirectoryContext);
  const [error, setError] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      if (!selectedDirectory) return;

      try {
        const result = await window.electronAPI.getImages(selectedDirectory);
        console.log('[DEBUG] Gallery received images:', result);
        if (result.success) {
          console.log('[DEBUG] First image data:', result.images[0]);
          setImages(result.images);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch (error) {
        console.error('[DEBUG] Error loading images:', error);
        setError(error.message);
      }
    };

    loadImages();
  }, [selectedDirectory]);

  const handleImageError = (imagePath) => {
    setFailedImages(prev => new Set([...prev, imagePath]));
  };

  const handleSelectDirectory = async () => {
    try {
      const directory = await window.electronAPI.selectDirectory();
      if (directory) {
        setSelectedDirectory(directory);
        setError(null);
        setFailedImages(new Set());
        setImages([]);
      }
    } catch (error) {
      setError('Failed to select directory: ' + error.message);
      setSelectedDirectory(null);
      setImages([]);
    }
  };

  const handleImageClick = (image, index) => {
    console.log('[DEBUG] Clicked image:', { image, index });
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const handleClose = () => {
    setSelectedImage(null);
    setSelectedIndex(null);
  };

  const handlePrevious = () => {
    console.log('[DEBUG] Previous clicked. Current index:', selectedIndex);
    if (!images || images.length === 0) return;
    const newIndex = (selectedIndex - 1 + images.length) % images.length;
    console.log('[DEBUG] New index:', newIndex);
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleNext = () => {
    console.log('[DEBUG] Next clicked. Current index:', selectedIndex);
    if (!images || images.length === 0) return;
    const newIndex = (selectedIndex + 1) % images.length;
    console.log('[DEBUG] New index:', newIndex);
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      handlePrevious();
    } else if (event.key === 'ArrowRight') {
      handleNext();
    } else if (event.key === 'Escape') {
      handleClose();
    }
  };

  const renderImage = (image, index) => {
    console.log('[DEBUG] Rendering image with data:', {
      name: image.name,
      path: image.path,
      tags: image.tags,
      url: image.url
    });
    const imageTags = image.tags || [];
    const displayTags = imageTags.slice(0, 3); // Only show first 3 tags
    const hasMoreTags = imageTags.length > 3;
    console.log('[DEBUG] Image tags:', imageTags);

    return (
      <ImageListItem 
        key={image.path}
        onClick={() => handleImageClick(image, index)}
        sx={{ cursor: 'pointer' }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src={image.url}
            alt={image.name}
            loading="lazy"
            onError={() => handleImageError(image.path)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10
          }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {displayTags.length > 0 ? (
                <>
                  {displayTags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 1)'
                        },
                        height: '20px',
                        '& .MuiChip-label': {
                          fontSize: '0.65rem',
                          padding: '0 6px'
                        }
                      }}
                    />
                  ))}
                  {hasMoreTags && (
                    <Chip
                      label={`+${imageTags.length - 3}`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.8)'
                        },
                        height: '20px',
                        '& .MuiChip-label': {
                          fontSize: '0.65rem',
                          padding: '0 6px'
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No tags
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </ImageListItem>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <StyledPaper elevation={2}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Image Gallery
          </Typography>
          <Button
            variant="contained"
            startIcon={<FolderOpenIcon />}
            onClick={handleSelectDirectory}
          >
            Select Directory
          </Button>
        </Box>

        {selectedDirectory && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            Selected Directory: {selectedDirectory}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {images.length > 0 ? (
          <ImageList sx={{ width: '100%', height: 'calc(100vh - 300px)' }} cols={4} rowHeight={200} gap={8}>
            {images.map((image, index) => renderImage(image, index))}
          </ImageList>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {selectedDirectory ? 'No images found in the selected directory' : 'Please select a directory to view images'}
            </Typography>
          </Box>
        )}
      </StyledPaper>

      <Dialog
        open={!!selectedImage}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        onKeyDown={handleKeyDown}
      >
        <DialogContent sx={{ position: 'relative', p: 0, bgcolor: 'black' }}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              },
              zIndex: 2
            }}
          >
            <CloseIcon />
          </IconButton>
          
          {/* Navigation Buttons */}
          <IconButton
            onClick={handlePrevious}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              },
              zIndex: 2
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          
          <IconButton
            onClick={handleNext}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              },
              zIndex: 2
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          {/* Selected Image */}
          {selectedImage && (
            <Box sx={{ position: 'relative', width: '100%', textAlign: 'center', minHeight: '300px' }}>
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 150px)', // Leave space for tags
                  objectFit: 'contain'
                }}
                onError={() => handleImageError(selectedImage.path)}
              />
              {/* Tags container for large view */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {selectedImage.tags && selectedImage.tags.length > 0 ? (
                  selectedImage.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 1)'
                        },
                        height: '22px',
                        '& .MuiChip-label': {
                          fontSize: '0.75rem',
                          padding: '0 8px'
                        }
                      }}
                    />
                  ))
                ) : (
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    No tags
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Gallery;

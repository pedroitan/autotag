import React, { useState, useContext, useEffect } from 'react';
import {
  Box,
  Typography,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Modal,
  Paper,
  Alert,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Popover,
  Grid,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterIcon,
  BrokenImage as BrokenImageIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { DirectoryContext } from '../../App';
import SearchBar from '../SearchBar/SearchBar';

const StyledModal = styled(Modal)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[5],
  padding: theme.spacing(2),
  outline: 'none',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
}));

const StyledImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 'calc(90vh - 100px)',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      setError('Falha ao selecionar diretório: ' + error.message);
      setSelectedDirectory(null);
      setImages([]);
    }
  };

  const handleImageClick = (image, index) => {
    console.log('[DEBUG] Clicked image:', { image, index });
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handlePrevImage = () => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : images.length - 1;
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleNextImage = () => {
    const newIndex = selectedIndex < images.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      handlePrevImage();
    } else if (event.key === 'ArrowRight') {
      handleNextImage();
    } else if (event.key === 'Escape') {
      handleCloseModal();
    }
  };

  const tagCounts = images.reduce((counts, image) => {
    if (image.tags) {
      image.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
    return counts;
  }, {});

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const filteredImages = images.filter(image => {
    const matchesSearch = searchQuery === '' || 
      (image.tags && image.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    const matchesTags = selectedTags.length === 0 ||
      (image.tags && selectedTags.every(tag => 
        image.tags.includes(tag)
      ));

    return matchesSearch && matchesTags;
  });

  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <StyledPaper elevation={2}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Galeria de Imagens
          </Typography>
          <Button
            variant="contained"
            onClick={handleSelectDirectory}
          >
            Selecionar Diretório
          </Button>
        </Box>

        {selectedDirectory && (
          <Typography variant="body1" sx={{ mb: 2 }}>
            Diretório selecionado: {selectedDirectory}
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        {!selectedDirectory && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Nenhum diretório selecionado
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Selecione um diretório para visualizar as imagens
            </Typography>
          </Box>
        )}
      </StyledPaper>

      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        handleTagClick={handleTagClick}
        tagCounts={topTags}
        anchorEl={anchorEl}
        handleFilterClick={handleFilterClick}
        handleFilterClose={handleFilterClose}
      />

      {/* Gallery Content */}
      <Box>
        {filteredImages.length > 0 ? (
          <ImageList sx={{ width: '100%', height: 'calc(100vh - 300px)' }} cols={isMobile ? 1 : 4} rowHeight={200} gap={8}>
            {filteredImages.map((image, index) => (
              <ImageListItem key={image.path} onClick={() => handleImageClick(image, index)}>
                {failedImages.has(image.path) ? (
                  <Box
                    sx={{
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.200'
                    }}
                  >
                    <BrokenImageIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                  </Box>
                ) : (
                  <img
                    src={image.url}
                    alt={image.name}
                    loading="lazy"
                    style={{ cursor: 'pointer' }}
                  />
                )}
                <ImageListItemBar
                  title={image.name}
                  subtitle={
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {image.tags && image.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTagClick(tag);
                          }}
                          sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        />
                      ))}
                      {image.tags && image.tags.length > 3 && (
                        <Chip
                          label={`+${image.tags.length - 3}`}
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        />
                      )}
                    </Box>
                  }
                />
              </ImageListItem>
            ))}
          </ImageList>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1">
              {selectedDirectory ? 'Nenhuma imagem encontrada com os filtros selecionados' : 'Selecione um diretório para visualizar as imagens'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Image Modal */}
      <StyledModal
        open={Boolean(selectedImage)}
        onClose={handleCloseModal}
        onKeyDown={handleKeyDown}
      >
        <StyledPaper>
          {selectedImage && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <IconButton onClick={handleCloseModal} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <StyledImage
                  src={selectedImage.url}
                  alt={selectedImage.name}
                />
                <NavigationButton
                  onClick={handlePrevImage}
                  sx={{ left: theme.spacing(1) }}
                >
                  <ChevronLeftIcon />
                </NavigationButton>
                <NavigationButton
                  onClick={handleNextImage}
                  sx={{ right: theme.spacing(1) }}
                >
                  <ChevronRightIcon />
                </NavigationButton>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">{selectedImage.name}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {selectedImage.tags && selectedImage.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      onClick={() => handleTagClick(tag)}
                    />
                  ))}
                </Box>
              </Box>
            </>
          )}
        </StyledPaper>
      </StyledModal>
    </Box>
  );
};

export default Gallery;

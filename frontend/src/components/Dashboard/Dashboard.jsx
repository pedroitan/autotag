import React, { useContext, useState, useMemo } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Alert,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Popover
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  CloudUpload as CloudUploadIcon, 
  Folder as FolderIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DirectoryContext } from '../../App';
import Gallery from '../Gallery/Gallery';

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

const Dashboard = () => {
  const { selectedDirectory, setSelectedDirectory, setImages, images } = useContext(DirectoryContext);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  // Get all unique tags and their counts
  const tagCounts = useMemo(() => {
    const counts = {};
    images.forEach(image => {
      if (image.tags) {
        image.tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    // Sort by count in descending order
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Get top 10 tags
  }, [images]);

  // Filter images based on search query and selected tags
  const filteredImages = useMemo(() => {
    return images.filter(image => {
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
  }, [images, searchQuery, selectedTags]);

  const handleSelectDirectory = async () => {
    try {
      const directory = await window.electronAPI.selectDirectory();
      if (directory) {
        setSelectedDirectory(directory);
        setError(null);
        
        // Get images from the selected directory
        const result = await window.electronAPI.getImages(directory);
        if (result.success) {
          setImages(result.images);
          setError(null);
        } else {
          setError(result.error);
          setImages([]);
        }
      }
    } catch (error) {
      setError('Falha ao selecionar diretório: ' + error.message);
      setSelectedDirectory(null);
      setImages([]);
    }
  };

  const handleProcessDirectory = async () => {
    if (!selectedDirectory) {
      setError('Por favor, selecione um diretório primeiro');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.processDirectory(selectedDirectory);
      console.log('Resposta do processamento:', result);
      if (result.success) {
        setSuccess('Diretório processado com sucesso!');
        setError(null);
        
        // Refresh images after processing
        const imagesResult = await window.electronAPI.getImages(selectedDirectory);
        if (imagesResult.success) {
          setImages(imagesResult.images);
        }
      } else {
        setError(`Falha ao processar diretório: ${result.error}`);
        setSuccess(null);
      }
    } catch (error) {
      setError('Falha ao processar diretório: ' + error.message);
      setSuccess(null);
    } finally {
      setProcessing(false);
    }
  };

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
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bem-vindo ao AutoTag Drive
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <StyledPaper elevation={2}>
            <CloudUploadIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
            <Typography variant="h6" gutterBottom>
              Selecionar Diretório Local
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Escolha um diretório contendo imagens para processar
            </Typography>
            
            <Button
              variant="outlined"
              onClick={handleSelectDirectory}
              sx={{ mb: 2 }}
            >
              Escolher Diretório
            </Button>
            
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleProcessDirectory}
              disabled={!selectedDirectory || processing}
              sx={{ mt: 2 }}
            >
              {processing ? 'Processando...' : 'Processar Diretório'}
            </Button>
            
            {selectedDirectory && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Selecionado: {selectedDirectory}
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
              Diretórios Recentes
            </Typography>
            <Typography variant="body1">
              Acesso rápido aos seus diretórios recentemente processados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Nenhum diretório recente
            </Typography>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Gallery Section */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <TextField
                  fullWidth
                  placeholder="Buscar por tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item>
                <IconButton onClick={handleFilterClick}>
                  <FilterIcon />
                </IconButton>
                <Popover
                  open={Boolean(anchorEl)}
                  anchorEl={anchorEl}
                  onClose={handleFilterClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <Box sx={{ p: 2, maxWidth: 300 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Tags mais comuns
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {tagCounts.map(([tag, count]) => (
                        <Chip
                          key={tag}
                          label={`${tag} (${count})`}
                          onClick={() => handleTagClick(tag)}
                          color={selectedTags.includes(tag) ? "primary" : "default"}
                        />
                      ))}
                    </Box>
                  </Box>
                </Popover>
              </Grid>
            </Grid>
            {selectedTags.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedTags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleTagClick(tag)}
                    color="primary"
                  />
                ))}
              </Box>
            )}
          </Box>

          {selectedDirectory ? (
            filteredImages.length > 0 ? (
              <Gallery images={filteredImages} />
            ) : (
              <Typography variant="body1" textAlign="center" sx={{ py: 4 }}>
                Nenhuma imagem encontrada com os filtros selecionados
              </Typography>
            )
          ) : (
            <Typography variant="body1" textAlign="center" sx={{ py: 4 }}>
              Selecione um diretório para visualizar as imagens
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;

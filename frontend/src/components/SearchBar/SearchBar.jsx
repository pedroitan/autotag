import React from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Typography,
  Chip,
  Popover
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

const SearchBar = ({ 
  searchQuery, 
  setSearchQuery, 
  selectedTags, 
  handleTagClick,
  tagCounts,
  anchorEl,
  handleFilterClick,
  handleFilterClose
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
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
      </Paper>

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
    </Box>
  );
};

export default SearchBar;

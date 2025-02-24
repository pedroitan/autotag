import React, { useState } from 'react';
import {
  Box,
  Chip,
  TextField,
  Typography,
  Paper,
  IconButton,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';

const TagEditor = ({ tags = [], onTagsChange }) => {
  const [newTag, setNewTag] = useState('');
  const [editMode, setEditMode] = useState(false);

  const handleDelete = (tagToDelete) => {
    const updatedTags = tags.filter((tag) => tag !== tagToDelete);
    onTagsChange(updatedTags);
  };

  const handleAddTag = (event) => {
    event.preventDefault();
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      onTagsChange(updatedTags);
      setNewTag('');
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Tags</Typography>
        <IconButton onClick={() => setEditMode(!editMode)} size="small">
          <EditIcon />
        </IconButton>
      </Box>

      <Box sx={{ mb: 2 }}>
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onDelete={editMode ? () => handleDelete(tag) : undefined}
            sx={{ m: 0.5 }}
          />
        ))}
      </Box>

      {editMode && (
        <form onSubmit={handleAddTag}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                size="small"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add new tag"
                variant="outlined"
              />
            </Grid>
            <Grid item>
              <IconButton type="submit" color="primary" size="small">
                <AddIcon />
              </IconButton>
            </Grid>
          </Grid>
        </form>
      )}
    </Paper>
  );
};

export default TagEditor;

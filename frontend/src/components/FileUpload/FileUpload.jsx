import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Paper, Typography, LinearProgress } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const UploadBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  border: '2px dashed #ccc',
  '&:hover': {
    border: `2px dashed ${theme.palette.primary.main}`,
  },
}));

const FileUpload = ({ onUpload, isUploading = false, progress = 0 }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov', '.avi']
    }
  });

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      <UploadBox {...getRootProps()}>
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? "Drop the files here..."
            : "Drag 'n' drop files here, or click to select files"}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Supports images (JPG, PNG, GIF) and videos (MP4, MOV, AVI)
        </Typography>
      </UploadBox>
      {isUploading && (
        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="textSecondary" align="center">
            {`Uploading... ${progress}%`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;

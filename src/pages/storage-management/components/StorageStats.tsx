import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { pdfStorageService } from '../../../services/pdfStorageService';

// Utility function for formatting file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface StorageStatsData {
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
}

export const StorageStats: React.FC = () => {
  const [stats, setStats] = useState<StorageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const folders = (await pdfStorageService.listUserFolders()) || [];
      
      let totalFiles = 0;
      let totalSize = 0;
      
      // Calculate total files and size across all folders
      for (const folder of folders) {
        totalFiles += folder.fileCount;
        totalSize += folder.totalSize;
      }
      
      setStats({
        totalFolders: folders.length,
        totalFiles,
        totalSize
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load storage statistics';
      setError(errorMessage);
      console.error('Error loading storage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load storage statistics: {error}
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon color="primary" />
          Storage Overview
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <FolderIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                {stats.totalFolders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Folder{stats.totalFolders !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <PdfIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                {stats.totalFiles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                File{stats.totalFiles !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <StorageIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                {formatFileSize(stats.totalSize)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Size
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        {stats.totalFiles === 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Chip 
              label="No files uploaded yet" 
              variant="outlined" 
              color="default"
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}; 
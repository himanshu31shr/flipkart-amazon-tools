import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  Button,
  Stack
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { FileInfo, pdfStorageService } from '../../../services/pdfStorageService';

// Utility function for formatting file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface TodaysFilesWidgetProps {
  /** Optional callback when refresh button is clicked */
  onRefresh?: () => void;
  /** Optional date to show files for, defaults to today */
  selectedDate?: Date;
}

export const TodaysFilesWidget: React.FC<TodaysFilesWidgetProps> = ({ 
  onRefresh, 
  selectedDate = new Date() 
}) => {
  const theme = useTheme();
  
  // State management
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateString, setDateString] = useState<string>('');

  // Load files for the selected date from all users (universal access)
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get date string for display
      const displayDateString = pdfStorageService.getDateString(selectedDate);
      setDateString(displayDateString);
      
      // Load files for the selected date from all users
      const loadedFiles = await pdfStorageService.listFilesForDate(selectedDate);
      setFiles(loadedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      console.error('Error loading files for date:', selectedDate, err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file download
  const handleFileDownload = (file: FileInfo) => {
    window.open(file.downloadUrl, '_blank');
  };

  // Handle refresh
  const handleRefresh = () => {
    loadFiles();
    onRefresh?.();
  };

  // Initialize on component mount and when selectedDate changes
  useEffect(() => {
    loadFiles();
  }, [selectedDate]);

  // Check if the selected date is today
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const widgetTitle = isToday ? "Today's Files (All Users)" : `Files for ${dateString} (All Users)`;

  return (
    <Card 
      elevation={2} 
      sx={{ 
        mb: 3,
        border: `2px solid ${theme.palette.primary.main}`,
        borderRadius: 2
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon color="primary" />
            <Typography variant="h6" component="h2">
              {widgetTitle}
            </Typography>
            <Chip 
              label={dateString} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          <IconButton onClick={handleRefresh} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Error state */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* No files state */}
        {!loading && !error && files.length === 0 && (
          <Alert severity="info">
            No files available for download on {dateString}. Files from all users are shown when available.
          </Alert>
        )}

        {/* Files grid */}
        {!loading && !error && files.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {files.length} file{files.length !== 1 ? 's' : ''} available for download from all users
            </Typography>
            
            <Grid container spacing={2}>
              {files.map((file) => (
                <Grid item xs={12} sm={6} md={4} key={file.path}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                        <PdfIcon color="error" sx={{ mt: 0.5, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              wordBreak: 'break-word',
                              lineHeight: 1.2,
                              fontSize: '0.875rem'
                            }}
                          >
                            {file.name}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Stack spacing={0.5}>
                        <Chip 
                          label={formatFileSize(file.size)} 
                          size="small" 
                          variant="outlined"
                          sx={{ width: 'fit-content' }}
                        />
                        {/* Show owner information for clarity in universal access mode */}
                        {file.metadata?.userId && (
                          <Typography variant="caption" color="text.secondary">
                            Owner: {file.metadata.userId.substring(0, 8)}...
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(file.lastModified)}
                        </Typography>
                      </Stack>
                    </CardContent>
                    
                    <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                      <Button
                        startIcon={<DownloadIcon />}
                        onClick={() => handleFileDownload(file)}
                        variant="contained"
                        size="small"
                        fullWidth
                      >
                        Download
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
}; 
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  useTheme
} from '@mui/material';
import {
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { FolderInfo, FileInfo, pdfStorageService } from '../../services/pdfStorageService';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { StorageStats } from './components/StorageStats';

// Utility functions for formatting
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
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const StorageManagementPage: React.FC = () => {
  const theme = useTheme();
  
  // State management
  const [currentPath, setCurrentPath] = useState<string>('');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ name: string; path: string }>>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'folder' | 'file'; item: FolderInfo | FileInfo } | null>(null);
  
  // Notification states
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Load folders and files for current path
  const loadCurrentPath = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (currentPath === '') {
        // Load all folders from all users using universal access
        const allFolders = await pdfStorageService.listAllFolders();
        setFolders(allFolders);
        setFiles([]);
      } else {
        // Load contents of specific folder
        const folderContents = await pdfStorageService.listFolderContents(currentPath);
        // Separate folders and files (Firebase Storage doesn't have explicit folders, so we'll simulate with prefixes)
        setFiles(folderContents);
        setFolders([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load storage contents';
      setError(errorMessage);
      console.error('Error loading storage contents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize breadcrumbs based on current path
  const updateBreadcrumbs = () => {
    if (currentPath === '') {
      setBreadcrumbs([]);
      return;
    }
    
    const pathParts = currentPath.split('/').filter(Boolean);
    const newBreadcrumbs = [];
    let accumulatedPath = '';
    
    for (let i = 2; i < pathParts.length; i++) { // Skip 'pdfs' and userId
      accumulatedPath += (accumulatedPath ? '/' : '') + pathParts[i];
      newBreadcrumbs.push({
        name: pathParts[i],
        path: `pdfs/${pathParts[1]}/${accumulatedPath}`
      });
    }
    
    setBreadcrumbs(newBreadcrumbs);
  };

  // Navigate to a specific path
  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  // Handle folder double-click/tap
  const handleFolderOpen = (folder: FolderInfo) => {
    navigateToPath(folder.path);
  };

  // Handle delete button click
  const handleDeleteClick = (type: 'folder' | 'file', item: FolderInfo | FileInfo) => {
    setItemToDelete({ type, item });
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      
      if (itemToDelete.type === 'folder') {
        await pdfStorageService.deleteFolderRecursive(itemToDelete.item.path);
        setSnackbarMessage('Folder deleted successfully');
      } else {
        await pdfStorageService.deleteFile(itemToDelete.item.path);
        setSnackbarMessage('File deleted successfully');
      }
      
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Reload current path
      await loadCurrentPath();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item';
      setError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Handle file download
  const handleFileDownload = (file: FileInfo) => {
    window.open(file.downloadUrl, '_blank');
  };

  // Effects
  useEffect(() => {
    loadCurrentPath();
  }, [currentPath]);

  useEffect(() => {
    updateBreadcrumbs();
  }, [currentPath]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Storage Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage PDF files and folders from all users (universal access enabled)
        </Typography>
      </Box>

      {/* Storage Stats */}
      <Box sx={{ mb: 3 }}>
        <StorageStats />
      </Box>

      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="folder navigation"
        >
          <Link
            component="button"
            variant="body1"
            onClick={() => navigateToPath('')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            All Files
          </Link>
          {breadcrumbs.map((crumb) => (
            <Link
              key={crumb.path}
              component="button"
              variant="body1"
              onClick={() => navigateToPath(crumb.path)}
              sx={{
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {crumb.name}
            </Link>
          ))}
        </Breadcrumbs>
      </Box>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          onClick={loadCurrentPath}
          disabled={loading}
          aria-label="refresh"
          color="primary"
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Content Grid */}
      {!loading && (
        <Grid container spacing={2}>
          {/* Folders */}
          {folders.map((folder) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              key={folder.path}
            >
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent
                  onClick={() => handleFolderOpen(folder)}
                  sx={{ pb: 1 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FolderIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
                    <Typography variant="h6" component="div" noWrap>
                      {folder.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(folder.totalSize)}
                  </Typography>
                  <Chip
                    label={formatRelativeTime(folder.lastModified)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick('folder', folder);
                    }}
                    aria-label="delete folder"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Files */}
          {files.map((file) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              key={file.path}
            >
              <Card
                sx={{
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PdfIcon color="error" sx={{ mr: 1, fontSize: 32 }} />
                    <Typography variant="h6" component="div" noWrap title={file.name}>
                      {file.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatFileSize(file.size)}
                  </Typography>
                  {/* Show owner information for clarity in universal access mode */}
                  {file.metadata?.userId && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Owner: {file.metadata.userId.substring(0, 8)}...
                    </Typography>
                  )}
                  <Chip
                    label={formatRelativeTime(file.lastModified)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleFileDownload(file)}
                    aria-label="download file"
                  >
                    <DownloadIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteClick('file', file)}
                    aria-label="delete file"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Empty State */}
          {!loading && folders.length === 0 && files.length === 0 && (
            <Grid item xs={12}>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 8,
                  color: 'text.secondary'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No files or folders found
                </Typography>
                <Typography variant="body2">
                  No PDF files have been uploaded yet. Upload some files to get started with storage management.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemType={itemToDelete?.type || 'file'}
        itemName={itemToDelete?.item.name || ''}
        folderStats={
          itemToDelete?.type === 'folder'
            ? {
                fileCount: (itemToDelete.item as FolderInfo).fileCount,
                totalSize: (itemToDelete.item as FolderInfo).totalSize
              }
            : undefined
        }
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}; 
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
  useTheme,
  ToggleButtonGroup,
  ToggleButton,
  Avatar
} from '@mui/material';
import {
  Folder as FolderIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { FolderInfo, FileInfo, pdfStorageService, UploadResult } from '../../services/pdfStorageService';
import { roleAccessService } from '../../services/role-access.service';
import { UserDetails, PaginationOptions } from '../../types/auth.types';
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
  
  // Multi-user view states
  const [isAdminView, setIsAdminView] = useState(false);
  const [allUserPdfs, setAllUserPdfs] = useState<UploadResult[]>([]);
  const [userDetailsMap, setUserDetailsMap] = useState<Record<string, UserDetails>>({});
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'folder' | 'file'; item: FolderInfo | FileInfo } | null>(null);
  
  // Notification states
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Check admin access on component mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const adminAccess = await roleAccessService.hasAdminAccess();
        setHasAdminAccess(adminAccess);
      } catch (err) {
        console.error('Error checking admin access:', err);
        setHasAdminAccess(false);
      }
    };

    checkAdminAccess();
  }, []);

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
    updateBreadcrumbs();
  };

  // Handle folder double-click/tap
  const handleFolderOpen = (folder: FolderInfo) => {
    navigateToPath(folder.path);
  };

  // Load all user PDFs for admin view
  const loadAllUserPdfs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const paginationOptions: PaginationOptions = {
        page: 1,
        pageSize: 50,
        sortBy: 'uploadDate',  // Changed from 'uploadedAt' to 'uploadDate'
        sortOrder: 'desc'
      };

      const result = await pdfStorageService.listAllUserPdfs(paginationOptions);

      setAllUserPdfs(result.pdfs);

      // Get user details for these PDFs
      const userDetailsMap = await pdfStorageService.getUserDetailsForPdfs(
        result.pdfs.map(pdf => pdf.fileId)
      );
      setUserDetailsMap(userDetailsMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDFs';
      setError(errorMessage);
      console.error('Error loading all user PDFs:', err);
    } finally {
      setLoading(false);
    }
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

  // Toggle between personal and admin view
  const handleViewToggle = async (newValue: boolean) => {
    try {
      setIsAdminView(newValue);
      setLoading(true);
      
      if (newValue) {
        await loadAllUserPdfs();
      } else {
        await loadCurrentPath();
      }
    } catch (err) {
      console.error('Error toggling view:', err);
    }
  };

  // Effects
  useEffect(() => {
    loadCurrentPath();
  }, [currentPath]);

  // Render method for admin view
  const renderAdminView = () => (
    <Grid container spacing={2}>
      {allUserPdfs.map((pdf) => {
        const userDetails = userDetailsMap[pdf.metadata.userId] || {};
        
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={pdf.fileId}>
            <Card>
              <CardContent>
                {/* User Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    src={userDetails.photoURL} 
                    sx={{ mr: 2, width: 40, height: 40 }}
                  >
                    {userDetails.displayName ? userDetails.displayName[0] : <PersonIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1">
                      {userDetails.displayName || 'Unknown User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {userDetails.email}
                    </Typography>
                  </Box>
                </Box>

                {/* PDF Details */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PdfIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" noWrap>
                    {pdf.metadata.originalFileName}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={formatFileSize(pdf.metadata.fileSize)} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={formatRelativeTime(new Date(pdf.metadata.uploadedAt))} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
              </CardContent>
              <CardActions>
                <IconButton 
                  color="primary" 
                  onClick={() => window.open(pdf.downloadUrl, '_blank')}
                >
                  <DownloadIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  // Render method for personal view
  const renderPersonalView = () => (
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
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Storage Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isAdminView ? 'All Users\' Files' : 'Manage your uploaded PDF files and folders'}
          </Typography>
        </Box>

        {/* Admin View Toggle */}
        {hasAdminAccess && (
          <ToggleButtonGroup
            value={isAdminView}
            exclusive
            onChange={(e, newValue) => newValue !== null && handleViewToggle(newValue)}
            color="primary"
          >
            <ToggleButton value={false}>My Files</ToggleButton>
            <ToggleButton value={true}>All Users</ToggleButton>
          </ToggleButtonGroup>
        )}
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

      {/* Content Rendering */}
      {!loading && (
        isAdminView ? renderAdminView() : renderPersonalView()
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
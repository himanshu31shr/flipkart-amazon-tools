import React, { useEffect, lazy, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import CategoryIcon from '@mui/icons-material/Category';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchProducts } from '../../store/slices/productsSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import SimpleCategoryTable from './SimpleCategoryTable';
import { CategoryDataService } from '../../services/categoryData.service';
import CategoryImportModal from './components/CategoryImportSection';
import { useIsMobile } from '../../utils/mobile';

// Lazy load mobile component
const MobileCategoriesPage = lazy(() =>
  import('./mobile/MobileCategoriesPage').then(m => ({ default: m.MobileCategoriesPage }))
);

// Desktop component
const DesktopCategoriesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<'success' | 'error'>('success');
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const categoryDataService = new CategoryDataService();

  useEffect(() => {
    // Only fetch data if authenticated
    if (isAuthenticated) {
      dispatch(fetchProducts({}));
    }
  }, [dispatch, isAuthenticated]);

  const handleRefresh = () => {
    dispatch(fetchProducts({}));
    // Also trigger refresh of UnifiedCategoryTable
    setRefreshTrigger(prev => prev + 1);
  };


  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await categoryDataService.exportCategories();
      if (result.success) {
        setSnackbarMessage('Category data exported successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('Export failed: ' + result.errors.join(', '));
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      setSnackbarMessage('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const refreshAllData = async () => {
    if (isAuthenticated) {
      try {
        await dispatch(fetchProducts({}));
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }
  };

  const handleImportSuccess = async () => {
    // Refresh data after successful import
    setSnackbarMessage('Categories imported successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    
    // Small delay to ensure database operations are committed
    setTimeout(() => {
      refreshAllData();
      // Trigger refresh of UnifiedCategoryTable
      setRefreshTrigger(prev => prev + 1);
    }, 500);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CategoryIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            Category Management
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Data Management Actions */}
          <Button 
            variant="outlined" 
            onClick={handleExport}
            disabled={isExporting}
            startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
            sx={{ mr: 2, fontWeight: 'medium' }}
          >
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={() => setImportModalOpen(true)}
            startIcon={<UploadIcon />}
            sx={{ mr: 2, fontWeight: 'medium' }}
          >
            Import Data
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleRefresh}
            disabled={false}
            startIcon={<RefreshIcon />}
            sx={{ fontWeight: 'medium' }}
          >
            Refresh All Data
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />


        {/* Simple Category Table */}
        <SimpleCategoryTable 
          refreshTrigger={refreshTrigger} 
          onDataChange={() => setRefreshTrigger(prev => prev + 1)}
        />
      </Paper>

      {/* Import Modal */}
            <CategoryImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Main wrapper component with mobile detection
export const CategoriesPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }
      >
        <MobileCategoriesPage />
      </Suspense>
    );
  }

  return <DesktopCategoriesPage />;
};

export default CategoriesPage;

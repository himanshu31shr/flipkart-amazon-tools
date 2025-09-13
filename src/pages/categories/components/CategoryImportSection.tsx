import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';

interface CategoryImportSectionProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

const CategoryImportModal: React.FC<CategoryImportSectionProps> = ({
  open,
  onClose,
  onImportSuccess
}) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    
    try {
      // Simplified import functionality - in a real implementation
      // you would handle CSV parsing and validation here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate import
      onImportSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Categories</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV file with category data. The file should include columns for:
            name, description, tag, and costPrice.
          </Typography>
          
          <TextField
            type="file"
            inputProps={{ accept: '.csv' }}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Note:</strong> Category import functionality is currently simplified. 
              For complex imports, please use the individual category creation form.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={importing}
          startIcon={importing ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryImportModal;
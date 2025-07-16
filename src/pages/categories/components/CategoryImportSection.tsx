import React, { useState, useCallback } from 'react';
import {
  Typography,
  Box,
  Button,
  LinearProgress,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloseIcon from '@mui/icons-material/Close';
import { CategoryDataService } from '../../../services/categoryData.service';
import {
  ImportResult,
  ImportValidationReport,
  ImportConfiguration,
  OperationProgress
} from '../../../types/categoryExportImport.types';

interface CategoryImportModalProps {
  open: boolean;
  onClose: () => void;
}

export const CategoryImportModal: React.FC<CategoryImportModalProps> = ({ open, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationReport, setValidationReport] = useState<ImportValidationReport | null>(null);
  const [importProgress, setImportProgress] = useState<OperationProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Import configuration options
  const [config, setConfig] = useState<ImportConfiguration>({
    validateBeforeImport: true,
    updateExistingCategories: false,
    createMissingProducts: true,
    conflictResolution: {
      duplicateCategories: 'update',
      duplicateSKUs: 'update',
      invalidData: 'skip'
    },
    batchSize: 50
  });

  const categoryDataService = new CategoryDataService();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.type === 'text/csv' || file.name.endsWith('.csv'));
    
    if (csvFile) {
      setSelectedFile(csvFile);
      validateFile(csvFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      validateFile(file);
    }
  }, []);

  const validateFile = async (file: File) => {
    setIsValidating(true);
    setValidationReport(null);
    setImportResult(null);

    try {
      const report = await categoryDataService.validateImportData(file, config);
      setValidationReport(report);
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationReport({
        isValid: false,
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        warningRows: 0,
        categoryResults: [],
        globalErrors: [{
          field: 'file',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
          code: 'VALIDATION_FAILED'
        }],
        duplicateCategories: [],
        duplicateSKUs: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validationReport?.isValid) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await categoryDataService.importCategories(
        selectedFile,
        config,
        undefined, // Use default persistence options
        {
          onProgress: (progress: OperationProgress) => {
            setImportProgress(progress);
          }
        }
      );
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        totalProcessed: 0,
        categoriesCreated: 0,
        categoriesUpdated: 0,
        categoriesSkipped: 0,
        productsCreated: 0,
        productsUpdated: 0,
        inventoryUpdated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        importTime: 0
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleConfigChange = (key: keyof ImportConfiguration, value: boolean | string | number | object) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Re-validate if file is selected
    if (selectedFile) {
      validateFile(selectedFile);
    }
  };

  const handleClose = () => {
    // Reset all state when closing
    setSelectedFile(null);
    setValidationReport(null);
    setImportProgress(null);
    setImportResult(null);
    setIsValidating(false);
    setIsImporting(false);
    setIsDragOver(false);
    onClose();
  };

  const canImport = selectedFile && validationReport?.isValid && !isValidating && !isImporting;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
            Import Category Data
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* File Upload Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
            Select CSV File
          </Typography>
          
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: isDragOver ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              backgroundColor: isDragOver ? 'primary.50' : 'grey.50',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50'
              }
            }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1 }}>
              {selectedFile ? selectedFile.name : 'Drag and drop your CSV file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedFile ? 'Click to select a different file' : 'or click to browse files'}
            </Typography>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </Box>
        </Box>

        {/* Import Configuration */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
            Import Options
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.updateExistingCategories}
                  onChange={(e) => handleConfigChange('updateExistingCategories', e.target.checked)}
                />
              }
              label="Update existing categories"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.createMissingProducts}
                  onChange={(e) => handleConfigChange('createMissingProducts', e.target.checked)}
                />
              }
              label="Create missing products"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={config.validateBeforeImport}
                  onChange={(e) => handleConfigChange('validateBeforeImport', e.target.checked)}
                />
              }
              label="Validate before import"
            />
          </Box>
        </Box>

        {/* Validation Status */}
        {isValidating && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Validating file...</Typography>
            <LinearProgress />
          </Box>
        )}

        {validationReport && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
              Validation Results
            </Typography>
            
            <Alert 
              severity={validationReport.isValid ? 'success' : 'error'} 
              icon={validationReport.isValid ? <CheckCircleIcon /> : <ErrorIcon />}
              sx={{ mb: 2 }}
            >
              {validationReport.isValid 
                ? 'File validation passed successfully!'
                : 'File validation failed. Please review the errors below.'
              }
            </Alert>

            {/* Validation Summary */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`${validationReport.totalRows} total rows`} size="small" />
              <Chip label={`${validationReport.validRows} valid`} color="success" size="small" />
              {validationReport.errorRows > 0 && (
                <Chip label={`${validationReport.errorRows} invalid`} color="error" size="small" />
              )}
              {validationReport.duplicateCategories.length > 0 && (
                <Chip label={`${validationReport.duplicateCategories.length} duplicates`} color="warning" size="small" />
              )}
            </Box>

            {/* Errors */}
            {validationReport.globalErrors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1, color: 'error.main' }}>
                  Errors:
                </Typography>
                <List dense>
                  {validationReport.globalErrors.slice(0, 5).map((error, index) => (
                    <ListItem key={index} sx={{ py: 0.25 }}>
                      <ListItemText 
                        primary={error.message}
                        primaryTypographyProps={{ variant: 'body2', color: 'error.main' }}
                      />
                    </ListItem>
                  ))}
                  {validationReport.globalErrors.length > 5 && (
                    <ListItem sx={{ py: 0.25 }}>
                      <ListItemText 
                        primary={`... and ${validationReport.globalErrors.length - 5} more errors`}
                        primaryTypographyProps={{ variant: 'body2', color: 'error.main', fontStyle: 'italic' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {/* Duplicate Warnings */}
            {(validationReport.duplicateCategories.length > 0 || validationReport.duplicateSKUs.length > 0) && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1, color: 'warning.main' }}>
                  Warnings:
                </Typography>
                <List dense>
                  {validationReport.duplicateCategories.length > 0 && (
                    <ListItem sx={{ py: 0.25 }}>
                      <ListItemText 
                        primary={`Duplicate categories: ${validationReport.duplicateCategories.slice(0, 3).join(', ')}${validationReport.duplicateCategories.length > 3 ? '...' : ''}`}
                        primaryTypographyProps={{ variant: 'body2', color: 'warning.main' }}
                      />
                    </ListItem>
                  )}
                  {validationReport.duplicateSKUs.length > 0 && (
                    <ListItem sx={{ py: 0.25 }}>
                      <ListItemText 
                        primary={`Duplicate SKUs: ${validationReport.duplicateSKUs.slice(0, 3).join(', ')}${validationReport.duplicateSKUs.length > 3 ? '...' : ''}`}
                        primaryTypographyProps={{ variant: 'body2', color: 'warning.main' }}
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}
          </Box>
        )}

        {/* Import Progress */}
        {importProgress && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {importProgress.phase}: {importProgress.current} / {importProgress.total}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={importProgress.percentage} 
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {importProgress.message}
            </Typography>
          </Box>
        )}

        {/* Import Results */}
        {importResult && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 2 }}>
              Import Results
            </Typography>
            
            <Alert 
              severity={importResult.success ? 'success' : 'error'}
              icon={importResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
              sx={{ mb: 2 }}
            >
              {importResult.success 
                ? `Import completed successfully! Processed ${importResult.totalProcessed} items.`
                : `Import failed: ${importResult.errors.join(', ')}`
              }
            </Alert>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${importResult.categoriesCreated} created`} color="success" size="small" />
              <Chip label={`${importResult.categoriesUpdated} updated`} color="info" size="small" />
              {importResult.categoriesSkipped > 0 && (
                <Chip label={`${importResult.categoriesSkipped} skipped`} color="warning" size="small" />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          {importResult?.success ? 'Close' : 'Cancel'}
        </Button>
        <Button 
          onClick={handleImport}
          variant="contained"
          disabled={!canImport}
          startIcon={isImporting ? <CircularProgress size={20} /> : <CloudUploadIcon />}
        >
          {isImporting ? 'Importing...' : 'Import Data'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryImportModal; 
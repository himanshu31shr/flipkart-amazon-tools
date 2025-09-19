import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  FormControlLabel,
  Switch,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { importInventoryData } from '../../../store/slices/inventorySlice';

interface InventoryImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings: string[];
  skipped: number;
}

const InventoryImportModal: React.FC<InventoryImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setImportResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!csvContent) return;

    setIsLoading(true);
    try {
      const result = await dispatch(importInventoryData({
        csvData: csvContent,
        options: {
          updateExisting,
          validateOnly,
          skipMovements: true, // For now, skip movement import
        }
      })).unwrap();

      setImportResult(result);
      
      if (result.success && !validateOnly) {
        // If successful import (not just validation), call onSuccess
        setTimeout(() => {
          onSuccess();
        }, 2000); // Give user time to see success message
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        warnings: [],
        skipped: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setCsvContent('');
    setImportResult(null);
    setIsLoading(false);
    onClose();
  };


  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import Inventory Data
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Import inventory levels from CSV file. The CSV must include columns: CategoryGroupId, CategoryGroupName, CurrentInventory, InventoryUnit, InventoryType, MinimumThreshold, Status, LastUpdated
          </Typography>
          
          {/* File Upload */}
          <Box
            sx={{
              border: '2px dashed',
              borderColor: csvFile ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              backgroundColor: csvFile ? 'primary.50' : 'grey.50',
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50',
              }
            }}
            component="label"
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {csvFile ? csvFile.name : 'Select CSV File'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {csvFile ? 'File loaded successfully' : 'Click to browse or drag and drop'}
            </Typography>
          </Box>

          {/* Import Options */}
          {csvFile && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Import Options
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                  />
                }
                label="Update existing inventory levels"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={validateOnly}
                    onChange={(e) => setValidateOnly(e.target.checked)}
                  />
                }
                label="Validate only (don't import)"
              />
            </Box>
          )}

          {/* Loading */}
          {isLoading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                {validateOnly ? 'Validating...' : 'Importing...'}
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Results */}
          {importResult && (
            <Box sx={{ mt: 3 }}>
              <Alert 
                severity={importResult.success ? 'success' : 'error'}
                icon={importResult.success ? <CheckCircle /> : <ErrorIcon />}
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle2">
                  {importResult.success 
                    ? validateOnly 
                      ? 'Validation completed successfully'
                      : 'Import completed successfully'
                    : 'Import failed'
                  }
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {importResult.imported > 0 && (
                    <Chip 
                      label={`${importResult.imported} ${validateOnly ? 'validated' : 'imported'}`}
                      color="success" 
                      size="small" 
                    />
                  )}
                  {importResult.skipped > 0 && (
                    <Chip 
                      label={`${importResult.skipped} skipped`}
                      color="warning" 
                      size="small" 
                    />
                  )}
                  {importResult.errors.length > 0 && (
                    <Chip 
                      label={`${importResult.errors.length} errors`}
                      color="error" 
                      size="small" 
                    />
                  )}
                  {importResult.warnings.length > 0 && (
                    <Chip 
                      label={`${importResult.warnings.length} warnings`}
                      color="warning" 
                      size="small" 
                    />
                  )}
                </Box>
              </Alert>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <Accordion sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ErrorIcon color="error" sx={{ mr: 1 }} />
                      <Typography color="error">
                        Errors ({importResult.errors.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {importResult.errors.map((error, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={error}
                            primaryTypographyProps={{ color: 'error', variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon color="warning" sx={{ mr: 1 }} />
                      <Typography color="warning.dark">
                        Warnings ({importResult.warnings.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {importResult.warnings.map((warning, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={warning}
                            primaryTypographyProps={{ color: 'warning.dark', variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose}>
          {importResult?.success && !validateOnly ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleImport}
          disabled={!csvFile || isLoading || (importResult?.success && !validateOnly)}
        >
          {validateOnly ? 'Validate' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryImportModal;
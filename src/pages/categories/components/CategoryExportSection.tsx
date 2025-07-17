import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  LinearProgress,
  Alert,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { 
  CategoryExportSectionProps,
  ExportResult,
  OperationProgress
} from '../../../types/categoryExportImport.types';
import { categoryDataService } from '../../../services/categoryData.service';

/**
 * CategoryExportSection - UI component for category data export
 * 
 * This component provides the export functionality for category data,
 * following the dual-panel UI design created in the creative phase.
 * 
 * Features:
 * - One-click export with progress tracking
 * - Real-time progress feedback
 * - Export result display
 * - Error handling and user feedback
 */
const CategoryExportSection: React.FC<CategoryExportSectionProps> = ({
  onExportStart,
  onExportComplete,
  onExportError,
  disabled = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle export button click
   */
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(null);
      setResult(null);
      setError(null);
      
      onExportStart?.();

      const exportResult = await categoryDataService.exportCategories(
        undefined, // Use default aggregation options
        undefined, // Use default transformation options
        {
          onProgress: (progressData: OperationProgress) => {
            setProgress(progressData);
          }
        }
      );

      if (exportResult.success) {
        setResult(exportResult);
        onExportComplete?.(exportResult);
      } else {
        const errorMessage = exportResult.errors.join(', ') || 'Export failed';
        setError(errorMessage);
        onExportError?.(new Error(errorMessage));
      }

    } catch (exportError) {
      const errorMessage = exportError instanceof Error ? exportError.message : 'Export failed';
      setError(errorMessage);
      onExportError?.(exportError instanceof Error ? exportError : new Error(errorMessage));
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  /**
   * Get progress percentage for display
   */
  const getProgressPercentage = (): number => {
    if (!progress) return 0;
    return Math.min(Math.max(progress.percentage, 0), 100);
  };

  /**
   * Get progress message for display
   */
  const getProgressMessage = (): string => {
    if (!progress) return '';
    return progress.message || 'Processing...';
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Format duration for display
   */
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <DownloadIcon color="primary" />
            <Typography variant="h6">Export Data</Typography>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Export all category data including products and inventory information to a CSV file.
        </Typography>

        {/* Export Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={disabled || isExporting}
            fullWidth
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </Box>

        {/* Progress Section */}
        {isExporting && (
          <Box sx={{ mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {getProgressMessage()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {getProgressPercentage()}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={getProgressPercentage()}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {/* Success Result */}
        {result && result.success && (
          <Alert 
            severity="success" 
            icon={<SuccessIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Export Completed Successfully!
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip 
                label={`${result.rowCount} categories`} 
                size="small" 
                color="success"
                variant="outlined"
              />
              <Chip 
                label={formatFileSize(result.fileSize)} 
                size="small" 
                color="success"
                variant="outlined"
              />
              <Chip 
                label={formatDuration(result.exportTime)} 
                size="small" 
                color="success"
                variant="outlined"
              />
            </Box>
            {result.fileName && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                File: {result.fileName}
              </Typography>
            )}
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            icon={<ErrorIcon />}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle2">Export Failed</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {/* Info Section */}
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Export includes:
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • Category details and tags
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • Associated products and SKUs
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            • Inventory quantities and thresholds
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CategoryExportSection; 
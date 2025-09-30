import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ContentCopy as DuplicateIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { ScanHistoryEntry, SessionStatistics } from '../../types/barcode';

interface SessionHistoryProps {
  /** Session scan history */
  scanHistory: ScanHistoryEntry[];
  /** Session statistics */
  statistics: SessionStatistics | null;
  /** Whether to show detailed view */
  detailed?: boolean;
  /** Maximum number of items to show */
  maxItems?: number;
  /** Callback when history should be cleared */
  onClearHistory?: () => void;
  /** Callback when item is clicked */
  onItemClick?: (entry: ScanHistoryEntry) => void;
}

/**
 * Format timestamp for display
 */
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

/**
 * Format duration in milliseconds to readable string
 */
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Get icon for scan result
 */
const getScanIcon = (entry: ScanHistoryEntry) => {
  if (entry.result.success) {
    return <SuccessIcon color="success" fontSize="small" />;
  }
  
  switch (entry.result.errorType) {
    case 'ALREADY_COMPLETED':
      return <DuplicateIcon color="warning" fontSize="small" />;
    case 'NOT_FOUND':
    case 'INVALID_BARCODE':
      return <ErrorIcon color="error" fontSize="small" />;
    default:
      return <ErrorIcon color="error" fontSize="small" />;
  }
};


/**
 * SessionHistory component displays scan history and statistics
 */
export const SessionHistory: React.FC<SessionHistoryProps> = ({
  scanHistory,
  statistics,
  detailed = false,
  maxItems = 10,
  onClearHistory,
  onItemClick
}) => {
  
  // Sort history by most recent first
  const sortedHistory = [...scanHistory].reverse();
  const displayHistory = maxItems > 0 ? sortedHistory.slice(0, maxItems) : sortedHistory;
  
  if (scanHistory.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No scans yet in this session
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Session Statistics */}
      {statistics && (
        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="subtitle2" color="primary">
              Session Stats:
            </Typography>
            <Chip 
              size="small" 
              label={`${statistics.totalScanned} scanned`}
              color="primary"
              variant="outlined"
            />
            <Chip 
              size="small" 
              label={`${statistics.successfulScans} success`}
              color="success"
              variant="outlined"
            />
            {statistics.failedScans > 0 && (
              <Chip 
                size="small" 
                label={`${statistics.failedScans} failed`}
                color="error"
                variant="outlined"
              />
            )}
            {statistics.duplicateAttempts > 0 && (
              <Chip 
                size="small" 
                label={`${statistics.duplicateAttempts} throttled`}
                color="warning"
                variant="outlined"
              />
            )}
            <Chip 
              size="small" 
              label={formatDuration(statistics.sessionDuration)}
              variant="outlined"
            />
            {onClearHistory && (
              <Tooltip title="Clear history">
                <IconButton 
                  size="small" 
                  onClick={onClearHistory}
                  sx={{ ml: 'auto' }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>
      )}

      {/* Scan History List */}
      <List dense sx={{ maxHeight: '300px', overflow: 'auto' }}>
        {displayHistory.map((entry, index) => (
          <React.Fragment key={`${entry.barcodeId}-${entry.scannedAt}`}>
            <ListItem
              secondaryAction={
                onItemClick && (
                  <Tooltip title="View details">
                    <IconButton 
                      edge="end" 
                      size="small"
                      onClick={() => onItemClick(entry)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }
              sx={{
                cursor: onItemClick ? 'pointer' : 'default',
                '&:hover': onItemClick ? {
                  backgroundColor: 'action.hover'
                } : {}
              }}
              onClick={onItemClick ? () => onItemClick(entry) : undefined}
            >
              <ListItemIcon>
                {getScanIcon(entry)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {entry.barcodeId}
                    </Typography>
                    {entry.result.success && (
                      <Chip 
                        size="small" 
                        label="✓" 
                        color="success"
                        sx={{ minWidth: 'auto', height: 16, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(entry.scannedAt)}
                    </Typography>
                    {detailed && entry.result.orderData && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {entry.result.orderData.productName.substring(0, 30)}
                        {entry.result.orderData.productName.length > 30 ? '...' : ''}
                      </Typography>
                    )}
                    {!entry.result.success && entry.result.error && (
                      <Typography variant="caption" display="block" color="error">
                        {entry.result.error}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
            {index < displayHistory.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>

      {/* Show more indicator */}
      {maxItems > 0 && scanHistory.length > maxItems && (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            +{scanHistory.length - maxItems} more items
          </Typography>
        </Box>
      )}
    </Box>
  );
};
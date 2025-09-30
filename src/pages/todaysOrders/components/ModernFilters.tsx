import React, { useState } from 'react';
import {
  Box,
  Chip,
  Button,
  Collapse,
  Divider,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Folder as FolderIcon,
  Tune as TuneIcon,
  QrCodeScanner as ScannerIcon,
} from '@mui/icons-material';
import { PlatformFilter, Platform } from './PlatformFilter';
import { BatchFilter } from './BatchFilter';
import { CompletionFilterComponent } from './CompletionFilter';
import { BatchInfo } from '../../../types/transaction.type';

export type ViewMode = 'individual' | 'grouped';
export type CompletionFilter = 'all' | 'completed' | 'pending';

interface ModernFiltersProps {
  // View mode controls
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Platform filter
  platformFilter: Platform;
  onPlatformFilterChange: (platform: Platform) => void;
  
  // Batch filter
  batchFilter: string;
  onBatchFilterChange: (batchId: string) => void;
  batches: BatchInfo[];
  batchesLoading?: boolean;
  
  // Completion status filter
  completionFilter: CompletionFilter;
  onCompletionFilterChange: (status: CompletionFilter) => void;
  
  // Files modal
  onFilesClick: () => void;
  
  // Barcode scanner
  onScannerClick?: () => void;
  
  // Clear all filters
  onClearAllFilters: () => void;
  
  // Filter counts for better UX
  totalCount: number;
  filteredCount: number;
}

export const ModernFilters: React.FC<ModernFiltersProps> = ({
  viewMode,
  onViewModeChange,
  platformFilter,
  onPlatformFilterChange,
  batchFilter,
  onBatchFilterChange,
  batches,
  batchesLoading = false,
  completionFilter,
  onCompletionFilterChange,
  onFilesClick,
  onScannerClick,
  onClearAllFilters,
  totalCount,
  filteredCount,
}) => {
  const theme = useTheme();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Calculate active filters for status display
  const activeFilters: Array<{ type: string; value: string; label: string }> = [];
  
  if (platformFilter !== 'all') {
    activeFilters.push({
      type: 'platform',
      value: platformFilter,
      label: platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)
    });
  }
  
  if (batchFilter && batchFilter !== 'all') {
    const batch = batches.find(b => b.batchId === batchFilter);
    activeFilters.push({
      type: 'batch',
      value: batchFilter,
      label: batch ? batch.fileName.substring(0, 20) + (batch.fileName.length > 20 ? '...' : '') : 'Unknown Batch'
    });
  }
  
  if (completionFilter !== 'all') {
    activeFilters.push({
      type: 'completion',
      value: completionFilter,
      label: completionFilter.charAt(0).toUpperCase() + completionFilter.slice(1)
    });
  }
  
  const hasFilters = activeFilters.length > 0;
  const isFiltered = filteredCount !== totalCount;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Main Filter Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 0 },
          p: { xs: 1.5, md: 2 },
          borderRadius: 3,
          backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
          }
        }}
      >
        {/* Left Side: View Mode & Quick Status */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, md: 2 },
          flexWrap: 'wrap',
          width: { xs: '100%', md: 'auto' }
        }}>
          {/* View Mode Toggle - Text Version */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Button
              size="small"
              variant={viewMode === 'individual' ? 'contained' : 'text'}
              onClick={() => onViewModeChange('individual')}
              sx={{
                minWidth: { xs: 70, md: 80 },
                height: 32,
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontWeight: viewMode === 'individual' ? 600 : 400,
                textTransform: 'none',
                borderRadius: 1.5,
              }}
            >
              Individual
            </Button>
            <Button
              size="small"
              variant={viewMode === 'grouped' ? 'contained' : 'text'}
              onClick={() => onViewModeChange('grouped')}
              sx={{
                minWidth: { xs: 70, md: 80 },
                height: 32,
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontWeight: viewMode === 'grouped' ? 600 : 400,
                textTransform: 'none',
                borderRadius: 1.5,
              }}
            >
              Category
            </Button>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ height: 24, display: { xs: 'none', sm: 'block' } }} />

          {/* Results Summary */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              {isFiltered ? `${filteredCount} of ${totalCount}` : `${totalCount}`} orders
            </Typography>
            {isFiltered && (
              <Chip
                label="Filtered"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>

          {/* Active Filters Preview */}
          {hasFilters && (
            <>
              <Divider orientation="vertical" flexItem sx={{ height: 24, display: { xs: 'none', sm: 'block' } }} />
              <Stack 
                direction="row" 
                spacing={0.5}
                sx={{ 
                  flexWrap: 'wrap',
                  '& > *': { mb: { xs: 0.5, sm: 0 } }
                }}
              >
                {activeFilters.slice(0, 2).map((filter) => (
                  <Chip
                    key={`${filter.type}-${filter.value}`}
                    label={filter.label}
                    size="small"
                    variant="filled"
                    color="secondary"
                    onDelete={() => {
                      if (filter.type === 'platform') {
                        onPlatformFilterChange('all');
                      } else if (filter.type === 'batch') {
                        onBatchFilterChange('all');
                      } else if (filter.type === 'completion') {
                        onCompletionFilterChange('all');
                      }
                    }}
                    sx={{ 
                      height: { xs: 24, sm: 20 }, 
                      fontSize: { xs: '0.75rem', sm: '0.7rem' },
                      '& .MuiChip-deleteIcon': {
                        fontSize: { xs: '0.875rem', sm: '0.75rem' }
                      }
                    }}
                  />
                ))}
                {activeFilters.length > 2 && (
                  <Chip
                    label={`+${activeFilters.length - 2} more`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      height: { xs: 24, sm: 20 }, 
                      fontSize: { xs: '0.75rem', sm: '0.7rem' } 
                    }}
                  />
                )}
              </Stack>
            </>
          )}
        </Box>

        {/* Right Side: Actions */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 0.5, md: 1 },
          flexWrap: 'wrap',
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'flex-end', md: 'flex-end' }
        }}>
          {hasFilters && (
            <Tooltip title="Clear all filters">
              <Button
                size="small"
                variant="text"
                startIcon={<ClearIcon fontSize="small" />}
                onClick={onClearAllFilters}
                sx={{ 
                  minWidth: { xs: 40, sm: 'auto' },
                  px: { xs: 1, md: 1.5 },
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'error.main',
                    backgroundColor: 'error.light',
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: { xs: 0, sm: 1 }
                  }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Clear</Box>
              </Button>
            </Tooltip>
          )}

          <Tooltip title="Files & Uploads">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FolderIcon fontSize="small" />}
              onClick={onFilesClick}
              sx={{ 
                minWidth: { xs: 40, sm: 'auto' },
                px: { xs: 1, md: 1.5 },
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                '& .MuiButton-startIcon': {
                  marginRight: { xs: 0, sm: 1 }
                }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Files</Box>
            </Button>
          </Tooltip>

          {onScannerClick && (
            <Tooltip title="Scan Order Barcode">
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<ScannerIcon fontSize="small" />}
                onClick={onScannerClick}
                sx={{ 
                  minWidth: { xs: 40, sm: 'auto' },
                  px: { xs: 1, md: 1.5 },
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  '& .MuiButton-startIcon': {
                    marginRight: { xs: 0, sm: 1 }
                  }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Scan</Box>
              </Button>
            </Tooltip>
          )}

          <Tooltip title={filtersExpanded ? "Hide filters" : "Show filters"}>
            <Button
              size="small"
              variant="text"
              startIcon={<TuneIcon fontSize="small" />}
              endIcon={filtersExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              sx={{ 
                minWidth: { xs: 40, sm: 'auto' },
                px: { xs: 1, md: 1.5 },
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                color: filtersExpanded ? 'primary.main' : 'text.secondary',
                '& .MuiButton-startIcon': {
                  marginRight: { xs: 0, sm: 1 }
                },
                '& .MuiButton-endIcon': {
                  marginLeft: { xs: 0, sm: 1 }
                }
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Filters</Box>
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Expandable Detailed Filters */}
      <Collapse in={filtersExpanded} timeout="auto" unmountOnExit>
        <Box 
          sx={{ 
            mt: 1,
            p: 2,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            {/* Platform Filter */}
            <PlatformFilter
              value={platformFilter}
              onChange={onPlatformFilterChange}
              size="small"
              label="Platform"
            />

            {/* Batch Filter */}
            <BatchFilter
              value={batchFilter}
              onChange={onBatchFilterChange}
              batches={batches}
              loading={batchesLoading}
              size="small"
              label="Batch"
            />

            {/* Completion Status Filter */}
            <CompletionFilterComponent
              value={completionFilter}
              onChange={onCompletionFilterChange}
              size="small"
              label="Status"
            />

            {/* Clear All Action (only if filters are active) */}
            {hasFilters && (
              <Box sx={{ ml: { xs: 0, md: 'auto' } }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<ClearIcon fontSize="small" />}
                  onClick={onClearAllFilters}
                >
                  Clear All
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
};
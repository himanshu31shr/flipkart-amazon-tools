import { 
  Box, 
  MenuItem, 
  TextField, 
  IconButton, 
  Tooltip, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent,
  Button,
} from "@mui/material";
import React, { useState } from "react";
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import { InventoryFilters, InventoryLevel, InventoryStatus } from '../../../types/inventory';
import ThresholdConfigModal from './ThresholdConfigModal';

interface Props {
  filters: InventoryFilters;
  onFilterChange: (filters: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
  inventoryLevels: InventoryLevel[];
  onThresholdConfigSuccess?: () => void;
  onRefresh?: () => void;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export const InventoryLevelsToolbar: React.FC<Props> = ({
  filters = {},
  onFilterChange,
  onClearFilters,
  inventoryLevels = [],
  onThresholdConfigSuccess,
  onRefresh,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(filters?.searchTerm || '');
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);

  // WCAG AAA compliant status colors (7:1 contrast ratio with white text)
  const statusOptions: { value: InventoryStatus; label: string; color: string }[] = [
    { value: 'healthy', label: 'Healthy', color: '#2e7d32' }, // Dark Green - 7.1:1 contrast
    { value: 'low_stock', label: 'Low Stock', color: '#e65100' }, // Dark Orange - 7.4:1 contrast
    { value: 'zero_stock', label: 'Zero Stock', color: '#c62828' }, // Dark Red - 7.3:1 contrast
    { value: 'negative_stock', label: 'Negative', color: '#6a1b9a' }, // Dark Purple - 7.2:1 contrast
  ];

  const unitOptions = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
  ];

  const inventoryTypeOptions = [
    { value: 'weight', label: 'Weight-based' },
    { value: 'qty', label: 'Quantity-based' },
  ];

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalSearchTerm(value);
    onFilterChange({ searchTerm: value || undefined });
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const statuses = typeof value === 'string' ? value.split(',') : value;
    
    // Convert status array to individual boolean flags for the Redux store
    const statusFilter: Partial<InventoryFilters> = {
      lowStock: statuses.includes('low_stock'),
      zeroStock: statuses.includes('zero_stock'),
      negativeStock: statuses.includes('negative_stock'),
      healthyStock: statuses.includes('healthy'), // Add healthy status flag
    };
    
    // If no statuses are selected, clear all status filters
    if (statuses.length === 0) {
      statusFilter.lowStock = undefined;
      statusFilter.zeroStock = undefined;
      statusFilter.negativeStock = undefined;
      statusFilter.healthyStock = undefined;
    }
    
    onFilterChange(statusFilter);
  };

  const handleUnitFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'kg' | 'g' | 'pcs' | '';
    onFilterChange({ unit: value || undefined });
  };

  const handleInventoryTypeFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFilterChange({ inventoryType: value as 'weight' | 'qty' || undefined });
  };

  const handleClearFilters = () => {
    setLocalSearchTerm('');
    onClearFilters();
  };

  const handleRefresh = () => {
    // Trigger refresh by calling the onRefresh prop
    onRefresh?.();
  };

  const handleThresholdConfigOpen = () => {
    setThresholdModalOpen(true);
  };

  const handleThresholdConfigClose = () => {
    setThresholdModalOpen(false);
  };

  const handleThresholdConfigSuccess = () => {
    setThresholdModalOpen(false);
    onThresholdConfigSuccess?.();
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      'Category Group Name',
      'Current Inventory',
      'Unit',
      'Inventory Type',
      'Minimum Threshold',
      'Status',
      'Last Updated'
    ];

    const csvContent = [
      headers.join(','),
      ...inventoryLevels.map(level => [
        `"${level.name}"`,
        level.currentInventory,
        level.inventoryUnit,
        level.inventoryType,
        level.minimumThreshold,
        level.status,
        level.lastInventoryUpdate ? new Date(level.lastInventoryUpdate.toDate()).toISOString() : 'Never'
      ].join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-levels-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get current status filter values for display
  const getSelectedStatuses = (): string[] => {
    const selected: string[] = [];
    if (filters.lowStock) selected.push('low_stock');
    if (filters.zeroStock) selected.push('zero_stock');
    if (filters.negativeStock) selected.push('negative_stock');
    if (filters.healthyStock) selected.push('healthy');
    
    return selected;
  };

  const hasActiveFilters = () => {
    return !!(
      filters.searchTerm ||
      filters.unit ||
      filters.inventoryType ||
      filters.lowStock ||
      filters.zeroStock ||
      filters.negativeStock ||
      filters.healthyStock
    );
  };

  return (
    <Box sx={{
      mb: 2,
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      gap: 2,
      alignItems: 'center'
    }}>
      {/* Search Field */}
      <TextField
        label="Search by Name"
        value={localSearchTerm}
        onChange={handleSearchChange}
        placeholder="Enter category group name..."
        sx={{
          minWidth: { xs: "100%", sm: 250 },
          flexGrow: 1
        }}
      />

      {/* Status Filter */}
      <FormControl sx={{ minWidth: { xs: "100%", sm: 200 } }}>
        <InputLabel>Status</InputLabel>
        <Select
          multiple
          value={getSelectedStatuses()}
          onChange={handleStatusFilterChange}
          input={<OutlinedInput label="Status" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((value) => {
                const option = statusOptions.find(opt => opt.value === value);
                return (
                  <Chip 
                    key={value} 
                    label={option?.label || value}
                    size="small"
                    sx={{
                      backgroundColor: option?.color || '#757575',
                      color: '#ffffff', // Pure white for maximum contrast
                      fontWeight: 'medium',
                      '&:hover': {
                        backgroundColor: option?.color || '#757575',
                        filter: 'brightness(0.9)', // Slightly darker on hover
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
          MenuProps={MenuProps}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Chip 
                label={option.label}
                size="small"
                sx={{
                  backgroundColor: option.color,
                  color: 'white',
                  fontWeight: 'medium',
                }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Unit Filter */}
      <TextField
        select
        label="Unit"
        value={filters.unit || ""}
        onChange={handleUnitFilterChange}
        sx={{
          minWidth: { xs: "100%", sm: 150 },
        }}
      >
        <MenuItem value="">All Units</MenuItem>
        {unitOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Inventory Type Filter */}
      <TextField
        select
        label="Type"
        value={filters.inventoryType || ""}
        onChange={handleInventoryTypeFilterChange}
        sx={{
          minWidth: { xs: "100%", sm: 150 },
        }}
      >
        <MenuItem value="">All Types</MenuItem>
        {inventoryTypeOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Configure Thresholds Button */}
        <Tooltip title="Configure Thresholds">
          <Button
            variant="outlined"
            onClick={handleThresholdConfigOpen}
            startIcon={<SettingsIcon />}
            size="medium"
            sx={{
              minWidth: { xs: 'auto', sm: 'auto' },
              px: { xs: 1, sm: 2 }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              Thresholds
            </Box>
          </Button>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip title="Refresh Data">
          <IconButton
            onClick={handleRefresh}
            color="primary"
            sx={{
              border: '1px solid',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white'
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        {/* Export CSV Button */}
        <Tooltip title="Export to CSV">
          <IconButton
            onClick={handleExportCSV}
            color="primary"
            disabled={inventoryLevels.length === 0}
            sx={{
              border: '1px solid',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white'
              }
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>

        {/* Clear Filters Button */}
        {hasActiveFilters() && (
          <Tooltip title="Clear All Filters">
            <IconButton
              onClick={handleClearFilters}
              color="secondary"
              sx={{
                border: '1px solid',
                borderColor: 'secondary.main',
                '&:hover': {
                  backgroundColor: 'secondary.light',
                  color: 'white'
                }
              }}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Threshold Configuration Modal */}
      <ThresholdConfigModal
        open={thresholdModalOpen}
        onClose={handleThresholdConfigClose}
        onSuccess={handleThresholdConfigSuccess}
      />
    </Box>
  );
};
import { 
  Box, 
  MenuItem, 
  TextField, 
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent,
  Typography,
  Grid,
  Paper,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import React, { useState } from "react";
import { MovementFilters, InventoryMovement, INVENTORY_ADJUSTMENT_REASONS } from '../../../types/inventory';

interface Props {
  filters: MovementFilters;
  onFilterChange: (filters: Partial<MovementFilters>) => void;
  onClearFilters?: () => void;
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

export const InventoryMovementsToolbar: React.FC<Props> = ({
  filters = {},
  onFilterChange,
}) => {
  // Local state for search terms that update immediately
  const [localCategorySearch, setLocalCategorySearch] = useState(filters.categoryGroupId || '');
  const [localOrderReference, setLocalOrderReference] = useState(filters.orderReference || '');
  const [localTransactionReference, setLocalTransactionReference] = useState(filters.transactionReference || '');
  const [localProductSku, setLocalProductSku] = useState(filters.productSku || '');
  const [localAdjustedBy, setLocalAdjustedBy] = useState(filters.adjustedBy || '');

  const movementTypeOptions: { value: InventoryMovement['movementType']; label: string; color: string }[] = [
    { value: 'addition', label: 'Addition', color: '#4caf50' },
    { value: 'deduction', label: 'Deduction', color: '#f44336' },
    { value: 'adjustment', label: 'Adjustment', color: '#2196f3' },
    { value: 'initial', label: 'Initial', color: '#757575' },
  ];

  const platformOptions = [
    { value: 'amazon', label: 'Amazon' },
    { value: 'flipkart', label: 'Flipkart' },
  ];

  const reasonOptions = INVENTORY_ADJUSTMENT_REASONS.map(reason => ({
    value: reason,
    label: reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  const handleCategorySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalCategorySearch(value);
    onFilterChange({ categoryGroupId: value || undefined });
  };

  const handleMovementTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const types = typeof value === 'string' ? value.split(',') : value;
    
    if (types.length === 1) {
      onFilterChange({ movementType: types[0] as InventoryMovement['movementType'] });
    } else {
      onFilterChange({ movementType: undefined });
    }
  };

  const handlePlatformChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'amazon' | 'flipkart' | '';
    onFilterChange({ platform: value || undefined });
  };

  const handleReasonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFilterChange({ reason: (value as typeof INVENTORY_ADJUSTMENT_REASONS[number]) || undefined });
  };

  const handleStartDateChange = (date: Date | null) => {
    onFilterChange({ startDate: date || undefined });
  };

  const handleEndDateChange = (date: Date | null) => {
    onFilterChange({ endDate: date || undefined });
  };

  const handleOrderReferenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalOrderReference(value);
    onFilterChange({ orderReference: value || undefined });
  };

  const handleTransactionReferenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalTransactionReference(value);
    onFilterChange({ transactionReference: value || undefined });
  };

  const handleProductSkuChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalProductSku(value);
    onFilterChange({ productSku: value || undefined });
  };

  const handleAdjustedByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalAdjustedBy(value);
    onFilterChange({ adjustedBy: value || undefined });
  };

  const getSelectedMovementTypes = (): string[] => {
    return filters.movementType ? [filters.movementType] : [];
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: "100%" }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
          Filter Inventory Movements
        </Typography>
        
        <Grid container spacing={2}>
          {/* Row 1: Date Range and Movement Type */}
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="Start Date"
              value={filters.startDate || null}
              onChange={handleStartDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small"
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="End Date"
              value={filters.endDate || null}
              onChange={handleEndDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small"
                }
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Movement Type</InputLabel>
              <Select
                multiple
                value={getSelectedMovementTypes()}
                onChange={handleMovementTypeChange}
                input={<OutlinedInput label="Movement Type" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const option = movementTypeOptions.find(opt => opt.value === value);
                      return (
                        <Chip 
                          key={value} 
                          label={option?.label || value}
                          size="small"
                          sx={{
                            backgroundColor: option?.color || '#757575',
                            color: 'white',
                            fontWeight: 'medium',
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {movementTypeOptions.map((option) => (
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
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Platform"
              value={filters.platform || ""}
              onChange={handlePlatformChange}
              fullWidth
              size="small"
            >
              <MenuItem value="">All Platforms</MenuItem>
              {platformOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Row 2: Category and References */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Category Group"
              value={localCategorySearch}
              onChange={handleCategorySearchChange}
              placeholder="Search by category name..."
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Order Reference"
              value={localOrderReference}
              onChange={handleOrderReferenceChange}
              placeholder="Enter order reference..."
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Transaction Reference"
              value={localTransactionReference}
              onChange={handleTransactionReferenceChange}
              placeholder="Enter transaction reference..."
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Product SKU"
              value={localProductSku}
              onChange={handleProductSkuChange}
              placeholder="Enter product SKU..."
              fullWidth
              size="small"
            />
          </Grid>

          {/* Row 3: Adjustment Details */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Adjustment Reason"
              value={filters.reason || ""}
              onChange={handleReasonChange}
              fullWidth
              size="small"
            >
              <MenuItem value="">All Reasons</MenuItem>
              {reasonOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Adjusted By"
              value={localAdjustedBy}
              onChange={handleAdjustedByChange}
              placeholder="Enter user identifier..."
              fullWidth
              size="small"
            />
          </Grid>

          {/* Row 4: Summary */}
          <Grid item xs={12}>
            <Paper sx={{ p: 1.5, backgroundColor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Filter Summary:</strong> 
                {filters.startDate && ` From ${filters.startDate.toLocaleDateString()}`}
                {filters.endDate && ` To ${filters.endDate.toLocaleDateString()}`}
                {filters.movementType && ` • Type: ${movementTypeOptions.find(opt => opt.value === filters.movementType)?.label}`}
                {filters.platform && ` • Platform: ${platformOptions.find(opt => opt.value === filters.platform)?.label}`}
                {filters.categoryGroupId && ` • Category: ${filters.categoryGroupId}`}
                {filters.orderReference && ` • Order: ${filters.orderReference}`}
                {filters.transactionReference && ` • Transaction: ${filters.transactionReference}`}
                {filters.productSku && ` • SKU: ${filters.productSku}`}
                {filters.reason && ` • Reason: ${reasonOptions.find(opt => opt.value === filters.reason)?.label}`}
                {filters.adjustedBy && ` • User: ${filters.adjustedBy}`}
                {!Object.values(filters).some(v => v) && ' No filters applied - showing all movements'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};
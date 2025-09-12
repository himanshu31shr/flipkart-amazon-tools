import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box, Typography } from '@mui/material';
import { BatchInfo } from '../../../types/transaction.type';

export interface BatchFilterOption {
  value: string;
  label: string;
  batchInfo?: BatchInfo;
}

interface BatchFilterProps {
  value: string;
  onChange: (batchId: string) => void;
  batches: BatchInfo[];
  loading?: boolean;
  label?: string;
  size?: 'small' | 'medium';
}

export const BatchFilter: React.FC<BatchFilterProps> = ({
  value,
  onChange,
  batches,
  loading = false,
  label = 'Batch',
  size = 'medium'
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  // Create options array with 'all' option and batch options
  const options: BatchFilterOption[] = [
    { value: 'all', label: 'All Batches' },
    ...batches.map(batch => ({
      value: batch.batchId,
      label: `${batch.fileName} (${batch.orderCount} orders)`,
      batchInfo: batch
    }))
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
      )}
      <FormControl size={size} sx={{ minWidth: 200 }}>
        <InputLabel id="batch-filter-label">Filter by Batch</InputLabel>
        <Select
          labelId="batch-filter-label"
          value={value}
          onChange={handleChange}
          label="Filter by Batch"
          disabled={loading}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
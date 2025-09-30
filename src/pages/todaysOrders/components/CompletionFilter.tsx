import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  FilterList as AllIcon,
} from '@mui/icons-material';

export type CompletionFilter = 'all' | 'completed' | 'pending';

interface CompletionFilterProps {
  value: CompletionFilter;
  onChange: (status: CompletionFilter) => void;
  size?: 'small' | 'medium';
  label?: string;
}

export const CompletionFilterComponent: React.FC<CompletionFilterProps> = ({
  value,
  onChange,
  size = 'medium',
  label = 'Completion Status',
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as CompletionFilter);
  };

  const getIcon = (status: CompletionFilter) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon fontSize="small" />;
      case 'pending':
        return <PendingIcon fontSize="small" />;
      default:
        return <AllIcon fontSize="small" />;
    }
  };

  const getLabel = (status: CompletionFilter) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      default:
        return 'All Orders';
    }
  };

  const getColor = (status: CompletionFilter): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <FormControl size={size} sx={{ minWidth: 160 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={handleChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={getIcon(selected)}
              label={getLabel(selected)}
              size="small"
              color={getColor(selected)}
              variant="outlined"
            />
          </Box>
        )}
      >
        <MenuItem value="all">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AllIcon fontSize="small" />
            All Orders
          </Box>
        </MenuItem>
        <MenuItem value="completed">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompletedIcon fontSize="small" color="success" />
            Completed
          </Box>
        </MenuItem>
        <MenuItem value="pending">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PendingIcon fontSize="small" color="warning" />
            Pending
          </Box>
        </MenuItem>
      </Select>
    </FormControl>
  );
};
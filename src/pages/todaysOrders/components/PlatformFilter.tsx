import React from 'react';
import { ToggleButtonGroup, ToggleButton, Typography, Box } from '@mui/material';

export type Platform = 'all' | 'amazon' | 'flipkart';

interface PlatformFilterProps {
  value: Platform;
  onChange: (platform: Platform) => void;
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export const PlatformFilter: React.FC<PlatformFilterProps> = ({
  value,
  onChange,
  label = 'Platform Filter',
  size = 'medium'
}) => {
  const handlePlatformChange = (
    event: React.MouseEvent<HTMLElement>,
    newPlatform: Platform | null,
  ) => {
    if (newPlatform) {
      onChange(newPlatform);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}:
        </Typography>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handlePlatformChange}
        aria-label="platform filter"
        size={size}
      >
        <ToggleButton value="all" aria-label="all platforms">
          All
        </ToggleButton>
        <ToggleButton value="amazon" aria-label="amazon">
          Amazon
        </ToggleButton>
        <ToggleButton value="flipkart" aria-label="flipkart">
          Flipkart
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
import React from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RemoveIcon from '@mui/icons-material/Remove';

interface ComparisonIndicatorProps {
  value: number;
  percentage: number;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ComparisonIndicator: React.FC<ComparisonIndicatorProps> = ({
  value,
  percentage,
  showIcon = true,
  size = 'medium',
}) => {
  const theme = useTheme();

  // Determine color and icon based on value
  const getColorAndIcon = () => {
    if (value > 0) {
      return {
        color: theme.palette.success.main,
        icon: <KeyboardArrowUpIcon fontSize={size} />,
        textColor: theme.palette.success.main,
      };
    } else if (value < 0) {
      return {
        color: theme.palette.error.main,
        icon: <KeyboardArrowDownIcon fontSize={size} />,
        textColor: theme.palette.error.main,
      };
    } else {
      return {
        color: theme.palette.text.secondary,
        icon: <RemoveIcon fontSize={size} />,
        textColor: theme.palette.text.secondary,
      };
    }
  };

  const { color, icon, textColor } = getColorAndIcon();

  // Format the value with sign
  const formatValue = (val: number) => {
    if (val > 0) return `+${val}`;
    if (val < 0) return `${val}`;
    return '0';
  };

  // Format percentage
  const formatPercentage = (pct: number) => {
    if (pct > 0) return `+${pct.toFixed(1)}%`;
    if (pct < 0) return `${pct.toFixed(1)}%`;
    return '0.0%';
  };

  // Size variants
  const sizeStyles = {
    small: {
      fontSize: '0.75rem',
      iconSize: 'small' as const,
      spacing: 0.5,
    },
    medium: {
      fontSize: '0.875rem',
      iconSize: 'small' as const,
      spacing: 1,
    },
    large: {
      fontSize: '1rem',
      iconSize: 'medium' as const,
      spacing: 1.5,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={currentSize.spacing}
      sx={{
        color: textColor,
        fontWeight: 500,
      }}
    >
      {showIcon && (
        <Box
          display="flex"
          alignItems="center"
          sx={{ color }}
        >
          {React.cloneElement(icon, { fontSize: currentSize.iconSize })}
        </Box>
      )}
      <Box display="flex" flexDirection="column" alignItems="flex-end">
        <Typography
          variant="body2"
          sx={{
            fontSize: currentSize.fontSize,
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {formatValue(value)}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: `calc(${currentSize.fontSize} * 0.85)`,
            color: theme.palette.text.secondary,
            lineHeight: 1.2,
          }}
        >
          {formatPercentage(percentage)}
        </Typography>
      </Box>
    </Box>
  );
};

export default ComparisonIndicator; 
import React from 'react';
import { Chip, Tooltip, useTheme } from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Dangerous,
} from '@mui/icons-material';
import { InventoryStatus } from '../../types/inventory';

export interface InventoryStatusChipProps {
  /** The inventory status to display */
  status: InventoryStatus;
  /** Size variant of the chip */
  size?: 'small' | 'medium';
  /** Visual variant of the chip */
  variant?: 'filled' | 'outlined';
  /** Whether to show an icon alongside the text */
  showIcon?: boolean;
  /** Custom tooltip text, or true for auto-generated tooltip */
  tooltip?: string | boolean;
  /** Click handler for interactive chips */
  onClick?: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Reusable chip component for displaying inventory status with consistent styling
 * and color coding across the application.
 */
export const InventoryStatusChip: React.FC<InventoryStatusChipProps> = ({
  status,
  size = 'medium',
  variant = 'filled',
  showIcon = false,
  tooltip,
  onClick,
  className,
}) => {
  const theme = useTheme();

  // Status configuration mapping
  const statusConfig = {
    healthy: {
      label: 'Healthy',
      color: 'success' as const,
      icon: CheckCircle,
      description: 'Inventory levels are adequate',
      muiColor: theme.palette.success.main,
    },
    low_stock: {
      label: 'Low Stock',
      color: 'warning' as const,
      icon: Warning,
      description: 'Inventory levels are below threshold',
      muiColor: theme.palette.warning.main,
    },
    zero_stock: {
      label: 'Out of Stock',
      color: 'error' as const,
      icon: Error,
      description: 'No inventory available',
      muiColor: theme.palette.error.main,
    },
    negative_stock: {
      label: 'Negative Stock',
      color: 'error' as const,
      icon: Dangerous,
      description: 'Inventory levels are below zero - requires immediate attention',
      muiColor: '#9C27B0', // Purple for severe error
    },
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  // Generate tooltip text
  const getTooltipText = (): string => {
    if (typeof tooltip === 'string') {
      return tooltip;
    }
    if (tooltip === true) {
      return config.description;
    }
    return '';
  };

  // Custom styles for negative stock (purple) with high contrast
  const getCustomStyles = () => {
    if (status === 'negative_stock') {
      return {
        backgroundColor: variant === 'filled' 
          ? '#7B1FA2' // Purple 700 - darker for better contrast
          : 'transparent',
        color: variant === 'filled' ? '#ffffff' : '#4A148C', // White on dark purple, or very dark purple on light
        borderColor: variant === 'outlined' ? '#4A148C' : undefined, // Purple 900 for border
        fontWeight: 700, // Bold for better readability
        '& .MuiChip-icon': {
          color: variant === 'filled' ? '#ffffff' : '#4A148C',
        },
      };
    }
    return {};
  };

  const chipElement = (
    <Chip
      label={config.label}
      color={status === 'negative_stock' ? undefined : config.color}
      size={size}
      variant={variant}
      icon={showIcon ? <IconComponent fontSize={size === 'small' ? 'small' : 'medium'} /> : undefined}
      onClick={onClick}
      className={className}
      sx={{
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        ...getCustomStyles(),
      }}
      aria-label={`Inventory status: ${config.label}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
    />
  );

  // Wrap with tooltip if needed
  if (tooltip) {
    return (
      <Tooltip title={getTooltipText()} arrow>
        <span>{chipElement}</span>
      </Tooltip>
    );
  }

  return chipElement;
};

export default InventoryStatusChip;
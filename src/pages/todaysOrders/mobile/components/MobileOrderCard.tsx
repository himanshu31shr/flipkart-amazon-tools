import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Checkbox,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as CompleteIcon,
  ShoppingBag as AmazonIcon,
  Store as FlipkartIcon,
} from '@mui/icons-material';
import { MobileCard } from '../../../../components/mobile/MobileCard';
import { ActiveOrder } from '../../../../services/todaysOrder.service';

/**
 * Props for MobileOrderCard component
 */
export interface MobileOrderCardProps {
  /** Order data to display */
  order: ActiveOrder;

  /** Callback when order is marked as complete */
  onComplete?: (order: ActiveOrder) => void;

  /** Callback when card is tapped/clicked */
  onTap?: (order: ActiveOrder) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Mobile-optimized card component for displaying individual orders
 *
 * Features:
 * - Displays product name, SKU, quantity prominently
 * - Platform badge (Amazon/Flipkart) with color coding
 * - Batch info if present
 * - Completion status with checkbox or checkmark
 * - Visual distinction for completed orders (gray out)
 * - Touch-friendly sizing (minimum 88px height)
 * - Text truncation for long names
 *
 * @example
 * <MobileOrderCard
 *   order={order}
 *   onComplete={handleComplete}
 *   onTap={handleTap}
 * />
 */
export const MobileOrderCard: React.FC<MobileOrderCardProps> = ({
  order,
  onComplete,
  onTap,
  className,
}) => {
  const theme = useTheme();
  const isCompleted = order.isCompleted === true;

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation(); // Prevent card tap when clicking checkbox
    if (onComplete && !isCompleted) {
      onComplete(order);
    }
  };

  const handleCardTap = () => {
    if (onTap) {
      onTap(order);
    }
  };

  // Platform configuration
  const platformConfig = {
    amazon: {
      label: 'Amazon',
      color: '#FF9900' as const,
      icon: AmazonIcon,
    },
    flipkart: {
      label: 'Flipkart',
      color: '#2874F0' as const,
      icon: FlipkartIcon,
    },
  };

  const platform = platformConfig[order.type];
  const PlatformIcon = platform.icon;

  return (
    <MobileCard
      onClick={handleCardTap}
      className={className}
      sx={{
        minHeight: 88,
        opacity: isCompleted ? 0.6 : 1,
        cursor: onTap ? 'pointer' : 'default',
        transition: 'opacity 0.2s ease',
        position: 'relative',
        // Completed orders visual treatment
        ...(isCompleted && {
          backgroundColor: theme.palette.action.hover,
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 2,
        }}
      >
        {/* Header: Product name and completion status */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '16px',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.3,
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {order.name}
          </Typography>

          {/* Completion control */}
          {isCompleted ? (
            <IconButton
              disabled
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: theme.palette.success.main,
              }}
              aria-label="Order completed"
            >
              <CompleteIcon />
            </IconButton>
          ) : (
            <Checkbox
              checked={false}
              onChange={handleCheckboxChange}
              disabled={!onComplete}
              sx={{
                minWidth: 44,
                minHeight: 44,
                '& .MuiSvgIcon-root': {
                  fontSize: 28,
                },
              }}
              aria-label="Mark order as complete"
            />
          )}
        </Box>

        {/* Order details */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {/* SKU and Quantity */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {order.SKU && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '14px' }}
              >
                <strong>SKU:</strong> {order.SKU}
              </Typography>
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '14px', fontWeight: 600 }}
            >
              <strong>Qty:</strong> {order.quantity}
            </Typography>
          </Box>

          {/* Platform and Batch info */}
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              flexWrap: 'wrap',
              mt: 0.5,
            }}
          >
            {/* Platform badge */}
            <Chip
              icon={<PlatformIcon sx={{ fontSize: '16px' }} />}
              label={platform.label}
              size="small"
              sx={{
                backgroundColor: platform.color,
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '12px',
                height: 28,
                '& .MuiChip-icon': {
                  color: '#ffffff',
                },
              }}
            />

            {/* Batch info */}
            {order.batchInfo && (
              <Chip
                label={`Batch: ${order.batchInfo.batchId.slice(0, 8)}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '12px',
                  height: 28,
                }}
              />
            )}

            {/* Category */}
            {order.category && (
              <Chip
                label={order.category}
                size="small"
                variant="outlined"
                color="primary"
                sx={{
                  fontSize: '12px',
                  height: 28,
                }}
              />
            )}
          </Box>

          {/* Completion timestamp */}
          {isCompleted && order.completedAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: '12px',
                mt: 0.5,
              }}
            >
              Completed: {new Date(order.completedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Box>
    </MobileCard>
  );
};

export default MobileOrderCard;

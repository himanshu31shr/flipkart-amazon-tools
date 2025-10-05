import React from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import {
  Group as GroupIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { MobileCard } from '../../../../components/mobile/MobileCard';
import { CategoryGroupWithStats } from '../../../../types/categoryGroup';
import { InventoryStatus } from '../../../../types/inventory';

export interface MobileCategoryGroupCardProps {
  /** Category group data with statistics */
  categoryGroup: CategoryGroupWithStats;

  /** Callback when card is tapped */
  onTap?: (group: CategoryGroupWithStats) => void;
}

/**
 * Mobile-optimized category group card component
 *
 * Features:
 * - Color-coded header with group name
 * - Category count badge
 * - Current inventory with unit
 * - Inventory status indicator
 * - Progress bar showing inventory level vs threshold
 * - Warning indicator for low stock
 * - 88px minimum height for touch targets
 * - High contrast text over colored backgrounds
 *
 * @example
 * ```tsx
 * <MobileCategoryGroupCard
 *   categoryGroup={group}
 *   onTap={(g) => navigate(`/category-groups/${g.id}`)}
 * />
 * ```
 */
export const MobileCategoryGroupCard: React.FC<MobileCategoryGroupCardProps> = ({
  categoryGroup,
  onTap,
}) => {
  // Calculate inventory status
  const getInventoryStatus = (): InventoryStatus => {
    const { currentInventory, minimumThreshold } = categoryGroup;

    if (currentInventory < 0) return 'negative_stock';
    if (currentInventory === 0) return 'zero_stock';
    if (currentInventory <= minimumThreshold) return 'low_stock';
    return 'healthy';
  };

  const inventoryStatus = getInventoryStatus();
  const inventoryPercentage = Math.min(
    (categoryGroup.currentInventory / (categoryGroup.minimumThreshold * 2)) * 100,
    100
  );

  // Get contrast color for text on colored background
  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const textColor = getContrastColor(categoryGroup.color);

  // Status chip configuration
  const statusConfig = {
    healthy: { label: 'In Stock', color: 'success' as const },
    low_stock: { label: 'Low Stock', color: 'warning' as const },
    zero_stock: { label: 'Out of Stock', color: 'error' as const },
    negative_stock: { label: 'Negative Stock', color: 'error' as const },
  };

  const statusInfo = statusConfig[inventoryStatus];

  return (
    <MobileCard onClick={() => onTap?.(categoryGroup)} sx={{ minHeight: 88, cursor: 'pointer' }}>
      {/* Colored Header with Group Name */}
      <Box
        sx={{
          backgroundColor: categoryGroup.color,
          color: textColor,
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <GroupIcon sx={{ fontSize: 20 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', flex: 1 }}>
          {categoryGroup.name}
        </Typography>
        {inventoryStatus === 'low_stock' || inventoryStatus === 'zero_stock' || inventoryStatus === 'negative_stock' ? (
          <WarningIcon sx={{ fontSize: 20 }} />
        ) : null}
      </Box>

      {/* Content Section */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Description */}
        {categoryGroup.description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
            {categoryGroup.description}
          </Typography>
        )}

        {/* Stats Row */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category Count */}
          <Chip
            icon={<CategoryIcon />}
            label={`${categoryGroup.categoryCount} ${categoryGroup.categoryCount === 1 ? 'category' : 'categories'}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '12px', height: 28 }}
          />

          {/* Inventory Status */}
          <Chip
            label={statusInfo.label}
            size="small"
            color={statusInfo.color}
            sx={{ fontSize: '12px', height: 28 }}
          />

          {/* Current Inventory */}
          <Chip
            icon={<InventoryIcon />}
            label={`${categoryGroup.currentInventory} ${categoryGroup.inventoryUnit}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '12px', height: 28 }}
          />
        </Box>

        {/* Inventory Progress Bar */}
        <Box sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
              Inventory Level
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
              Threshold: {categoryGroup.minimumThreshold} {categoryGroup.inventoryUnit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={inventoryPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor:
                  inventoryStatus === 'zero_stock' || inventoryStatus === 'negative_stock' || inventoryStatus === 'low_stock'
                    ? '#f44336'
                    : '#4caf50',
              },
            }}
          />
        </Box>
      </Box>
    </MobileCard>
  );
};

export default MobileCategoryGroupCard;

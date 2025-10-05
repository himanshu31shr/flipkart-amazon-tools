import React from 'react';
import { Box, Typography, Chip, useTheme } from '@mui/material';
import {
  ShoppingBag as AmazonIcon,
  Store as FlipkartIcon,
} from '@mui/icons-material';
import { MobileCard } from '../../../../components/mobile/MobileCard';
import { InventoryStatusChip } from '../../../../components/InventoryStatusChip/InventoryStatusChip';
import { ProductWithCategoryGroup } from '../../../../services/product.service';
import { InventoryStatus } from '../../../../types/inventory';

export interface MobileProductCardProps {
  product: ProductWithCategoryGroup;
  stockLevel?: number;
  inventoryStatus?: InventoryStatus;
  onTap?: (product: ProductWithCategoryGroup) => void;
}

export const MobileProductCard: React.FC<MobileProductCardProps> = ({
  product,
  stockLevel,
  inventoryStatus,
  onTap,
}) => {
  const theme = useTheme();

  const platformConfig = {
    amazon: { label: 'Amazon', color: '#FF9900', icon: AmazonIcon },
    flipkart: { label: 'Flipkart', color: '#2874F0', icon: FlipkartIcon },
  };

  const platform = platformConfig[product.platform];
  const PlatformIcon = platform.icon;
  const hasLowStock = inventoryStatus === 'low_stock';
  const hasZeroStock = inventoryStatus === 'zero_stock';

  return (
    <MobileCard
      onClick={() => onTap?.(product)}
      sx={{
        minHeight: 88,
        cursor: 'pointer',
        ...(hasZeroStock && {
          borderLeft: `4px solid ${theme.palette.error.main}`,
        }),
        ...(hasLowStock && {
          borderLeft: `4px solid ${theme.palette.warning.main}`,
        }),
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.name}
          </Typography>
          {inventoryStatus && <InventoryStatusChip status={inventoryStatus} />}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
            <strong>SKU:</strong> {product.sku}
          </Typography>
          {typeof stockLevel === 'number' && (
            <Typography variant="body2" color={hasZeroStock ? 'error' : hasLowStock ? 'warning.main' : 'text.secondary'} sx={{ fontSize: '14px', fontWeight: hasZeroStock || hasLowStock ? 600 : 400 }}>
              <strong>Stock:</strong> {stockLevel} units
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <Chip icon={<PlatformIcon sx={{ fontSize: '16px' }} />} label={platform.label} size="small" sx={{ backgroundColor: platform.color, color: '#ffffff', fontWeight: 600, fontSize: '12px', height: 28, '& .MuiChip-icon': { color: '#ffffff' } }} />
          {product.category && <Chip label={product.category.name} size="small" variant="outlined" color="primary" sx={{ fontSize: '12px', height: 28 }} />}
        </Box>
      </Box>
    </MobileCard>
  );
};

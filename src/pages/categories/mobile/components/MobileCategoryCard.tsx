import React from 'react';
import { Box, Typography, Chip, Badge } from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';
import { MobileCard } from '../../../../components/mobile/MobileCard';
import { InventoryStatusChip } from '../../../../components/InventoryStatusChip/InventoryStatusChip';
import { CategoryWithGroup } from '../../../../types/category';
import { InventoryStatus } from '../../../../types/inventory';

export interface MobileCategoryCardProps {
  category: CategoryWithGroup;
  productCount?: number;
  inventoryStatus?: InventoryStatus;
  currentInventory?: number;
  onTap?: (category: CategoryWithGroup) => void;
}

export const MobileCategoryCard: React.FC<MobileCategoryCardProps> = ({
  category,
  productCount = 0,
  inventoryStatus,
  currentInventory,
  onTap,
}) => {
  const hasDeduction = category.inventoryDeductionQuantity && category.inventoryDeductionQuantity > 0;

  return (
    <MobileCard onClick={() => onTap?.(category)} sx={{ minHeight: 88, cursor: 'pointer', width: '100%' }} contentPadding={0}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px', flex: 1 }}>
            {category.name}
          </Typography>
          {inventoryStatus && <InventoryStatusChip status={inventoryStatus} />}
        </Box>

        {category.description && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '14px' }}>
            {category.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <Chip icon={<InventoryIcon />} label={`${productCount} products`} size="small" variant="outlined" sx={{ fontSize: '12px', height: 28 }} />

          {hasDeduction && (
            <Badge badgeContent={category.inventoryDeductionQuantity} color="primary">
              <Chip label="Auto Deduction" size="small" color="primary" sx={{ fontSize: '12px', height: 28 }} />
            </Badge>
          )}

          {category.costPrice && (
            <Chip label={`₹${category.costPrice.toFixed(2)}`} size="small" color="success" variant="outlined" sx={{ fontSize: '12px', height: 28 }} />
          )}

          {typeof currentInventory === 'number' && (
            <Chip label={`Stock: ${currentInventory} ${category.inventoryUnit || 'units'}`} size="small" variant="outlined" sx={{ fontSize: '12px', height: 28 }} />
          )}

          {category.categoryGroup && (
            <Chip label={category.categoryGroup.name} size="small" sx={{ fontSize: '12px', height: 28, backgroundColor: category.categoryGroup.color, color: '#fff' }} />
          )}
        </Box>
      </Box>
    </MobileCard>
  );
};

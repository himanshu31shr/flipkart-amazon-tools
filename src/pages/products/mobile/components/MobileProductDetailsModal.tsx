import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { MobileModal } from '../../../../components/mobile/MobileModal';
import { InventoryStatusChip } from '../../../../components/InventoryStatusChip/InventoryStatusChip';
import { ProductWithCategoryGroup } from '../../../../services/product.service';
import { InventoryStatus } from '../../../../types/inventory';

export interface MobileProductDetailsModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductWithCategoryGroup | null;
  stockLevel?: number;
  inventoryStatus?: InventoryStatus;
  onEdit?: () => void;
}

export const MobileProductDetailsModal: React.FC<MobileProductDetailsModalProps> = ({
  open,
  onClose,
  product,
  stockLevel,
  inventoryStatus,
  onEdit,
}) => {
  if (!product) return null;

  return (
    <MobileModal
      open={open}
      onClose={onClose}
      title={product.name}
      headerAction={onEdit ? { label: 'Edit', onClick: onEdit } : undefined}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">SKU</Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>{product.sku}</Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="overline" color="text.secondary">Platform</Typography>
          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{product.platform}</Typography>
        </Box>

        {product.category && (
          <>
            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">Category</Typography>
              <Typography variant="body1">{product.category.name}</Typography>
              {product.category.categoryGroup && (
                <Typography variant="body2" color="text.secondary">Group: {product.category.categoryGroup.name}</Typography>
              )}
            </Box>
          </>
        )}

        {typeof stockLevel === 'number' && (
          <>
            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">Stock Level</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{stockLevel}</Typography>
                <Typography variant="body2" color="text.secondary">units</Typography>
                {inventoryStatus && <InventoryStatusChip status={inventoryStatus} />}
              </Box>
            </Box>
          </>
        )}

        <Divider />

        <Box>
          <Typography variant="overline" color="text.secondary">Selling Price</Typography>
          <Typography variant="body1">₹{product.sellingPrice.toFixed(2)}</Typography>
        </Box>

        <Divider />

        <Box>
          <Typography variant="overline" color="text.secondary">Visibility</Typography>
          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{product.visibility}</Typography>
        </Box>

        {product.description && (
          <>
            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">Description</Typography>
              <Typography variant="body1">{product.description}</Typography>
            </Box>
          </>
        )}

        {product.metadata?.createdAt && (
          <>
            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">Created</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(
                  typeof product.metadata.createdAt === 'object' && 'toDate' in product.metadata.createdAt
                    ? product.metadata.createdAt.toDate()
                    : product.metadata.createdAt
                ).toLocaleDateString()}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </MobileModal>
  );
};

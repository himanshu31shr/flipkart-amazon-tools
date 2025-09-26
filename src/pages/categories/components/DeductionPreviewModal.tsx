import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CascadeIcon from '@mui/icons-material/AccountTree';
import DirectIcon from '@mui/icons-material/Inventory';
import { InventoryOrderProcessor, ProductSummary, InventoryDeductionPreview } from '../../../services/inventoryOrderProcessor.service';

interface DeductionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  orderItems: ProductSummary[];
  orderReference?: string;
  title?: string;
}

const DeductionPreviewModal: React.FC<DeductionPreviewModalProps> = ({
  open,
  onClose,
  orderItems,
  orderReference,
  title = 'Inventory Deduction Preview'
}) => {
  const [preview, setPreview] = useState<InventoryDeductionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inventoryOrderProcessor = new InventoryOrderProcessor();

  // Load preview data when modal opens
  useEffect(() => {
    if (open && orderItems.length > 0) {
      loadPreview();
    }
  }, [open, orderItems]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const previewResult = await inventoryOrderProcessor.previewCategoryDeductions(orderItems);
      setPreview(previewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deduction preview');
    } finally {
      setLoading(false);
    }
  };


  const formatQuantity = (quantity: number, unit: string) => {
    return `${quantity} ${unit}`;
  };

  const directDeductions = preview?.items.filter(item => !item.isCascade) || [];
  const cascadeDeductions = preview?.items.filter(item => item.isCascade) || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoIcon color="primary" />
          <Typography variant="h6">{title}</Typography>
          {orderReference && (
            <Chip 
              label={`Order: ${orderReference}`} 
              size="small" 
              variant="outlined" 
            />
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : preview ? (
          <Stack spacing={3}>
            {/* Summary Section */}
            {preview.totalDeductions.size > 0 && (
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Deduction Summary
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Array.from(preview.totalDeductions.entries()).map(([groupId, summary]) => (
                    <Chip
                      key={groupId}
                      label={`${summary.categoryGroupName}: ${formatQuantity(summary.totalQuantity, summary.unit)}`}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {/* Warnings and Errors */}
            {preview.warnings.length > 0 && (
              <Alert severity="warning" icon={<WarningIcon />}>
                <Typography variant="subtitle2" gutterBottom>Warnings:</Typography>
                <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                  {preview.warnings.map((warning, index) => (
                    <li key={index}>
                      <Typography variant="body2">{warning}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {preview.errors.length > 0 && (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2" gutterBottom>Errors:</Typography>
                <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                  {preview.errors.map((error, index) => (
                    <li key={index}>
                      <Typography variant="body2">{error}</Typography>
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {/* Direct Deductions */}
            {directDeductions.length > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DirectIcon color="primary" />
                    <Typography variant="h6">
                      Direct Category Deductions ({directDeductions.length})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} elevation={0}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Order Qty</TableCell>
                          <TableCell>Deduction per Unit</TableCell>
                          <TableCell>Total Deduction</TableCell>
                          <TableCell>Category Group</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {directDeductions.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.productName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.productSku}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.categoryName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.orderQuantity}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatQuantity(item.deductionQuantity, item.inventoryUnit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium" color="primary">
                                {formatQuantity(item.totalDeduction, item.inventoryUnit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {item.categoryGroupId}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Cascade Deductions */}
            {cascadeDeductions.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CascadeIcon color="secondary" />
                    <Typography variant="h6">
                      Cascade Deductions ({cascadeDeductions.length})
                    </Typography>
                    <Tooltip title="Additional deductions triggered by category links">
                      <InfoIcon fontSize="small" color="info" />
                    </Tooltip>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        These deductions are automatically triggered through category links. 
                        When an order affects the source category, linked categories will also have their inventory reduced.
                      </Typography>
                    </Alert>
                  </Box>
                  
                  <TableContainer component={Paper} elevation={0}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Link Path</TableCell>
                          <TableCell>Order Qty</TableCell>
                          <TableCell>Deduction per Unit</TableCell>
                          <TableCell>Total Deduction</TableCell>
                          <TableCell>Category Group</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cascadeDeductions.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.productName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.productSku}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" color="text.secondary">
                                  {item.cascadeSource?.sourceCategoryName}
                                </Typography>
                                <Typography variant="body2">→</Typography>
                                <Typography variant="body2" color="secondary">
                                  {item.cascadeSource?.targetCategoryName}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{item.orderQuantity}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatQuantity(item.deductionQuantity, item.inventoryUnit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium" color="secondary">
                                {formatQuantity(item.totalDeduction, item.inventoryUnit)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {item.categoryGroupId}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* No Deductions Message */}
            {(!preview.items || preview.items.length === 0) && (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary">
                  No inventory deductions will be performed for this order.
                  {orderItems.length > 0 && ' Products may not have categories configured for automatic deduction.'}
                </Typography>
              </Box>
            )}
          </Stack>
        ) : (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No order items provided for preview.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {preview && preview.items.length > 0 && (
          <Button onClick={loadPreview} disabled={loading}>
            Refresh Preview
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DeductionPreviewModal;
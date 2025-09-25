import HistoryIcon from "@mui/icons-material/History";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Box,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
  Paper,
  Collapse,
  useTheme,
  Link,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { Column, DataTable } from "../../../components/DataTable/DataTable";
import { InventoryMovement, MovementFilters } from "../../../types/inventory";
import { InventoryMovementsToolbar } from "./InventoryMovementsToolbar";
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { 
  fetchInventoryMovements, 
  setMovementFilters,
  clearMovementFilters
} from '../../../store/slices/inventorySlice';
import type { RootState } from '../../../store';

interface Props {
  onOrderClick?: (orderReference: string) => void;
  onTransactionClick?: (transactionReference: string) => void;
}

export const InventoryMovementsTable: React.FC<Props> = ({
  onOrderClick,
  onTransactionClick,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const inventoryMovements = useAppSelector((state: RootState) => 
    state.inventory.filteredInventoryMovements
  );
  const loading = useAppSelector((state: RootState) => 
    state.inventory.loading.inventoryMovements
  );
  const errors = useAppSelector((state: RootState) => 
    state.inventory.error.inventoryMovements
  );
  const filters = useAppSelector((state: RootState) => 
    state.inventory.filters.movements
  );
  
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Load movements with current filters
    dispatch(fetchInventoryMovements(filters));
  }, [dispatch, filters]);

  // Show error snackbar when there are errors
  useEffect(() => {
    if (errors) {
      setSnackbarMessage(errors);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  }, [errors]);

  const handleFilterChange = (newFilters: Partial<MovementFilters>) => {
    dispatch(setMovementFilters(newFilters));
  };

  const handleClearFilters = () => {
    dispatch(clearMovementFilters());
  };

  const handleRefresh = () => {
    dispatch(fetchInventoryMovements(filters));
    setSnackbarMessage('Movements data refreshed');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getMovementTypeColor = (type: InventoryMovement['movementType']): string => {
    switch (type) {
      case 'addition':
        return theme.palette.success.main; // Green
      case 'deduction':
        return theme.palette.error.main; // Red
      case 'adjustment':
        return theme.palette.primary.main; // Blue
      case 'initial':
        return theme.palette.grey[500]; // Gray
      default:
        return theme.palette.grey[500];
    }
  };

  const getMovementTypeLabel = (type: InventoryMovement['movementType']): string => {
    switch (type) {
      case 'addition':
        return 'Addition';
      case 'deduction':
        return 'Deduction';
      case 'adjustment':
        return 'Adjustment';
      case 'initial':
        return 'Initial';
      default:
        return 'Unknown';
    }
  };

  const formatQuantityChange = (movement: InventoryMovement): string => {
    const sign = movement.movementType === 'deduction' ? '-' : '+';
    const formattedQuantity = movement.unit === 'g' && movement.quantity >= 1000 
      ? `${(movement.quantity / 1000).toFixed(2)} kg`
      : `${movement.quantity.toFixed(2)} ${movement.unit}`;
    
    return `${sign}${formattedQuantity}`;
  };

  const formatInventoryValue = (value: number, unit: string): string => {
    if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kg`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  const formatTimestamp = (timestamp?: unknown): string => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Handle Firestore Timestamp
      const timestampWithToDate = timestamp as { toDate?: () => Date };
      const date = timestampWithToDate?.toDate ? timestampWithToDate.toDate() : new Date(timestamp as string | number | Date);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return 'Invalid Date';
    }
  };

  const formatMovementContext = (movement: InventoryMovement): React.ReactNode => {
    const context: React.ReactNode[] = [];

    // Platform
    if (movement.platform) {
      context.push(
        <Chip
          key="platform"
          label={movement.platform.charAt(0).toUpperCase() + movement.platform.slice(1)}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      );
    }

    // Order reference with click handler
    if (movement.orderReference) {
      context.push(
        <Link
          key="order"
          component="button"
          variant="body2"
          onClick={(e) => {
            e.stopPropagation();
            onOrderClick?.(movement.orderReference!);
          }}
          sx={{ 
            textDecoration: 'underline',
            cursor: 'pointer',
            color: 'primary.main',
            fontSize: '0.75rem'
          }}
        >
          Order: {movement.orderReference}
        </Link>
      );
    }

    // Transaction reference with click handler
    if (movement.transactionReference) {
      context.push(
        <Link
          key="transaction"
          component="button"
          variant="body2"
          onClick={(e) => {
            e.stopPropagation();
            onTransactionClick?.(movement.transactionReference!);
          }}
          sx={{ 
            textDecoration: 'underline',
            cursor: 'pointer',
            color: 'primary.main',
            fontSize: '0.75rem'
          }}
        >
          Txn: {movement.transactionReference}
        </Link>
      );
    }

    // Product SKU
    if (movement.productSku) {
      context.push(
        <Typography
          key="sku"
          variant="caption"
          sx={{ 
            fontFamily: 'monospace',
            backgroundColor: 'grey.100',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.7rem'
          }}
        >
          SKU: {movement.productSku}
        </Typography>
      );
    }

    // Reason for manual adjustments
    if (movement.reason) {
      context.push(
        <Typography
          key="reason"
          variant="caption"
          sx={{ 
            color: 'text.secondary',
            fontStyle: 'italic',
            fontSize: '0.75rem'
          }}
        >
          Reason: {movement.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Typography>
      );
    }

    // Adjusted by
    if (movement.adjustedBy) {
      context.push(
        <Typography
          key="adjustedBy"
          variant="caption"
          sx={{ 
            color: 'text.secondary',
            fontSize: '0.75rem'
          }}
        >
          By: {movement.adjustedBy}
        </Typography>
      );
    }

    if (context.length === 0) {
      return <Typography variant="caption" color="text.secondary">—</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {context}
      </Box>
    );
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      'Date/Time',
      'Category Group',
      'Movement Type',
      'Quantity Change',
      'Previous Level',
      'New Level',
      'Unit',
      'Platform',
      'Order Reference',
      'Transaction Reference',
      'Product SKU',
      'Reason',
      'Adjusted By',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...inventoryMovements.map(movement => [
        `"${formatTimestamp(movement.createdAt)}"`,
        `"${movement.categoryGroupId}"`,
        `"${getMovementTypeLabel(movement.movementType)}"`,
        `"${formatQuantityChange(movement)}"`,
        movement.previousInventory,
        movement.newInventory,
        movement.unit,
        movement.platform || '',
        movement.orderReference || '',
        movement.transactionReference || '',
        movement.productSku || '',
        movement.reason || '',
        movement.adjustedBy || '',
        `"${movement.notes || ''}"`
      ].join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-movements-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSnackbarMessage('Movements exported to CSV');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };

  const hasActiveFilters = () => {
    return !!(
      filters.categoryGroupId ||
      filters.movementType ||
      filters.startDate ||
      filters.endDate ||
      filters.platform ||
      filters.adjustedBy ||
      filters.transactionReference ||
      filters.orderReference ||
      filters.productSku ||
      filters.reason
    );
  };

  const columns: Column<InventoryMovement>[] = [
    { 
      id: "createdAt", 
      label: "Date/Time", 
      priorityOnMobile: true,
      format: (value) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {formatTimestamp(value)}
        </Typography>
      ),
    },
    {
      id: "categoryGroupId",
      label: "Category Group",
      filter: true,
      priorityOnMobile: true,
      format: (value) => (
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {value as string}
        </Typography>
      ),
    },
    {
      id: "movementType",
      label: "Type",
      filter: true,
      align: "center",
      format: (value) => {
        const type = value as InventoryMovement['movementType'];
        return (
          <Chip
            label={getMovementTypeLabel(type)}
            size="small"
            sx={{
              backgroundColor: getMovementTypeColor(type),
              color: 'white',
              fontWeight: 'medium',
              minWidth: '80px',
            }}
          />
        );
      },
      priorityOnMobile: true,
    },
    {
      id: "quantity",
      label: "Quantity Change",
      align: "right",
      format: (_, row) => {
        const movement = row as InventoryMovement;
        const isNegative = movement.movementType === 'deduction';
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 'medium',
              fontFamily: 'monospace',
              color: isNegative ? 'error.main' : 'success.main'
            }}
          >
            {formatQuantityChange(movement)}
          </Typography>
        );
      },
    },
    {
      id: "previousInventory",
      label: "Previous Level",
      align: "right",
      format: (value, row) => {
        const inventory = value as number;
        const unit = (row as InventoryMovement)?.unit || '';
        return (
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {formatInventoryValue(inventory, unit)}
          </Typography>
        );
      },
    },
    {
      id: "newInventory",
      label: "New Level",
      align: "right",
      format: (value, row) => {
        const inventory = value as number;
        const unit = (row as InventoryMovement)?.unit || '';
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              fontWeight: 'medium',
              color: inventory <= 0 ? 'error.main' : 'text.primary'
            }}
          >
            {formatInventoryValue(inventory, unit)}
          </Typography>
        );
      },
    },
    {
      id: "context",
      label: "Context",
      format: (_, row) => formatMovementContext(row as InventoryMovement),
    },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header with actions */}
      <Box sx={{
        mb: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
            Inventory Movements
          </Typography>
          {inventoryMovements.length > 0 && (
            <Chip 
              label={`${inventoryMovements.length} movements`}
              size="small" 
              variant="outlined"
            />
          )}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Toggle Filters">
            <IconButton
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? "primary" : "default"}
              sx={{
                border: '1px solid',
                borderColor: showFilters ? 'primary.main' : 'grey.300',
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh Data">
            <IconButton
              onClick={handleRefresh}
              color="primary"
              sx={{
                border: '1px solid',
                borderColor: 'primary.main',
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export to CSV">
            <IconButton
              onClick={handleExportCSV}
              color="primary"
              disabled={inventoryMovements.length === 0}
              sx={{
                border: '1px solid',
                borderColor: 'primary.main',
              }}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>

          {hasActiveFilters() && (
            <Tooltip title="Clear All Filters">
              <IconButton
                onClick={handleClearFilters}
                color="secondary"
                sx={{
                  border: '1px solid',
                  borderColor: 'secondary.main',
                }}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Collapsible Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <InventoryMovementsToolbar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </Paper>
      </Collapse>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={inventoryMovements}
        defaultSortColumn="createdAt"
        defaultSortDirection="desc"
        rowsPerPageOptions={[10, 25, 50, 100]}
        defaultRowsPerPage={25}
        getRowId={(row) => row.id || `${row.categoryGroupId}-${row.createdAt}`}
      />

      {/* Loading state */}
      {loading && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 3 
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Loading inventory movements...
          </Typography>
        </Box>
      )}

      {/* Empty state */}
      {!loading && inventoryMovements.length === 0 && (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 3,
            textAlign: 'center'
          }}
        >
          <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Inventory Movements Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hasActiveFilters() 
              ? 'Try adjusting your filters to see more results.' 
              : 'Inventory movements will appear here as orders are processed and adjustments are made.'
            }
          </Typography>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Alert,
  Snackbar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Stack,
  CircularProgress,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Assignment as DeductionIcon,
  TrendingDown as DeductionTrendIcon,
  Edit as EditIcon,
  CheckCircle as EnabledIcon,
  Cancel as DisabledIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import {
  fetchCategoriesWithDeduction,
  fetchDeductionConfigurationSummary,
} from '../../../store/slices/inventorySlice';
import {
  fetchCategories,
} from '../../../store/slices/categoriesSlice';
import { format } from 'date-fns';

export interface InventoryDeductionOverviewProps {
  /** Whether to show the component in compact mode */
  compact?: boolean;
  /** Custom action handlers */
  onEditCategory?: (categoryId: string) => void;
  onViewDeductionHistory?: (categoryId: string) => void;
  onConfigureDeduction?: (categoryId: string) => void;
  /** Whether to show configuration tools */
  showConfigurationTools?: boolean;
  /** Whether to auto-refresh data */
  autoRefresh?: boolean;
  /** Refresh interval in seconds */
  refreshInterval?: number;
}

interface CategoryDeductionSummary {
  categoryId: string;
  categoryName: string;
  isEnabled: boolean;
  deductionQuantity: number;
  unit: string;
  lastDeduction?: Date;
  totalDeductions?: number;
  currentInventoryLevel?: number;
}

interface DeductionActivity {
  id: string;
  categoryId: string;
  categoryName: string;
  orderId: string;
  productName: string;
  quantityDeducted: number;
  unit: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  notes?: string;
}

export const InventoryDeductionOverview: React.FC<InventoryDeductionOverviewProps> = ({
  compact = false,
  onEditCategory,
  onViewDeductionHistory,
  onConfigureDeduction,
  showConfigurationTools = true,
  autoRefresh = false,
  refreshInterval = 30,
}) => {
  const dispatch = useAppDispatch();
  
  // Redux state - these will be used when real integration is complete
  // const categories = useAppSelector(selectCategories);
  // const categoryDeduction = useAppSelector(selectCategoryDeduction);
  // const loading = useAppSelector(selectInventoryLoading);
  // const errors = useAppSelector(selectInventoryErrors);
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showActivityFeed, setShowActivityFeed] = useState(!compact);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Mock data for demonstration - in real app this would come from Redux state
  const [categoryDeductionSummaries] = useState<CategoryDeductionSummary[]>([
    {
      categoryId: 'cat1',
      categoryName: 'Electronics',
      isEnabled: true,
      deductionQuantity: 10,
      unit: 'pcs',
      lastDeduction: new Date('2024-01-15T10:30:00'),
      totalDeductions: 150,
      currentInventoryLevel: 500,
    },
    {
      categoryId: 'cat2',
      categoryName: 'Books',
      isEnabled: true,
      deductionQuantity: 5,
      unit: 'pcs',
      lastDeduction: new Date('2024-01-14T14:20:00'),
      totalDeductions: 85,
      currentInventoryLevel: 200,
    },
    {
      categoryId: 'cat3',
      categoryName: 'Clothing',
      isEnabled: false,
      deductionQuantity: 0,
      unit: 'pcs',
      totalDeductions: 0,
      currentInventoryLevel: 300,
    },
  ]);

  const [recentActivity] = useState<DeductionActivity[]>([
    {
      id: 'act1',
      categoryId: 'cat1',
      categoryName: 'Electronics',
      orderId: 'AMZ-123456',
      productName: 'Wireless Headphones',
      quantityDeducted: 10,
      unit: 'pcs',
      timestamp: new Date('2024-01-15T10:30:00'),
      status: 'success',
    },
    {
      id: 'act2',
      categoryId: 'cat2',
      categoryName: 'Books',
      orderId: 'FLP-789012',
      productName: 'Programming Guide',
      quantityDeducted: 5,
      unit: 'pcs',
      timestamp: new Date('2024-01-14T14:20:00'),
      status: 'success',
    },
    {
      id: 'act3',
      categoryId: 'cat1',
      categoryName: 'Electronics',
      orderId: 'AMZ-345678',
      productName: 'Smartphone Case',
      quantityDeducted: 10,
      unit: 'pcs',
      timestamp: new Date('2024-01-13T09:15:00'),
      status: 'warning',
      notes: 'Low inventory warning triggered',
    },
  ]);

  // Filter categories based on search and status
  const filteredCategories = useMemo(() => {
    return categoryDeductionSummaries.filter(category => {
      const matchesSearch = category.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'enabled' && category.isEnabled) ||
        (statusFilter === 'disabled' && !category.isEnabled);
      
      return matchesSearch && matchesStatus;
    });
  }, [categoryDeductionSummaries, searchTerm, statusFilter]);

  // Paginated categories
  const paginatedCategories = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredCategories.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCategories, page, rowsPerPage]);

  // Load data on component mount
  useEffect(() => {
    handleRefresh();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchCategories()),
        dispatch(fetchCategoriesWithDeduction()),
        dispatch(fetchDeductionConfigurationSummary()),
      ]);
      setSuccessMessage('Data refreshed successfully');
    } catch {
      setErrorMessage('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditCategory = (categoryId: string) => {
    if (onEditCategory) {
      onEditCategory(categoryId);
    } else {
      setSuccessMessage(`Edit category functionality triggered for: ${categoryId}`);
    }
  };

  const handleViewHistory = (categoryId: string) => {
    if (onViewDeductionHistory) {
      onViewDeductionHistory(categoryId);
    } else {
      setSuccessMessage(`View history functionality triggered for: ${categoryId}`);
    }
  };

  const handleConfigureDeduction = (categoryId: string) => {
    if (onConfigureDeduction) {
      onConfigureDeduction(categoryId);
    } else {
      setSuccessMessage(`Configure deduction functionality triggered for: ${categoryId}`);
    }
  };

  const getStatusChip = (isEnabled: boolean, totalDeductions: number) => {
    if (!isEnabled) {
      return (
        <Chip
          icon={<DisabledIcon />}
          label="Disabled"
          size="small"
          color="default"
          variant="outlined"
        />
      );
    }

    return (
      <Chip
        icon={<EnabledIcon />}
        label={`Active (${totalDeductions} deductions)`}
        size="small"
        color="success"
        variant="outlined"
      />
    );
  };

  const getActivityStatusChip = (status: DeductionActivity['status']) => {
    const configs = {
      success: { color: 'success' as const, label: 'Success' },
      warning: { color: 'warning' as const, label: 'Warning' },
      error: { color: 'error' as const, label: 'Error' },
    };

    const config = configs[status];
    return (
      <Chip
        label={config.label}
        size="small"
        color={config.color}
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            <DeductionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Inventory Deduction Overview
          </Typography>
          <Box display="flex" gap={1}>
            {showConfigurationTools && (
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setSuccessMessage('Configure global deduction settings')}
              >
                Settings
              </Button>
            )}
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              title="Refresh data"
            >
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="enabled">Enabled Only</MenuItem>
                <MenuItem value="disabled">Disabled Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={5}>
            <FormControlLabel
              control={
                <Switch
                  checked={showActivityFeed}
                  onChange={(e) => setShowActivityFeed(e.target.checked)}
                />
              }
              label="Show Recent Activity"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Categories Table */}
      <Card sx={{ mb: showActivityFeed ? 3 : 0 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Category Deduction Configuration
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Deduction Qty</TableCell>
                  <TableCell align="right">Current Stock</TableCell>
                  <TableCell>Last Deduction</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCategories.map((category) => (
                  <TableRow key={category.categoryId} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {category.categoryName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(category.isEnabled, category.totalDeductions || 0)}
                    </TableCell>
                    <TableCell align="right">
                      {category.isEnabled ? (
                        <Typography variant="body2">
                          {category.deductionQuantity} {category.unit}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {category.currentInventoryLevel} {category.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {category.lastDeduction ? (
                        <Typography variant="body2" color="text.secondary">
                          {format(category.lastDeduction, 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        <Tooltip title="Configure deduction">
                          <IconButton
                            size="small"
                            onClick={() => handleConfigureDeduction(category.categoryId)}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View history">
                          <IconButton
                            size="small"
                            onClick={() => handleViewHistory(category.categoryId)}
                          >
                            <HistoryIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit category">
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category.categoryId)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredCategories.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      {showActivityFeed && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Deduction Activity
            </Typography>
            
            {recentActivity.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No recent deduction activity found.
              </Alert>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {recentActivity.slice(0, compact ? 3 : 10).map((activity) => (
                  <Paper key={activity.id} variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={8}>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.productName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Order: {activity.orderId} • Category: {activity.categoryName}
                        </Typography>
                        {activity.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {activity.notes}
                          </Typography>
                        )}
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Typography variant="body2" align="center">
                          <DeductionTrendIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 16 }} />
                          {activity.quantityDeducted} {activity.unit}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box display="flex" flexDirection="column" alignItems="flex-end">
                          {getActivityStatusChip(activity.status)}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                            {format(activity.timestamp, 'MMM dd, HH:mm')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InventoryDeductionOverview;
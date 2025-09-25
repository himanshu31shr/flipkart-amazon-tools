import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Stack
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { Link as RouterLink } from 'react-router-dom';
import { InventoryLevel } from '../../../types/inventory';

interface InventorySummaryWidgetProps {
  inventoryLevels: InventoryLevel[];
  loading: boolean;
}

interface InventorySummaryData {
  healthyStock: number;
  lowStock: number;
  zeroStock: number;
  negativeStock: number;
}

const InventorySummaryWidget: React.FC<InventorySummaryWidgetProps> = ({
  inventoryLevels,
  loading
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Calculate inventory summary data
  const summaryData: InventorySummaryData = React.useMemo(() => {
    return inventoryLevels.reduce(
      (acc, level) => {
        switch (level.status) {
          case 'healthy':
            acc.healthyStock++;
            break;
          case 'low_stock':
            acc.lowStock++;
            break;
          case 'zero_stock':
            acc.zeroStock++;
            break;
          case 'negative_stock':
            acc.negativeStock++;
            break;
          default:
            break;
        }
        return acc;
      },
      { healthyStock: 0, lowStock: 0, zeroStock: 0, negativeStock: 0 }
    );
  }, [inventoryLevels]);

  // Prepare data for pie chart
  const chartData = React.useMemo(() => {
    const data = [];
    
    if (summaryData.healthyStock > 0) {
      data.push({
        name: 'Healthy Stock',
        value: summaryData.healthyStock,
        color: theme.palette.success.main,
        status: 'healthy'
      });
    }
    
    if (summaryData.lowStock > 0) {
      data.push({
        name: 'Low Stock',
        value: summaryData.lowStock,
        color: theme.palette.warning.main,
        status: 'low_stock'
      });
    }
    
    if (summaryData.zeroStock > 0) {
      data.push({
        name: 'Zero Stock',
        value: summaryData.zeroStock,
        color: theme.palette.error.main,
        status: 'zero_stock'
      });
    }
    
    if (summaryData.negativeStock > 0) {
      data.push({
        name: 'Negative Stock',
        value: summaryData.negativeStock,
        color: theme.palette.error.dark,
        status: 'negative_stock'
      });
    }
    
    return data;
  }, [summaryData, theme.palette]);

  const totalCategories = inventoryLevels.length;
  const problemCategories = summaryData.lowStock + summaryData.zeroStock + summaryData.negativeStock;

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { name: string; value: number; fill?: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold" mb={0.5}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary">
            {data.value} categories
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalCategories > 0 ? Math.round((data.value / totalCategories) * 100) : 0}% of total
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  if (totalCategories === 0) {
    return (
      <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
        <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Inventory Data
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          No inventory levels found. Start by setting up category groups and their inventory levels.
        </Typography>
        <Button
          variant="outlined"
          component={RouterLink}
          to="/inventory"
          size="small"
        >
          Manage Inventory
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="h2" sx={{ color: 'primary.dark', fontWeight: 'bold' }}>
          Inventory Overview
        </Typography>
        <Chip 
          label={totalCategories} 
          color="primary" 
          size="small" 
          sx={{ ml: 1 }}
        />
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Summary Cards */}
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" fontWeight="medium">
                  Healthy
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {summaryData.healthyStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" fontWeight="medium">
                  Low Stock
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {summaryData.lowStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <ErrorIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" fontWeight="medium">
                  Zero Stock
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {summaryData.zeroStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', bgcolor: 'error.dark', color: 'common.white' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <ErrorIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" fontWeight="medium">
                  Negative
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {summaryData.negativeStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pie Chart */}
      {chartData.length > 0 && (
        <Box sx={{ height: isMobile ? 200 : 250, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 60 : 80}
                innerRadius={isMobile ? 30 : 40}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Action Buttons */}
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Button
          variant="outlined"
          component={RouterLink}
          to="/inventory"
          size="small"
          sx={{ fontSize: '0.75rem' }}
        >
          View All Inventory
        </Button>
        
        {problemCategories > 0 && (
          <Button
            variant="contained"
            color="warning"
            component={RouterLink}
            to="/inventory?filter=alerts"
            size="small"
            sx={{ fontSize: '0.75rem' }}
          >
            View {problemCategories} Alerts
          </Button>
        )}
      </Stack>

      {/* Summary Footer */}
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          {problemCategories > 0 
            ? `${problemCategories} of ${totalCategories} categories need attention`
            : `All ${totalCategories} categories are healthy`
          }
        </Typography>
      </Box>
    </Paper>
  );
};

export default InventorySummaryWidget;
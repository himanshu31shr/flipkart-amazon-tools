import React, { useEffect, lazy, Suspense } from 'react';
import {
    Box,
    CircularProgress,
    Grid,
    Paper,
    Typography
} from '@mui/material';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { ProductSummary } from '../../pages/home/services/base.transformer';
import { ActiveOrderSchema } from '../../services/todaysOrder.service';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOrderHistory } from '../../store/slices/orderHistorySlice';
import { fetchOrders } from '../../store/slices/ordersSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import {
    fetchInventoryLevels,
    fetchInventoryAlerts,
    selectInventoryLevels,
    selectInventoryLoading
} from '../../store/slices/inventorySlice';
import { HighPricedProductsWidget } from './components/ProductAlertWidgets';
import UncategorizedProductsWidget from './components/UncategorizedProductsWidget';
import InventoryAlertsWidget from './components/InventoryAlertsWidget';
import InventorySummaryWidget from './components/InventorySummaryWidget';
import { useIsMobile } from '../../utils/mobile';

// Lazy load mobile component
const MobileDashboardPage = lazy(() =>
  import('./mobile/MobileDashboardPage').then(m => ({ default: m.MobileDashboardPage }))
);

// Desktop component
const DesktopDashboardPage = () => {
    const dispatch = useAppDispatch();
    const { items: products, loading: productsLoading } = useAppSelector(state => state.products);
    const { items: orders } = useAppSelector(state => state.orders);
    const { dailyOrders } = useAppSelector(state => state.orderHistory);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const inventoryLevels = useAppSelector(selectInventoryLevels);
    const inventoryLoading = useAppSelector(selectInventoryLoading);

    useEffect(() => {
        // Only fetch data if authenticated
        if (isAuthenticated) {
            dispatch(fetchProducts({}));
            dispatch(fetchOrders());
            dispatch(fetchOrderHistory());
            dispatch(fetchInventoryLevels());
            dispatch(fetchInventoryAlerts());
        }
    }, [dispatch, isAuthenticated]);

    const totalOrders = orders.length;
    const totalProducts = products.length;
    const revenue = orders.reduce((sum, order: ProductSummary) => {
        const price = order.product?.sellingPrice || 0;
        const quantity = parseInt(order.quantity) || 0;
        return sum + (price * quantity);
    }, 0);
    
    // Calculate actual Average Order Value
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    if (productsLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Transform daily orders for the chart
    const chartData = dailyOrders.map((day: ActiveOrderSchema) => ({
        date: day.date,
        orders: day.orders.length
    }));

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                    Dashboard
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Typography variant="subtitle1" color="text.secondary">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                                Total Orders
                            </Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                            {totalOrders}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Across all platforms
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'success.main', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                                Total Revenue
                            </Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                            ₹{revenue.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Gross revenue from all sales
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'info.main', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                                Total Products
                            </Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
                            {totalProducts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Products in catalog
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'secondary.main', height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                                Average Order Value
                            </Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.dark' }}>
                            ₹{averageOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Average revenue per order
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Charts and Widgets */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Orders Overview
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    interval={2}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                    formatter={(value) => [`${value} orders`, 'Orders']}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#8884d8"
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

            </Grid>

            {/* Inventory Widgets */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* Inventory Summary Widget */}
                <Grid item xs={12} md={8}>
                    <InventorySummaryWidget
                        inventoryLevels={inventoryLevels}
                        loading={inventoryLoading.inventoryLevels}
                    />
                </Grid>

                {/* Inventory Alerts Widget */}
                <Grid item xs={12} md={4}>
                    <InventoryAlertsWidget
                        maxAlertsInWidget={5}
                        onManualAdjustment={(categoryGroupId) => {
                            console.log('Manual adjustment for category group:', categoryGroupId);
                        }}
                        onViewCategoryGroup={(categoryGroupId) => {
                            console.log('View category group:', categoryGroupId);
                        }}
                    />
                </Grid>
            </Grid>

            {/* Additional Alert Widgets */}
            <Grid container spacing={3} sx={{ mt: 1 }}>

                {/* High-Priced Products Widget */}
                <Grid item xs={12} md={4}>
                    <HighPricedProductsWidget
                        products={products}
                        loading={productsLoading}
                    />
                </Grid>

                {/* Uncategorized Products Widget */}
                <Grid item xs={12} md={4}>
                    <UncategorizedProductsWidget
                        products={products}
                        loading={productsLoading}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

// Main wrapper component with mobile detection
export const DashboardPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Suspense
        fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
          </Box>
        }
      >
        <MobileDashboardPage />
      </Suspense>
    );
  }

  return <DesktopDashboardPage />;
}; 
import React, { useEffect } from 'react';
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
import { fetchLowStockCategories } from '../../store/slices/categoryInventorySlice';
import { fetchOrderHistory } from '../../store/slices/orderHistorySlice';
import { fetchOrders } from '../../store/slices/ordersSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import CategoryLowInventoryWidget from './components/CategoryLowInventoryWidget';
import { HiddenProductsWidget, HighPricedProductsWidget } from './components/ProductAlertWidgets';
import UncategorizedProductsWidget from './components/UncategorizedProductsWidget';

export const DashboardPage = () => {
    const dispatch = useAppDispatch();
    const { items: products, loading: productsLoading } = useAppSelector(state => state.products);
    const { items: orders } = useAppSelector(state => state.orders);
    const { dailyOrders } = useAppSelector(state => state.orderHistory);
    const { lowStockCategories, loading: categoryInventoryLoading } = useAppSelector(state => state.categoryInventory);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        // Only fetch data if authenticated
        if (isAuthenticated) {
            dispatch(fetchProducts({}));
            dispatch(fetchOrders());
            dispatch(fetchOrderHistory());
            dispatch(fetchLowStockCategories());
        }
    }, [dispatch, isAuthenticated]);

    const totalOrders = orders.length;
    const activeOrders = orders.filter(order => order.product?.visibility === 'visible').length;
    const totalProducts = products.length;
    const revenue = orders.reduce((sum, order: ProductSummary) => {
        const price = order.product?.sellingPrice || 0;
        const quantity = parseInt(order.quantity) || 0;
        return sum + (price * quantity);
    }, 0);

    if (productsLoading || categoryInventoryLoading) {
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
                                Recent Orders
                            </Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
                            {activeOrders}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Currently active orders
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
                            {totalProducts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Total products in catalog
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

                {/* Category Low Inventory Widget */}
                <Grid item xs={12} md={4}>
                    <CategoryLowInventoryWidget
                        categories={lowStockCategories}
                        loading={categoryInventoryLoading}
                    />
                </Grid>
            </Grid>

            {/* Additional Alert Widgets */}
            <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* Hidden Products Widget */}
                <Grid item xs={12} md={4}>
                    <HiddenProductsWidget
                        products={products}
                        loading={productsLoading}
                    />
                </Grid>

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
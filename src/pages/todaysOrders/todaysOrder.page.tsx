import {
  Box,
  CircularProgress,
  Container,
  Grid,
  Typography,
  Paper,
  Divider,
  Chip,
  ButtonGroup,
  Button,
  Stack,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import React, { useEffect, useState, useMemo } from "react";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import SummarizeIcon from "@mui/icons-material/Summarize";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchOrders, fetchOrdersForDate } from "../../store/slices/ordersSlice";
import { SummaryTable } from "../home/components/SummaryTable";
import { CategoryGroupedTable } from "./components/CategoryGroupedTable";
import { groupOrdersByCategory } from "./utils/groupingUtils";
import { exportNativeCategorySummaryToPDF } from "./utils/nativePdfExport";
import { TodaysFilesWidget } from "../storage-management/components/TodaysFilesWidget";

type ViewMode = 'individual' | 'grouped';

export const TodaysOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: orders, loading } = useAppSelector(state => state.orders);
  const [viewMode, setViewMode] = useState<ViewMode>('individual');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (dateString === today) {
      dispatch(fetchOrders());
    } else {
      dispatch(fetchOrdersForDate(dateString));
    }
  }, [dispatch, selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const handleTodayButton = () => {
    setSelectedDate(new Date());
  };

  // Memoized grouped data for performance
  const groupedData = useMemo(() => {
    return groupOrdersByCategory(orders);
  }, [orders]);

  const totalRevenue = orders.reduce((sum, order) => {
    const price = order.product?.sellingPrice || 0;
    const quantity = parseInt(order.quantity) || 0;
    return sum + (price * quantity);
  }, 0);

  const totalCost = orders.reduce((sum, order) => {
    const cost = order.product?.customCostPrice ?? 0;
    const quantity = parseInt(order.quantity) || 0;
    return sum + (cost * quantity);
  }, 0);

  const profitMargin = totalRevenue > 0 
    ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)
    : 0;

  const handleExportSummaryPDF = () => {
    exportNativeCategorySummaryToPDF(groupedData);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ShoppingCartIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "Today's Orders" : "Orders"}
          </Typography>
          <Chip 
            label={`${orders.length} Orders`} 
            color="primary" 
            size="medium" 
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Date Navigation */}
        <Card sx={{ mb: 3, borderRadius: 2, border: "1px solid", borderColor: "primary.light" }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <CalendarTodayIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                Date Navigation
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                <IconButton onClick={handlePreviousDay} color="primary">
                  <ArrowBackIcon />
                </IconButton>
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Select Date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    sx={{ minWidth: 200 }}
                  />
                </LocalizationProvider>
                
                <IconButton onClick={handleNextDay} color="primary">
                  <ArrowForwardIcon />
                </IconButton>
                
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={handleTodayButton}
                  sx={{ ml: 1 }}
                >
                  Today
                </Button>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Showing orders for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 3 }} />

        {/* View Toggle and Export Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <ButtonGroup variant="outlined" sx={{ borderRadius: 2 }}>
            <Button
              variant={viewMode === 'individual' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('individual')}
              startIcon={<ViewListIcon />}
              sx={{ minWidth: 140 }}
            >
              Individual Orders
            </Button>
            <Button
              variant={viewMode === 'grouped' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('grouped')}
              startIcon={<CategoryIcon />}
              sx={{ minWidth: 140 }}
            >
              Grouped by Category
            </Button>
          </ButtonGroup>

          {viewMode === 'grouped' && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SummarizeIcon />}
                onClick={handleExportSummaryPDF}
                sx={{ minWidth: 120 }}
              >
                Export Summary
              </Button>
            </Stack>
          )}
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShoppingCartIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Total Orders
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                {orders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Processed today
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'success.main', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoneyIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                ₹{totalRevenue.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Gross revenue from today&apos;s sales
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'error.main', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyOffIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Total Cost
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                ₹{totalCost.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Cost of goods sold
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: 'secondary.main', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: 'secondary.main', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Profit Margin
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.dark' }}>
                {profitMargin}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Percentage profit on sales
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Today's Files - Quick Access */}
        <TodaysFilesWidget selectedDate={selectedDate} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.dark', mb: 2 }}>
            {viewMode === 'individual' ? 'Current Orders' : 'Orders by Category'}
          </Typography>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems={"center"}
              m={4}
            >
              <CircularProgress color="primary" size={40} thickness={4} />
            </Box>
          ) : (
            <>
              {viewMode === 'individual' ? (
                <SummaryTable summary={orders} />
              ) : (
                <CategoryGroupedTable groupedData={groupedData} />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

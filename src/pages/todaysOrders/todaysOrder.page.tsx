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
  Card,
  CardContent,
  IconButton,
  Select, // Added
  MenuItem, // Added
  FormControl, // Added
  InputLabel, // Added
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, subDays } from 'date-fns';
import React, { useEffect, useState, useMemo } from "react";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchOrders, fetchOrdersForDate } from "../../store/slices/ordersSlice";
import { SummaryTable } from "../home/components/SummaryTable";
import { CategoryGroupedTable } from "./components/CategoryGroupedTable";
import { groupOrdersByCategory } from "./utils/groupingUtils";
import { FormattedCurrency } from "../../components/FormattedCurrency";


type ViewMode = 'individual' | 'grouped';

export const TodaysOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: orders, loading } = useAppSelector(state => state.orders);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBatch, setSelectedBatch] = useState<string>('all'); // New state for batch filter

  useEffect(() => {
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (dateString === today) {
      dispatch(fetchOrders());
    } else {
      dispatch(fetchOrdersForDate({ date: selectedDate.toISOString() }));
    }
  }, [dispatch, selectedDate]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  

  const handleTodayButton = () => {
    setSelectedDate(new Date());
  };

  const handlePreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const filteredOrders = useMemo(() => {
    if (selectedBatch === 'all') {
      return orders;
    }
    return orders.filter(order => order.batchNumber === selectedBatch);
  }, [orders, selectedBatch]);

  // Memoized grouped data for performance
  const groupedData = useMemo(() => {
    return groupOrdersByCategory(filteredOrders);
  }, [filteredOrders]);

  // Memoized unique batches for filter dropdown
  const uniqueBatches = useMemo(() => {
    const batches = new Map<string, { batchNumber: string; batchTimestamp: string }>();
    orders.forEach(order => {
      if (order.batchNumber && order.batchTimestamp) {
        if (!batches.has(order.batchNumber)) {
          batches.set(order.batchNumber, {
            batchNumber: order.batchNumber,
            batchTimestamp: order.batchTimestamp
          });
        }
      }
    });
    // Sort batches by timestamp, newest first
    return Array.from(batches.values()).sort((a, b) => new Date(b.batchTimestamp).getTime() - new Date(a.batchTimestamp).getTime());
  }, [orders]);

  

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ShoppingCartIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "Today's Orders" : "Orders"}
          </Typography>
          <Chip 
            label={`${filteredOrders.length} Orders`} 
            color="primary" 
            size="medium" 
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Date Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
          <CalendarTodayIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
            Date Navigation
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <IconButton onClick={handlePreviousDay} size="large">
              <ChevronLeftIcon />
            </IconButton>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={handleDateChange}
                sx={{ minWidth: 200 }}
              />
            </LocalizationProvider>
            <IconButton onClick={handleNextDay} size="large">
              <ChevronRightIcon />
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Showing orders for {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Batch Filter and View Toggle/Export Controls */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
          <FormControl sx={{ minWidth: 200, flexGrow: 1 }}>
            <InputLabel id="batch-select-label">Filter by Batch</InputLabel>
            <Select
              labelId="batch-select-label"
              id="batch-select"
              value={selectedBatch}
              label="Filter by Batch"
              onChange={(event) => setSelectedBatch(event.target.value as string)}
            >
              <MenuItem value="all">All Batches</MenuItem>
              {uniqueBatches.map((batch) => (
                <MenuItem key={batch.batchNumber} value={batch.batchNumber}>
                  {format(new Date(batch.batchTimestamp), 'MMM dd, yyyy HH:mm')} - {batch.batchNumber.substring(0, 8)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}> {/* This Box wraps ButtonGroup and Stack */}
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

            
          </Box> {/* Closing tag for the new Box */}
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #1976d2' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <ShoppingCartIcon sx={{ color: '#1976d2', fontSize: 32, mb: 1 }} />
                <Typography variant="h6" color="info.dark" sx={{ fontWeight: 'bold' }}>
                  {filteredOrders.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #1976d2' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CategoryIcon sx={{ color: '#1976d2', fontSize: 32, mb: 1 }} />
                <Typography variant="h6" color="info.dark" sx={{ fontWeight: 'bold' }}>
                  {Object.keys(groupedData.categorizedGroups).length + (groupedData.uncategorizedGroup.totalItems > 0 ? 1 : 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Categories
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
        
        
          
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #ed6c02' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <AttachMoneyIcon sx={{ color: '#ed6c02', fontSize: 32, mb: 1 }} />
                <Typography variant="h6" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                  <FormattedCurrency value={filteredOrders.reduce((acc, order) => acc + ((order.product?.sellingPrice || 0) * (parseInt(order.quantity) || 0)), 0)} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderLeft: '4px solid #9c27b0' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TrendingUpIcon sx={{ color: '#9c27b0', fontSize: 32, mb: 1 }} />
                <Typography variant="h6" color="secondary" sx={{ fontWeight: 'bold' }}>
                  {Math.round(filteredOrders.reduce((acc, order) => acc + ((order.product?.sellingPrice || 0) * (parseInt(order.quantity) || 0)), 0) / Math.max(filteredOrders.length, 1))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Order Value
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
                <SummaryTable summary={filteredOrders} />
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

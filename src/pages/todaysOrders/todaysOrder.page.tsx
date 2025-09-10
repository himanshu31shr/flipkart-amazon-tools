import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Paper,
  Chip,
  Button,
  IconButton,
} from "@mui/material";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import React, { useEffect, useState, useMemo } from "react";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchOrders, fetchOrdersForDate } from "../../store/slices/ordersSlice";
import { SummaryTable } from "../home/components/SummaryTable";
import { CategoryGroupedTable } from "./components/CategoryGroupedTable";
import { groupOrdersByCategory } from "./utils/groupingUtils";
import { Platform } from "./components/PlatformFilter";
import { FilesModal } from "./components/FilesModal";
import { UnifiedFilters, ViewMode } from "./components/UnifiedFilters";


export const TodaysOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: orders, loading } = useAppSelector(state => state.orders);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [platformFilter, setPlatformFilter] = useState<Platform>('all');
  const [filesModalOpen, setFilesModalOpen] = useState(false);

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

  const handlePlatformFilterChange = (platform: Platform) => {
    setPlatformFilter(platform);
  };

  // Memoized grouped data for performance
  const groupedData = useMemo(() => {
    return groupOrdersByCategory(orders);
  }, [orders]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          
          {/* Date Navigation beside heading */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            <IconButton onClick={handlePreviousDay} color="primary" size="small">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                sx={{ 
                  '& .MuiInputBase-root': { 
                    fontSize: '0.875rem',
                    minWidth: '160px'
                  }
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    variant: 'outlined'
                  }
                }}
              />
            </LocalizationProvider>
            
            <IconButton onClick={handleNextDay} color="primary" size="small">
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
            
            <Button 
              variant={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "contained" : "outlined"}
              size="small" 
              onClick={handleTodayButton}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              Today
            </Button>
          </Box>
        </Box>


        {/* Unified Filters */}
        <UnifiedFilters
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          platformFilter={platformFilter}
          onPlatformFilterChange={handlePlatformFilterChange}
          onFilesClick={() => setFilesModalOpen(true)}
        />


        {/* Files Modal */}
        <FilesModal
          open={filesModalOpen}
          onClose={() => setFilesModalOpen(false)}
          selectedDate={selectedDate}
        />

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
                <SummaryTable summary={orders} platformFilter={platformFilter} />
              ) : (
                <CategoryGroupedTable groupedData={groupedData} platformFilter={platformFilter} />
              )}
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

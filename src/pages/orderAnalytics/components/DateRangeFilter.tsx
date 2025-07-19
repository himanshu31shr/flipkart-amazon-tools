import React from 'react';
import { Box, Button, ButtonGroup, Grid, Popover, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { endOfDay, endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';

interface DateRangeFilterProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onDateRangeChange,
  anchorEl,
  onClose,
}) => {
  const handleDateChange = (field: 'startDate' | 'endDate') => (date: Date | null) => {
    if (date) {
      onDateRangeChange(
        field === 'startDate' ? startOfDay(date) : dateRange.startDate,
        field === 'endDate' ? endOfDay(date) : dateRange.endDate
      );
    }
  };

  const handlePresetDateChange = (preset: 'today' | 'yesterday' | 'monthToDate' | 'last30Days' | 'lastMonth' | 'last3Months') => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (preset) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(today, 1));
        endDate = endOfDay(subDays(today, 1));
        break;
      case 'monthToDate':
        startDate = startOfMonth(today);
        endDate = endOfDay(today);
        break;
      case 'last30Days':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfDay(today);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(today, 1));
        endDate = endOfMonth(subMonths(today, 1));
        break;
      case 'last3Months':
        startDate = startOfMonth(subMonths(today, 3));
        endDate = endOfDay(today);
        break;
      default:
        return;
    }
    onDateRangeChange(startDate, endDate);
  };

  const handleClearDate = () => {
    onDateRangeChange(startOfMonth(new Date()), endOfMonth(new Date()));
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ width: 340, p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Date Range</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={handleDateChange('startDate')}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={handleDateChange('endDate')}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Grid>
          <Grid item xs={12}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button onClick={() => handlePresetDateChange('today')}>Today</Button>
              <Button onClick={() => handlePresetDateChange('yesterday')}>Yesterday</Button>
            </ButtonGroup>
          </Grid>
          <Grid item xs={12}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button onClick={() => handlePresetDateChange('monthToDate')}>Month to Date</Button>
              <Button onClick={() => handlePresetDateChange('last30Days')}>Last 30 Days</Button>
            </ButtonGroup>
          </Grid>
          <Grid item xs={12}>
            <ButtonGroup variant="outlined" fullWidth>
              <Button onClick={() => handlePresetDateChange('lastMonth')}>Last Month</Button>
              <Button onClick={() => handlePresetDateChange('last3Months')}>Last 3 Months</Button>
            </ButtonGroup>
          </Grid>
          <Grid item xs={12}>
            <Button variant="text" color="secondary" onClick={handleClearDate} fullWidth>
              Reset to Current Month
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Popover>
  );
};

export default DateRangeFilter; 
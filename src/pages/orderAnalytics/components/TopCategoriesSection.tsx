import StarIcon from '@mui/icons-material/Star';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Grid,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { HistoricalCategoryData } from '../hooks/useHistoricalData';

interface TopCategoriesSectionProps {
  topCategories: HistoricalCategoryData[];
  totalCategories: number;
}

const TopCategoriesSection: React.FC<TopCategoriesSectionProps> = ({
  topCategories,
  totalCategories,
}) => {
  const theme = useTheme();

  if (!topCategories.length) {
    return (
      <Box textAlign="center" py={3}>
        <Typography variant="h6" color="text.secondary">
          No top performers data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <StarIcon sx={{ color: theme.palette.warning.main }} />
        <Typography variant="h6">
          Top 10 Categories
        </Typography>
        <Chip
          label={`${topCategories.length} of ${totalCategories} categories`}
          size="small"
          variant="outlined"
          color="primary"
        />
      </Box>

      <Grid container spacing={1}>
        {topCategories.map((category, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={category.categoryId}>
            <Card
              sx={{
                height: '100%',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: theme.shadows[2],
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                {/* Rank and Category Name */}
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: index < 3 ? theme.palette.primary.main : theme.palette.grey[300],
                      color: index < 3 ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      lineHeight: 1.2,
                      flex: 1,
                    }}
                  >
                    {category.categoryName}
                  </Typography>
                </Box>

                {/* Metrics */}
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Total:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                      {category.totalOrders.toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      2 Days:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {category.todayOrders + category.yesterdayOrders}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      Products:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {category.productCount}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Summary Stats */}
      <Box mt={2} p={1.5} bgcolor="background.paper" borderRadius={1} border={1} borderColor="divider">
        <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem' }}>
          Top Categories Summary
        </Typography>
        <Box display="flex" gap={3}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Total Orders
            </Typography>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              {topCategories.reduce((sum, c) => sum + c.totalOrders, 0).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Last 2 Days
            </Typography>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              {topCategories.reduce((sum, c) => sum + c.todayOrders + c.yesterdayOrders, 0).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Total Products
            </Typography>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              {topCategories.reduce((sum, c) => sum + c.productCount, 0).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default TopCategoriesSection; 
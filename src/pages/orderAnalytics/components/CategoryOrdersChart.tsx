import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Import necessary types
import { Category } from '../../../services/category.service';
import { ProductSummary } from '../../home/services/base.transformer';

// Define prop types for CategoryOrdersChart
interface CategoryOrdersChartProps {
  orders: ProductSummary[];
  categories: Category[];
}

const CategoryOrdersChart: React.FC<CategoryOrdersChartProps> = ({ orders, categories }) => {
  // Color palette for different categories
  const colorPalette = [
    '#1976d2', // Blue
    '#dc004e', // Red
    '#388e3c', // Green
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#d32f2f', // Dark Red
    '#388e3c', // Dark Green
    '#f57c00', // Dark Orange
    '#1976d2', // Dark Blue
    '#7b1fa2', // Dark Purple
    '#ff9800', // Amber
    '#795548', // Brown
    '#607d8b', // Blue Grey
    '#e91e63', // Pink
    '#3f51b5', // Indigo
    '#009688', // Teal
    '#ff5722', // Deep Orange
    '#673ab7', // Deep Purple
    '#2196f3', // Light Blue
    '#4caf50', // Light Green
    '#ffeb3b', // Yellow
    '#9c27b0', // Purple
    '#00bcd4', // Cyan
    '#8bc34a', // Light Green
    '#ffc107', // Amber
    '#9e9e9e', // Grey
    '#f44336', // Red
    '#3f51b5', // Indigo
    '#009688', // Teal
    '#ff9800', // Orange
  ];

  // Map categoryId to category name
  const categoryIdToName: Record<string, string> = {};
  categories.forEach(cat => {
    if (cat.id) categoryIdToName[cat.id] = cat.name;
  });

  // Aggregate by category - only count orders (quantity)
  const categoryMap: Record<string, number> = {};
  orders.forEach(order => {
    const categoryId = order.product?.categoryId;
    const category = categoryId ? (categoryIdToName[categoryId] || 'Uncategorized') : 'Uncategorized';
    const quantity = parseInt(order.quantity) || 1;
    
    if (!categoryMap[category]) {
      categoryMap[category] = 0;
    }
    categoryMap[category] += quantity;
  });

  // Convert to array, sort by quantity (descending), and limit to top 30
  const categoryData = Object.entries(categoryMap)
    .map(([category, quantity], index) => ({
      name: category,
      value: quantity,
      color: colorPalette[index % colorPalette.length], // Assign color based on index
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 30);

  if (!orders.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
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
            {label}
          </Typography>
          <Typography variant="body2" color="primary">
            Orders: {payload[0].value.toLocaleString()}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Top 30 Categories by Order Quantity
      </Typography>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={categoryData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 100, // Increased bottom margin for category names
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 10 }}
            interval={0} // Show all labels
          />
          <YAxis 
            label={{ 
              value: 'Number of Orders', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: '12px' }
            }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            name="Orders" 
            fill="#1976d2"
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          >
            {categoryData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default CategoryOrdersChart; 
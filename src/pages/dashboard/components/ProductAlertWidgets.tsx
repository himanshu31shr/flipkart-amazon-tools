import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Link
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Link as RouterLink } from 'react-router-dom';
import { Product } from '../../../services/product.service';
import { FormattedCurrency } from '../../../components/FormattedCurrency';

interface ProductAlertWidgetProps {
  products: Product[];
  loading: boolean;
}


// High-Priced Products Widget
export const HighPricedProductsWidget: React.FC<ProductAlertWidgetProps> = ({ products, loading }) => {
  // Filter to only high-priced products (where our price is higher than competitor)
  const highPricedProducts = products.filter(product => 
    product.competitionAnalysis && 
    Number(product.competitionAnalysis.competitorPrice) > 0 &&
    product.sellingPrice > Number(product.competitionAnalysis.competitorPrice)
  );
  
  // Show at most 5 items in the widget
  const displayItems = highPricedProducts.slice(0, 5);
  const remainingCount = highPricedProducts.length - 5;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (highPricedProducts.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No high-priced products found.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', backgroundColor: '#ffebee', border: '1px solid #f44336' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TrendingUpIcon sx={{ mr: 1, color: '#d32f2f' }} />
        <Typography variant="h6" component="h2" sx={{ color: '#b71c1c', fontWeight: 'bold' }}>
          High-Priced Products
        </Typography>
        <Chip 
          label={highPricedProducts.length} 
          color="error" 
          size="small" 
          sx={{ ml: 1, bgcolor: '#d32f2f', color: 'white' }}
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <List dense sx={{ mb: 1 }}>
        {displayItems.map((product) => (
          <ListItem 
            key={`${product.sku}-${product.platform}`}
            sx={{ 
              mb: 1, 
              borderRadius: 1,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <ListItemText
              primary={
                <Typography variant="body2" noWrap title={product.name}>
                  {product.name.length > 30 ? `${product.name.substring(0, 30)}...` : product.name}
                </Typography>
              }
              secondary={
                <span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <Typography variant="caption" color="error" component="span">
                      Our price: <FormattedCurrency value={product.sellingPrice} />
                    </Typography>
                    <Typography variant="caption" color="success.main" component="span">
                      Competitor: <FormattedCurrency value={Number(product.competitionAnalysis?.competitorPrice || 0)} />
                    </Typography>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <Typography variant="caption" color={product.platform === 'amazon' ? 'primary' : 'secondary'} component="span" sx={{ mr: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {product.platform}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="span">
                      SKU: {product.sku}
                    </Typography>
                  </span>
                </span>
              }
            />
          </ListItem>
        ))}
      </List>
      
      {remainingCount > 0 && (
        <Box sx={{ textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            color="error"
            size="small"
            component={RouterLink}
            to="/flipkart-amazon-tools/hidden-products/"
            sx={{ fontSize: '0.75rem' }}
          >
            View {remainingCount} more high-priced products
          </Button>
        </Box>
      )}
      
      {highPricedProducts.length > 0 && highPricedProducts.length <= 5 && (
        <Box sx={{ textAlign: 'center' }}>
          <Link 
            component={RouterLink}
            to="/flipkart-amazon-tools/hidden-products/"
            color="primary"
            underline="hover"
            sx={{ fontSize: '0.875rem' }}
          >
            Manage Pricing
          </Link>
        </Box>
      )}
    </Paper>
  );
};

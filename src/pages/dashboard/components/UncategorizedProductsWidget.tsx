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
    Alert,
    AlertTitle,
    CircularProgress,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CategoryIcon from '@mui/icons-material/Category';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../../services/product.service';

interface UncategorizedProductsWidgetProps {
    products: Product[];
    loading: boolean;
}

const UncategorizedProductsWidget: React.FC<UncategorizedProductsWidgetProps> = ({
    products,
    loading,
}) => {
    const navigate = useNavigate();

    // Filter products that don't have a category
    const uncategorizedProducts = React.useMemo(() => {
        return products.filter(product => !product.categoryId || product.categoryId.trim() === '');
    }, [products]);

    const handleViewAll = () => {
        navigate('/uncategorized-products/');
    };

    if (loading) {
        return (
            <Paper sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress size={40} />
            </Paper>
        );
    };    if (uncategorizedProducts.length === 0) {
        return (
            <Paper sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CategoryIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                        All Products Categorized
                    </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <CategoryIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                        Great! All products have categories assigned.
                    </Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
                    Uncategorized Products
                </Typography>
                <Chip
                    label={uncategorizedProducts.length}
                    color="warning"
                    size="small"
                    sx={{ ml: 'auto' }}
                />
            </Box>

            <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Action Required</AlertTitle>
                {uncategorizedProducts.length} product(s) need category assignment.
            </Alert>            <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {uncategorizedProducts.slice(0, 5).map((product) => (
                    <ListItem key={product.sku} sx={{ py: 0.5 }}>
                        <ListItemText
                            primary={
                                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    {product.name}
                                </Typography>
                            }
                            secondary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        SKU: {product.sku}
                                    </Typography>
                                    <Chip
                                        label={product.platform.toUpperCase()}
                                        size="small"
                                        color={product.platform === 'amazon' ? 'default' : 'primary'}
                                        sx={{ height: 16, fontSize: '0.6rem' }}
                                    />
                                </Box>
                            }
                        />
                    </ListItem>
                ))}
            </List>

            {uncategorizedProducts.length > 5 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                    ... and {uncategorizedProducts.length - 5} more
                </Typography>
            )}

            <Button
                variant="outlined"
                color="warning"
                fullWidth
                sx={{ mt: 2 }}
                onClick={handleViewAll}
            >
                View All Uncategorized Products
            </Button>
        </Paper>
    );
};

export default UncategorizedProductsWidget;
import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert, IconButton } from '@mui/material';
import { Add as AddIcon, QrCodeScanner as ScanIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MobileAppShell } from '../../../navigation/MobileAppShell';
import { MobileFAB } from '../../../components/mobile/MobileFAB';
import { MobileProductCard } from './components/MobileProductCard';
import { MobileProductSearch } from './components/MobileProductSearch';
import { MobileProductDetailsModal } from './components/MobileProductDetailsModal';
import { MobileBarcodeScanner } from '../../../components/mobile/MobileBarcodeScanner';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { fetchProducts } from '../../../store/slices/productsSlice';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { ProductWithCategoryGroup } from '../../../services/product.service';

export const MobileProductsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const products = useAppSelector(state => state.products?.items || []);
  const loading = useAppSelector(state => state.products?.loading || false);
  const error = useAppSelector(state => state.products?.error || null);

  const [searchValue, setSearchValue] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'amazon' | 'flipkart'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'stock'>('name');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategoryGroup | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [scannerActive, setScannerActive] = useState(false);

  const { state: pullState, containerRef } = usePullToRefresh(
    async () => {
      await dispatch(fetchProducts({})).unwrap();
    },
    { threshold: 80, enabled: true }
  );

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search)
      );
    }

    if (platformFilter !== 'all') {
      result = result.filter(p => p.platform === platformFilter);
    }

    if (categoryFilter) {
      result = result.filter(p => p.categoryId === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
      return 0;
    });

    return result;
  }, [products, searchValue, platformFilter, categoryFilter, sortBy]);

  const displayedProducts = filteredProducts.slice(0, displayCount);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: () => {
      if (displayCount < filteredProducts.length) {
        setDisplayCount(prev => Math.min(prev + 20, filteredProducts.length));
      }
    },
    isLoading: loading,
    hasMore: displayCount < filteredProducts.length,
    threshold: 100,
  });

  useEffect(() => {
    dispatch(fetchProducts({}));
  }, [dispatch]);

  const handleProductTap = (product: ProductWithCategoryGroup) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  const handleAddProduct = () => {
    navigate('/products/new');
  };

  const handleEdit = () => {
    if (selectedProduct?.id) {
      navigate(`/products/edit/${selectedProduct.id}`);
    }
  };

  const handleBarcodeScan = (barcode: string, _format: string) => {
    // Search for product with matching SKU or barcode
    const matchedProduct = products.find(p =>
      p.sku.toLowerCase() === barcode.toLowerCase() ||
      p.name.toLowerCase().includes(barcode.toLowerCase())
    );

    if (matchedProduct) {
      setSelectedProduct(matchedProduct);
      setDetailsOpen(true);
    } else {
      // If no match found, set search value to barcode
      setSearchValue(barcode);
    }
  };

  return (
    <MobileAppShell pageTitle="Products">
      <Box ref={containerRef} sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', backgroundColor: 'background.default' }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>
          <MobileProductSearch
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
            </Typography>
            <IconButton
              onClick={() => setScannerActive(true)}
              sx={{ minWidth: 44, minHeight: 44 }}
              aria-label="Scan barcode"
            >
              <ScanIcon />
            </IconButton>
          </Box>
        </Box>

        {pullState.isRefreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading && !pullState.isRefreshing && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && filteredProducts.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No products found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchValue || platformFilter !== 'all' || categoryFilter
                ? 'Try adjusting your search or filters'
                : 'Add your first product to get started'}
            </Typography>
          </Box>
        )}

        {!loading && displayedProducts.length > 0 && (
          <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedProducts.map((product) => (
              <MobileProductCard
                key={product.id || product.sku}
                product={product}
                onTap={handleProductTap}
              />
            ))}
            <div ref={sentinelRef} style={{ height: 20 }} />
            {displayCount < filteredProducts.length && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        )}

        <MobileProductDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          product={selectedProduct}
          onEdit={handleEdit}
        />

        <MobileFAB onClick={handleAddProduct} bottomOffset={80} aria-label="Add product">
          <AddIcon />
        </MobileFAB>

        <MobileBarcodeScanner
          isActive={scannerActive}
          onScan={handleBarcodeScan}
          onClose={() => setScannerActive(false)}
          instructions="Scan product barcode or SKU"
        />
      </Box>
    </MobileAppShell>
  );
};

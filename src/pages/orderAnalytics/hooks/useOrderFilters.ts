import { useState, useEffect } from 'react';
import { isWithinInterval, startOfMonth, endOfDay } from 'date-fns';
import { Category } from '../../../services/category.service';
import { Product } from '../../../services/product.service';
import { ProductSummary } from '../../../pages/home/services/base.transformer';

// Define a type for the order items coming from the Redux store
type OrderItem = ProductSummary & {
  date: string;
  product?: Product;
};

interface UseOrderFiltersProps {
  allOrders: OrderItem[]; // Use the OrderItem type
  categories: Category[];
  products: Product[];
}

export interface FilterState {
  selectedCategory: string;
  selectedSku: string;
  selectedPlatform: string;
  selectedProduct: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

type FilterKey = keyof FilterState;
type FilterValue = FilterState[FilterKey];

export const useOrderFilters = ({ allOrders, categories, products }: UseOrderFiltersProps) => {
  const [filterState, setFilterState] = useState<FilterState>({
    selectedCategory: '',
    selectedSku: '',
    selectedPlatform: '',
    selectedProduct: '',
    dateRange: {
      startDate: startOfMonth(new Date()),
      endDate: endOfDay(new Date()),
    },
  });

  const [skuOptions, setSkuOptions] = useState<string[]>([]);
  const [platformOptions, setPlatformOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);

  // Derive filter options from loaded orders data
  useEffect(() => {
    if (allOrders.length > 0) {
      // Access SKU directly from Order since it extends ProductSummary
      const uniqueSkus = Array.from(new Set(allOrders.map(order => order.SKU).filter(sku => sku && typeof sku === 'string') as string[]));
      setSkuOptions(uniqueSkus);
      
      // Access type directly from Order since it extends ProductSummary
      const uniquePlatforms = Array.from(new Set(allOrders.map(order => order.type).filter(platform => platform && typeof platform === 'string') as string[]));
      setPlatformOptions(uniquePlatforms);
      
      // Access product name directly from Order or nested product object
      const uniqueProducts = Array.from(new Set(allOrders.map(order => order.name || order.product?.name).filter(name => name && typeof name === 'string') as string[]));
      setProductOptions(uniqueProducts);
    }
  }, [allOrders]);

  const updateFilter = (key: FilterKey, value: FilterValue) => {
    setFilterState(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilterState({
      selectedCategory: '',
      selectedSku: '',
      selectedPlatform: '',
      selectedProduct: '',
      dateRange: filterState.dateRange,
    });
  };

  const clearDateRange = () => {
    setFilterState(prev => ({
      ...prev,
      dateRange: {
        startDate: new Date(),
        endDate: new Date(),
      },
    }));
  };

  const filteredOrders = allOrders.filter(order => {
    // Date filtering with better error handling
    let isWithinDateRange = true;
    try {
      if (order.date && typeof order.date === 'string') {
        const orderDate = new Date(order.date);
        if (!isNaN(orderDate.getTime())) {
          isWithinDateRange = isWithinInterval(orderDate, { 
            start: filterState.dateRange.startDate, 
            end: filterState.dateRange.endDate 
          });
        }
      }
    } catch {
      // Invalid date format, skip
    }
    if (!isWithinDateRange) return false;

    // Category filtering with simplified logic
    const categoryName = (() => {
      if (!order.product?.categoryId || categories.length === 0) {
        return 'Uncategorized';
      }
      // Find category using categoryId from the product object
      const category = categories.find(cat => cat.id === order.product?.categoryId);
      return category?.name || 'Uncategorized';
    })();

    // Product and SKU filtering with consistent type checking
    const orderSku = order.SKU || ''; // Access SKU directly
    const orderPlatform = order.type || ''; // Access type directly
    const orderProductName = order.name || order.product?.name || ''; // Access name or product name

    // Apply filters with consistent type checking
    const matchesCategory = !filterState.selectedCategory || categoryName === filterState.selectedCategory;
    const matchesSku = !filterState.selectedSku || orderSku === filterState.selectedSku;
    const matchesPlatform = !filterState.selectedPlatform || orderPlatform === filterState.selectedPlatform;
    const matchesProduct = !filterState.selectedProduct || orderProductName === filterState.selectedProduct;

    return matchesCategory && matchesSku && matchesPlatform && matchesProduct;
  }).map(order => {
    // Find and attach the product data to each order
    const product = products.find(p => p.sku.toLowerCase() === order.SKU?.toLowerCase());
    return { ...order, product };
  });

  return {
    filterState,
    skuOptions,
    platformOptions,
    productOptions,
    filteredOrders,
    updateFilter,
    clearFilters,
    clearDateRange,
  };
}; 
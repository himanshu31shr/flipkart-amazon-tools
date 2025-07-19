import { useMemo, useState, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { ProductSummary } from '../../home/services/base.transformer';
import { Category } from '../../../services/category.service';

// Extend ProductSummary to include date field for analytics
interface OrderItem extends ProductSummary {
  date?: string;
}

interface UseHistoricalDataProps {
  orders: OrderItem[];
  categories: Category[];
}

export interface HistoricalCategoryData {
  categoryId: string;
  categoryName: string;
  totalOrders: number;
  todayOrders: number;
  yesterdayOrders: number;
  orderChange: number;
  orderChangePercent: number;
  isTopCategory: boolean;
  productCount: number;
}

interface HistoricalDataResult {
  categoryData: HistoricalCategoryData[];
  topCategories: HistoricalCategoryData[];
  todayTotal: number;
  yesterdayTotal: number;
  loading: boolean;
}

export const useHistoricalData = ({ orders, categories }: UseHistoricalDataProps): HistoricalDataResult => {
  const [loading, setLoading] = useState(false);

  // Memoized date ranges - only recalculate when component mounts
  const dateRanges = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    return {
      today: { start: today, end: endOfDay(today) },
      yesterday: { start: yesterday, end: endOfDay(yesterday) }
    };
  }, []);

  // Memoized category mapping
  const categoryIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(cat => {
      if (cat.id) {
        map[cat.id] = cat.name;
      }
    });
    return map;
  }, [categories]);

  // Memoized historical data processing
  const historicalData = useMemo(() => {
    if (!orders.length) {
      return {
        categoryData: [],
        topCategories: [],
        todayTotal: 0,
        yesterdayTotal: 0
      };
    }

    // Aggregate data by category
    const categoryMap: Record<string, HistoricalCategoryData> = {};
    let todayTotal = 0;
    let yesterdayTotal = 0;

    // Process orders in a single pass
    orders.forEach((order: OrderItem) => {
      // Determine category information with proper fallback logic
      let categoryId: string;
      let categoryName: string;
      
      if (order.product?.categoryId && categoryIdToName[order.product.categoryId]) {
        // Valid category exists
        categoryId = order.product.categoryId;
        categoryName = categoryIdToName[categoryId];
      } else {
        // Uncategorized - use consistent key and name
        categoryId = 'uncategorized';
        categoryName = 'Uncategorized';
      }

      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          categoryId,
          categoryName,
          totalOrders: 0,
          todayOrders: 0,
          yesterdayOrders: 0,
          orderChange: 0,
          orderChangePercent: 0,
          isTopCategory: false,
          productCount: 0,
        };
      }

      categoryMap[categoryId].totalOrders += 1;

      // Check if order is from today or yesterday
      if (order.date) {
        const orderDate = new Date(order.date);
        
        if (isWithinInterval(orderDate, dateRanges.today)) {
          categoryMap[categoryId].todayOrders += 1;
          todayTotal += 1;
        } else if (isWithinInterval(orderDate, dateRanges.yesterday)) {
          categoryMap[categoryId].yesterdayOrders += 1;
          yesterdayTotal += 1;
        }
      }
    });

    // Calculate product counts efficiently
    Object.values(categoryMap).forEach(category => {
      const uniqueProducts = new Set(
        orders
          .filter(o => {
            if (category.categoryId === 'uncategorized') {
              // For uncategorized, include orders without valid category
              return !o.product?.categoryId || !categoryIdToName[o.product.categoryId];
            } else {
              // For categorized items, match the exact categoryId
              return o.product?.categoryId === category.categoryId;
            }
          })
          .map(o => o.SKU)
          .filter(Boolean)
      );
      category.productCount = uniqueProducts.size;
    });

    // Calculate changes and percentages
    Object.values(categoryMap).forEach(category => {
      category.orderChange = category.todayOrders - category.yesterdayOrders;
      category.orderChangePercent = category.yesterdayOrders > 0 
        ? ((category.orderChange / category.yesterdayOrders) * 100)
        : (category.todayOrders > 0 ? 100 : 0);
    });

    // Sort by total orders and identify top 10
    const sortedCategories = Object.values(categoryMap)
      .sort((a, b) => b.totalOrders - a.totalOrders);

    const topCategories = sortedCategories.slice(0, 10).map(category => ({
      ...category,
      isTopCategory: true
    }));

    // Mark top categories in the full list
    topCategories.forEach(topCategory => {
      const category = categoryMap[topCategory.categoryId];
      if (category) {
        category.isTopCategory = true;
      }
    });

    return {
      categoryData: sortedCategories,
      topCategories,
      todayTotal,
      yesterdayTotal
    };
  }, [orders, categoryIdToName, dateRanges]);

  // Only show loading briefly when data changes significantly
  useEffect(() => {
    if (orders.length > 0) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 100); // Reduced from 500ms to 100ms
      return () => clearTimeout(timer);
    }
  }, [orders.length]); // Only depend on orders length, not the entire orders array

  return {
    ...historicalData,
    loading
  };
}; 
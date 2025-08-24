import { ProductSummary } from "../../home/services/base.transformer";

export interface CategoryGroup {
  categoryName: string;
  categoryId?: string;
  orders: ProductSummary[];
  totalQuantity: number;
  totalRevenue: number;
  totalItems: number;
  platforms: string[];
}

export interface GroupedOrderData {
  categorizedGroups: CategoryGroup[];
  uncategorizedGroup: CategoryGroup;
  summary: {
    totalCategories: number;
    totalOrders: number;
    totalRevenue: number;
  };
}

/**
 * Calculate revenue for a single order
 */
export const calculateOrderRevenue = (order: ProductSummary): number => {
  const price = order.product?.sellingPrice || 0;
  const quantity = parseInt(order.quantity) || 0;
  return price * quantity;
};

/**
 * Group orders by their categories
 */
export const groupOrdersByCategory = (orders: ProductSummary[]): GroupedOrderData => {
  const categoryMap = new Map<string, CategoryGroup>();
  const uncategorizedOrders: ProductSummary[] = [];

  // Process each order
  orders.forEach(order => {
    const categoryName = order.category || null;
    const categoryId = order.product?.categoryId;

    if (!categoryName || categoryName.trim() === '') {
      uncategorizedOrders.push(order);
      return;
    }

    // Get or create category group
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        categoryName,
        categoryId,
        orders: [],
        totalQuantity: 0,
        totalRevenue: 0,
        totalItems: 0,
        platforms: [],
      });
    }

    const group = categoryMap.get(categoryName)!;
    group.orders.push(order);
    group.totalQuantity += parseInt(order.quantity) || 0;
    group.totalRevenue += calculateOrderRevenue(order);
    group.totalItems += 1;

    // Track unique platforms
    if (order.type && !group.platforms.includes(order.type)) {
      group.platforms.push(order.type);
    }
  });

  // Create uncategorized group
  const uncategorizedGroup: CategoryGroup = {
    categoryName: 'Uncategorized',
    orders: uncategorizedOrders,
    totalQuantity: uncategorizedOrders.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0),
    totalRevenue: uncategorizedOrders.reduce((sum, order) => sum + calculateOrderRevenue(order), 0),
    totalItems: uncategorizedOrders.length,
    platforms: [...new Set(uncategorizedOrders.map(order => order.type).filter(Boolean))],
  };

  // Convert map to sorted array
  const categorizedGroups = Array.from(categoryMap.values()).sort((a, b) => 
    a.categoryName.localeCompare(b.categoryName)
  );

  // Calculate summary
  const totalRevenue = categorizedGroups.reduce((sum, group) => sum + group.totalRevenue, 0) + 
                      uncategorizedGroup.totalRevenue;

  return {
    categorizedGroups,
    uncategorizedGroup,
    summary: {
      totalCategories: categorizedGroups.length + (uncategorizedGroup.totalItems > 0 ? 1 : 0),
      totalOrders: orders.length,
      totalRevenue,
    },
  };
};

/**
 * Get category statistics for display
 */
export const getCategoryStatistics = (group: CategoryGroup) => {
  return {
    itemCount: group.totalItems,
    totalQuantity: group.totalQuantity,
    totalRevenue: group.totalRevenue,
    averageQuantity: group.totalItems > 0 ? Math.round(group.totalQuantity / group.totalItems * 100) / 100 : 0,
    averageRevenue: group.totalItems > 0 ? Math.round(group.totalRevenue / group.totalItems * 100) / 100 : 0,
    platforms: group.platforms.join(', '),
  };
};

/**
 * Filter groups by search term and platform
 */
export const filterGroupsBySearch = (
  groupedData: GroupedOrderData,
  searchTerm: string,
  platform: 'all' | 'amazon' | 'flipkart' = 'all'
): GroupedOrderData => {
  const lowerSearchTerm = searchTerm.toLowerCase();

  const filterOrders = (order: ProductSummary) => {
    const searchTermMatch = !searchTerm.trim() ||
      order.name?.toLowerCase().includes(lowerSearchTerm) ||
      order.SKU?.toLowerCase().includes(lowerSearchTerm);

    const platformMatch = platform === 'all' || order.type === platform;

    return searchTermMatch && platformMatch;
  };

  const filteredCategorizedGroups = groupedData.categorizedGroups
    .map(group => {
      // If the search term matches the category name, include all orders in that group
      if (group.categoryName.toLowerCase().includes(lowerSearchTerm)) {
        return {
          ...group,
          orders: group.orders.filter(order => {
            const platformMatch = platform === 'all' || order.type === platform;
            return platformMatch;
          }),
        };
      }
      // Otherwise, filter orders within the group
      return {
        ...group,
        orders: group.orders.filter(filterOrders),
      };
    })
    .filter(group => group.orders.length > 0)
    .map(group => ({
      ...group,
      totalQuantity: group.orders.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0),
      totalRevenue: group.orders.reduce((sum, order) => sum + calculateOrderRevenue(order), 0),
      totalItems: group.orders.length,
      platforms: [...new Set(group.orders.map(o => o.type).filter(Boolean))]
    }));

  const filteredUncategorizedGroup = {
    ...groupedData.uncategorizedGroup,
    orders: groupedData.uncategorizedGroup.orders.filter(filterOrders),
  };

  filteredUncategorizedGroup.totalQuantity = filteredUncategorizedGroup.orders.reduce(
    (sum, order) => sum + (parseInt(order.quantity) || 0), 0
  );
  filteredUncategorizedGroup.totalRevenue = filteredUncategorizedGroup.orders.reduce(
    (sum, order) => sum + calculateOrderRevenue(order), 0
  );
  filteredUncategorizedGroup.totalItems = filteredUncategorizedGroup.orders.length;
  filteredUncategorizedGroup.platforms = [...new Set(filteredUncategorizedGroup.orders.map(o => o.type).filter(Boolean))];


  return {
    categorizedGroups: filteredCategorizedGroups,
    uncategorizedGroup: filteredUncategorizedGroup,
    summary: {
      totalCategories: filteredCategorizedGroups.length + (filteredUncategorizedGroup.totalItems > 0 ? 1 : 0),
      totalOrders: filteredCategorizedGroups.reduce((sum, group) => sum + group.totalItems, 0) + filteredUncategorizedGroup.totalItems,
      totalRevenue: filteredCategorizedGroups.reduce((sum, group) => sum + group.totalRevenue, 0) + filteredUncategorizedGroup.totalRevenue,
    },
  };
}; 
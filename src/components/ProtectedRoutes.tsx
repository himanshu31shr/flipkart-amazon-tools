import React from "react";
import { Route, Routes } from "react-router-dom";
import { DefaultContainer } from "../containers/default/default.container";
import NotFound from "../pages/NotFound";
import { useIsMobile } from "../utils/mobile";

// ... existing code ...

// Import lazy-loaded pages
const DashboardPage = React.lazy(() =>
  import("../pages/dashboard/dashboard.page").then((module) => ({
    default: module.DashboardPage,
  }))
);

const HomePage = React.lazy(() =>
  import("../pages/home/home.page").then((module) => ({
    default: module.HomePage,
  }))
);

const TransactionAnalytics = React.lazy(() =>
  import("../pages/transactionAnalytics/transactionAnalytics.page").then(
    (module) => ({
      default: module.TransactionAnalytics,
    })
  )
);

const ProductsPage = React.lazy(() =>
  import("../pages/products/products.page").then((module) => ({
    default: module.default,
  }))
);

const ActiveOrders = React.lazy(() =>
  import("../pages/todaysOrders/todaysOrder.page").then((module) => ({
    default: module.TodaysOrderPage,
  }))
);

const MobileBarcodeScannerPage = React.lazy(() =>
  import("../pages/todaysOrders/mobile/MobileBarcodeScannerPage").then((module) => ({
    default: module.MobileBarcodeScannerPage,
  }))
);



const CategoriesPage = React.lazy(() =>
  import("../pages/categories/categories.page").then((module) => ({
    default: module.CategoriesPage,
  }))
);

const CategoryGroupsPage = React.lazy(() =>
  import("../pages/categoryGroups/categoryGroups.page").then((module) => ({
    default: module.default,
  }))
);

const OrderAnalytics = React.lazy(() =>
  import("../pages/orderAnalytics").then((module) => ({
    default: module.default,
  }))
);

const UncategorizedProductsPage = React.lazy(() =>
  import("../pages/uncategorized-products/uncategorized-products.page").then((module) => ({
    default: module.default,
  }))
);

const StorageManagementPage = React.lazy(() =>
  import("../pages/storage-management/storage-management.page").then((module) => ({
    default: module.StorageManagementPage,
  }))
);

const HealthPage = React.lazy(() =>
  import("../pages/health/health.page").then((module) => ({
    default: module.default,
  }))
);

const MonitoringDashboard = React.lazy(() =>
  import("../pages/admin/monitoring-dashboard.page").then((module) => ({
    default: module.default,
  }))
);

const DeploymentStatusPage = React.lazy(() =>
  import("../pages/admin/deployment-status.page").then((module) => ({
    default: module.default,
  }))
);

const InventoryPage = React.lazy(() =>
  import("../pages/inventory/InventoryDashboard").then((module) => ({
    default: module.InventoryDashboard,
  }))
);


interface ProtectedRoutesProps {
  toggleTheme: () => void;
  mode: "light" | "dark";
}

export const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({
  toggleTheme,
  mode,
}) => {
  // Detect if user is on mobile viewport
  const isMobile = useIsMobile();

  // Define routes (shared between mobile and desktop)
  const routesContent = (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/home/" element={<HomePage />} />
      <Route path="/products/" element={<ProductsPage />} />
      <Route path="/transactions/" element={<TransactionAnalytics />} />
      <Route path="/activeOrders/" element={<ActiveOrders />} />
      <Route path="/todays-orders" element={<ActiveOrders />} />
      <Route path="/todays-orders/scanner" element={<MobileBarcodeScannerPage />} />
      <Route path="/categories/" element={<CategoriesPage />} />
      <Route path="/category-groups/" element={<CategoryGroupsPage />} />
      <Route path="/order-analytics/" element={<OrderAnalytics />} />
      <Route path="/uncategorized-products/" element={<UncategorizedProductsPage />} />
      <Route path="/storage-management/" element={<StorageManagementPage />} />
      <Route path="/inventory/*" element={<InventoryPage />} />
      <Route path="/health/" element={<HealthPage />} />
      <Route path="/monitoring/" element={<MonitoringDashboard />} />
      <Route path="/deployment-status/" element={<DeploymentStatusPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  // Wrap content based on mobile vs desktop viewport
  if (isMobile) {
    return routesContent;
  }

  return (
    <DefaultContainer toggleTheme={toggleTheme} mode={mode}>
      {routesContent}
    </DefaultContainer>
  );
}; 
import React from 'react';
import InventoryAlertsPanel from '../../inventory/components/InventoryAlertsPanel';

interface InventoryAlertsWidgetProps {
  // Maximum number of alerts to show in widget mode
  maxAlertsInWidget?: number;
  // Callback when user requests manual adjustment
  onManualAdjustment?: (categoryGroupId: string) => void;
  // Callback when user navigates to category group details
  onViewCategoryGroup?: (categoryGroupId: string) => void;
}

/**
 * Inventory Alerts Widget for Dashboard
 * 
 * This widget displays a compact view of inventory alerts suitable for the dashboard.
 * It leverages the InventoryAlertsPanel component in widget mode to show critical
 * inventory issues that require immediate attention.
 */
const InventoryAlertsWidget: React.FC<InventoryAlertsWidgetProps> = ({
  maxAlertsInWidget = 5,
  onManualAdjustment,
  onViewCategoryGroup,
}) => {
  return (
    <InventoryAlertsPanel
      variant="widget"
      maxAlertsInWidget={maxAlertsInWidget}
      onManualAdjustment={onManualAdjustment}
      onViewCategoryGroup={onViewCategoryGroup}
    />
  );
};

export default InventoryAlertsWidget;
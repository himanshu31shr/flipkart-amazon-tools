export interface CategoryLink {
  categoryId: string; // Target category to deduct from
  isActive?: boolean; // Allow temporary disable without deletion
  createdAt?: Date | number | string | { toDate(): Date; toMillis(): number }; // When link was created
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  tag?: string; // Keep existing simple tag field for backward compatibility
  color?: string;
  categoryGroupId?: string; // Reference to CategoryGroup
  costPrice?: number; // Cost price for the category (used for inheritance)
  inventoryType?: 'weight' | 'qty'; // Inventory management type
  inventoryUnit?: 'kg' | 'g' | 'pcs'; // Unit of measurement
  unitConversionRate?: number; // Conversion rate for weight units (e.g., g to kg)
  inventoryDeductionQuantity?: number; // Quantity to deduct per product order for automatic inventory management
  linkedCategories?: CategoryLink[]; // Array of linked categories for cascade deductions
  createdAt?: Date | number | string | { toDate(): Date; toMillis(): number };
  updatedAt?: Date | number | string | { toDate(): Date; toMillis(): number };
}

export interface CategoryWithGroup extends Category {
  categoryGroup?: {
    id: string;
    name: string;
    color: string;
  };
} 
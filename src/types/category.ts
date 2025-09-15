export interface Category {
  id?: string;
  name: string;
  description?: string;
  tag?: string; // Keep existing simple tag field for backward compatibility
  color?: string;
  categoryGroupId?: string; // Reference to CategoryGroup
  costPrice?: number; // Cost price for the category (used for inheritance)
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
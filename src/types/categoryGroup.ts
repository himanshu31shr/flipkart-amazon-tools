import { Timestamp } from 'firebase/firestore';

export interface CategoryGroup {
  id?: string;
  name: string;
  description: string;
  color: string; // Hex color code (e.g., "#FF5722")
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CategoryGroupWithStats extends CategoryGroup {
  categoryCount: number;
}

export interface CategoryGroupFormData {
  name: string;
  description: string;
  color: string;
}

export interface CategoryGroupValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    description?: string;
    color?: string;
  };
}

export interface CategoryGroupAssociation {
  categoryId: string;
  categoryGroupId: string;
  associatedAt: Timestamp;
}

// Predefined color palette for category groups
export const CATEGORY_GROUP_COLORS = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFEB3B', // Yellow
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
] as const;

export type CategoryGroupColor = typeof CATEGORY_GROUP_COLORS[number];
import { Timestamp } from 'firebase/firestore';
import { Product } from '../services/product.service';
import { Category } from '../services/category.service';

/**
 * Escapes a value for safe CSV usage by handling quotes and special characters
 */
const escapeCSVValue = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Formats a Firebase Timestamp for CSV export
 */
const formatTimestamp = (timestamp: Timestamp | undefined): string => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.warn('Error formatting timestamp:', error);
    return '';
  }
};

/**
 * Exports product data to CSV format with comprehensive field coverage
 */
export const exportProductsToCSV = (products: Product[], categories: Category[] = []): void => {
  // Create a category lookup map for efficient name resolution
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
  
  // Define CSV headers
  const headers = [
    'SKU',
    'Name',
    'Description',
    'Platform',
    'Visibility',
    'Selling Price',
    'Category',
    'Listing Status',
    'MOQ',
    'Amazon Serial Number',
    'Flipkart Serial Number',
    'Created At',
    'Updated At',
    'Last Imported From',
    'Exists On Seller Page',
    'Competition Analysis'
  ];

  // Convert products to CSV rows
  const csvRows = products.map(product => [
    escapeCSVValue(product.sku),
    escapeCSVValue(product.name),
    escapeCSVValue(product.description),
    escapeCSVValue(product.platform),
    escapeCSVValue(product.visibility),
    escapeCSVValue(product.sellingPrice),
    escapeCSVValue(product.categoryId ? categoryMap.get(product.categoryId) || 'Unknown Category' : 'Uncategorized'),
    escapeCSVValue(product.metadata?.listingStatus),
    escapeCSVValue(product.metadata?.moq),
    escapeCSVValue(product.metadata?.amazonSerialNumber),
    escapeCSVValue(product.metadata?.flipkartSerialNumber),
    escapeCSVValue(product.metadata?.createdAt ? formatTimestamp(product.metadata.createdAt) : ''),
    escapeCSVValue(product.metadata?.updatedAt ? formatTimestamp(product.metadata.updatedAt) : ''),
    escapeCSVValue(product.metadata?.lastImportedFrom),
    escapeCSVValue(product.existsOnSellerPage !== undefined ? (product.existsOnSellerPage ? 'Yes' : 'No') : ''),
    escapeCSVValue(product.competitionAnalysis ? 
      `Competitor: ${product.competitionAnalysis.competitorName}, Price: ${product.competitionAnalysis.competitorPrice}, Total Sellers: ${product.competitionAnalysis.totalSellers}` : 
      ''
    )
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(','))
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  link.href = url;
  link.download = `products-export-${timestamp}.csv`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL object
  window.URL.revokeObjectURL(url);
};

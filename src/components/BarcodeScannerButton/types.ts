import { ScanningResult } from '../../types/barcode';

/**
 * Props interface for BarcodeScannerButton component
 */
export interface BarcodeScannerButtonProps {
  /** Optional CSS class name for styling customization */
  className?: string;
  /** Whether the scanner button should be disabled */
  disabled?: boolean;
  /** Callback fired when barcode scanning succeeds */
  onScanSuccess?: (result: ScanningResult) => void;
  /** Callback fired when barcode scanning encounters an error */
  onScanError?: (error: string) => void;
}

/**
 * Configuration options for navigation scanner modal
 * Extends base scanner options for product identification use case
 */
export interface NavigationScannerConfig {
  /** Enable product lookup functionality */
  enableProductLookup: true;
  /** Automatically navigate to product URL on successful scan */
  autoNavigate: true;
  /** Close scanner modal after successful navigation */
  closeOnSuccess: true;
  /** Priority platform when product has both Amazon and Flipkart listings */
  priorityPlatform: 'amazon' | 'flipkart';
}

/**
 * Extended scanning result for product navigation
 */
export interface ProductScanningResult extends ScanningResult {
  success: true;
  /** Product information when scan is successful */
  product?: {
    sku: string;
    name: string;
    platform: 'amazon' | 'flipkart';
    metadata?: {
      amazonSerialNumber?: string;
      flipkartSerialNumber?: string;
    };
  };
}
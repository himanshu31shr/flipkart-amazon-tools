import { Product } from './product.service';

/**
 * Service for handling product navigation to marketplace listings
 * Centralizes URL generation logic and external navigation for barcode scanner integration
 */
export class ProductNavigationService {
  /**
   * Generate marketplace URL for a product
   * Prioritizes Amazon if both serial numbers are available
   * @param product - Product with marketplace serial numbers
   * @returns Marketplace URL or null if no serial numbers available
   */
  generateProductUrl(product: Product): string | null {
    const { metadata } = product;
    
    // Prioritize Amazon listing if available
    if (metadata.amazonSerialNumber && metadata.amazonSerialNumber.trim() !== '') {
      return `https://www.amazon.in/sacred/dp/${metadata.amazonSerialNumber}`;
    }
    
    // Fall back to Flipkart listing if available
    if (metadata.flipkartSerialNumber && metadata.flipkartSerialNumber.trim() !== '') {
      return `https://www.flipkart.com/product/p/itme?pid=${metadata.flipkartSerialNumber}`;
    }
    
    // No marketplace serial numbers available
    return null;
  }

  /**
   * Open external marketplace URL in new tab
   * Uses secure target="_blank" with rel="noopener noreferrer"
   * @param url - Marketplace URL to open
   */
  openExternalUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    // Validate URL format for security
    if (!this.isValidMarketplaceUrl(url)) {
      throw new Error('Invalid marketplace URL format');
    }
    
    // Single, reliable method to open new tab
    try {
      // Use only Method 1: Standard window.open (most reliable)
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (newWindow) {
        // Focus the new window to ensure it's visible
        newWindow.focus();
        return;
      } else {
        throw new Error('Failed to open product page in new tab. Please check your browser popup settings and allow popups for this site.');
      }
      
    } catch {
      throw new Error('Failed to open product page in new tab. Please check your browser popup settings.');
    }
  }

  /**
   * Navigate to product marketplace listing
   * Combines URL generation and external navigation
   * @param product - Product to navigate to
   * @returns Promise that resolves when navigation is attempted
   * @throws Error if product has no marketplace listings or navigation fails
   */
  async navigateToProduct(product: Product): Promise<void> {
    if (!product) {
      throw new Error('Product is required for navigation');
    }

    const url = this.generateProductUrl(product);
    
    if (!url) {
      throw new Error('Product found but no marketplace listing available');
    }

    try {
      this.openExternalUrl(url);
    } catch (error) {
      throw new Error(`Failed to navigate to product listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get platform name for a product based on available serial numbers
   * Used for user feedback and logging
   * @param product - Product to check
   * @returns Platform name or 'unknown' if no serial numbers
   */
  getProductPlatform(product: Product): 'amazon' | 'flipkart' | 'unknown' {
    const { metadata } = product;
    
    // Prioritize Amazon (same logic as URL generation)
    if (metadata.amazonSerialNumber && metadata.amazonSerialNumber.trim() !== '') {
      return 'amazon';
    }
    
    if (metadata.flipkartSerialNumber && metadata.flipkartSerialNumber.trim() !== '') {
      return 'flipkart';
    }
    
    return 'unknown';
  }

  /**
   * Check if product has any marketplace serial numbers
   * Used for validation before attempting navigation
   * @param product - Product to check
   * @returns True if product has at least one marketplace serial number
   */
  hasMarketplaceListing(product: Product): boolean {
    const { metadata } = product;
    
    return !!(
      (metadata.amazonSerialNumber && metadata.amazonSerialNumber.trim() !== '') ||
      (metadata.flipkartSerialNumber && metadata.flipkartSerialNumber.trim() !== '')
    );
  }

  /**
   * Validate marketplace URL format for security
   * Ensures URL is from approved marketplace domains
   * @param url - URL to validate
   * @returns True if URL is from approved marketplace
   */
  private isValidMarketplaceUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Allow Amazon India domains
      if (hostname === 'www.amazon.in' || hostname === 'amazon.in') {
        return url.includes('/sacred/dp/');
      }
      
      // Allow Flipkart domains
      if (hostname === 'www.flipkart.com' || hostname === 'flipkart.com') {
        return url.includes('/product/p/itme?pid=');
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

// Export singleton instance for convenience
export const productNavigationService = new ProductNavigationService();
import { ProductNavigationService } from '../productNavigation.service';
import { Product } from '../product.service';

describe('ProductNavigationService', () => {
  let service: ProductNavigationService;
  let mockProduct: Product;
  let originalWindowOpen: typeof window.open;

  beforeEach(() => {
    service = new ProductNavigationService();
    
    // Mock product with both Amazon and Flipkart serial numbers
    mockProduct = {
      id: 'test-product-1',
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      description: 'Test product description',
      platform: 'amazon' as const,
      visibility: 'visible' as const,
      sellingPrice: 100,
      metadata: {
        amazonSerialNumber: 'B0123456789',
        flipkartSerialNumber: 'FLIP123456789',
      },
    };

    // Mock window.open
    originalWindowOpen = window.open;
    const mockWindow = { focus: jest.fn() };
    window.open = jest.fn().mockReturnValue(mockWindow);
  });

  afterEach(() => {
    // Restore window.open
    window.open = originalWindowOpen;
    jest.clearAllMocks();
  });

  describe('generateProductUrl', () => {
    it('should prioritize Amazon URL when both serial numbers are available', () => {
      const url = service.generateProductUrl(mockProduct);
      expect(url).toBe('https://www.amazon.in/sacred/dp/B0123456789');
    });

    it('should return Flipkart URL when only Flipkart serial number is available', () => {
      const productWithOnlyFlipkart = {
        ...mockProduct,
        metadata: {
          flipkartSerialNumber: 'FLIP123456789',
        },
      };
      
      const url = service.generateProductUrl(productWithOnlyFlipkart);
      expect(url).toBe('https://www.flipkart.com/product/p/itme?pid=FLIP123456789');
    });

    it('should return Amazon URL when only Amazon serial number is available', () => {
      const productWithOnlyAmazon = {
        ...mockProduct,
        metadata: {
          amazonSerialNumber: 'B0123456789',
        },
      };
      
      const url = service.generateProductUrl(productWithOnlyAmazon);
      expect(url).toBe('https://www.amazon.in/sacred/dp/B0123456789');
    });

    it('should return null when no serial numbers are available', () => {
      const productWithoutSerials = {
        ...mockProduct,
        metadata: {},
      };
      
      const url = service.generateProductUrl(productWithoutSerials);
      expect(url).toBeNull();
    });

    it('should return null when serial numbers are empty strings', () => {
      const productWithEmptySerials = {
        ...mockProduct,
        metadata: {
          amazonSerialNumber: '',
          flipkartSerialNumber: '   ',
        },
      };
      
      const url = service.generateProductUrl(productWithEmptySerials);
      expect(url).toBeNull();
    });
  });

  describe('openExternalUrl', () => {
    it('should open valid Amazon URL in new tab', () => {
      const amazonUrl = 'https://www.amazon.in/sacred/dp/B0123456789';
      
      service.openExternalUrl(amazonUrl);
      
      expect(window.open).toHaveBeenCalledWith(amazonUrl, '_blank', 'noopener,noreferrer');
    });

    it('should open valid Flipkart URL in new tab', () => {
      const flipkartUrl = 'https://www.flipkart.com/product/p/itme?pid=FLIP123456789';
      
      service.openExternalUrl(flipkartUrl);
      
      expect(window.open).toHaveBeenCalledWith(flipkartUrl, '_blank', 'noopener,noreferrer');
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        service.openExternalUrl('invalid-url');
      }).toThrow('Invalid marketplace URL format');
    });

    it('should throw error for non-marketplace URL', () => {
      expect(() => {
        service.openExternalUrl('https://evil-site.com/malicious');
      }).toThrow('Invalid marketplace URL format');
    });

    it('should throw error for empty URL', () => {
      expect(() => {
        service.openExternalUrl('');
      }).toThrow('Invalid URL provided');
    });

    it('should throw error when window.open is blocked (returns null)', () => {
      // Mock window.open to return null (popup blocked)
      window.open = jest.fn().mockReturnValue(null);
      
      expect(() => {
        service.openExternalUrl('https://www.amazon.in/sacred/dp/B0123456789');
      }).toThrow('Failed to open product page in new tab. Please check your browser popup settings.');
    });
  });

  describe('navigateToProduct', () => {
    it('should successfully navigate to product with marketplace listing', async () => {
      await service.navigateToProduct(mockProduct);
      
      expect(window.open).toHaveBeenCalledWith(
        'https://www.amazon.in/sacred/dp/B0123456789',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should throw error when product has no marketplace listings', async () => {
      const productWithoutListings = {
        ...mockProduct,
        metadata: {},
      };

      await expect(service.navigateToProduct(productWithoutListings))
        .rejects.toThrow('Product found but no marketplace listing available');
    });

    it('should throw error when product is null', async () => {
      await expect(service.navigateToProduct(null as any))
        .rejects.toThrow('Product is required for navigation');
    });
  });

  describe('getProductPlatform', () => {
    it('should return amazon when both platforms available (priority)', () => {
      const platform = service.getProductPlatform(mockProduct);
      expect(platform).toBe('amazon');
    });

    it('should return flipkart when only Flipkart serial available', () => {
      const productWithOnlyFlipkart = {
        ...mockProduct,
        metadata: {
          flipkartSerialNumber: 'FLIP123456789',
        },
      };
      
      const platform = service.getProductPlatform(productWithOnlyFlipkart);
      expect(platform).toBe('flipkart');
    });

    it('should return amazon when only Amazon serial available', () => {
      const productWithOnlyAmazon = {
        ...mockProduct,
        metadata: {
          amazonSerialNumber: 'B0123456789',
        },
      };
      
      const platform = service.getProductPlatform(productWithOnlyAmazon);
      expect(platform).toBe('amazon');
    });

    it('should return unknown when no serials available', () => {
      const productWithoutSerials = {
        ...mockProduct,
        metadata: {},
      };
      
      const platform = service.getProductPlatform(productWithoutSerials);
      expect(platform).toBe('unknown');
    });
  });

  describe('hasMarketplaceListing', () => {
    it('should return true when product has Amazon serial', () => {
      const productWithAmazon = {
        ...mockProduct,
        metadata: {
          amazonSerialNumber: 'B0123456789',
        },
      };
      
      expect(service.hasMarketplaceListing(productWithAmazon)).toBe(true);
    });

    it('should return true when product has Flipkart serial', () => {
      const productWithFlipkart = {
        ...mockProduct,
        metadata: {
          flipkartSerialNumber: 'FLIP123456789',
        },
      };
      
      expect(service.hasMarketplaceListing(productWithFlipkart)).toBe(true);
    });

    it('should return true when product has both serials', () => {
      expect(service.hasMarketplaceListing(mockProduct)).toBe(true);
    });

    it('should return false when product has no serials', () => {
      const productWithoutSerials = {
        ...mockProduct,
        metadata: {},
      };
      
      expect(service.hasMarketplaceListing(productWithoutSerials)).toBe(false);
    });

    it('should return false when product has empty serials', () => {
      const productWithEmptySerials = {
        ...mockProduct,
        metadata: {
          amazonSerialNumber: '',
          flipkartSerialNumber: '   ',
        },
      };
      
      expect(service.hasMarketplaceListing(productWithEmptySerials)).toBe(false);
    });
  });
});
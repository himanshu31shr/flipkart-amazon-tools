import { CostPriceResolutionService } from '../costPrice.service';
import { where } from 'firebase/firestore';
import { FirebaseService } from '../firebase.service';

// Mock implementation of FirebaseService methods
const mockGetDocument = jest.fn();
const mockGetDocuments = jest.fn();
const mockUpdateDocument = jest.fn();
const mockBatchOperation = jest.fn();

// Mock the FirebaseService
jest.mock('../firebase.service', () => {
  return {
    FirebaseService: jest.fn().mockImplementation(function(this: FirebaseService) {
      this.getDocument = mockGetDocument;
      this.getDocuments = mockGetDocuments;
      this.updateDocument = mockUpdateDocument;
      this.batchOperation = mockBatchOperation;
      return this;
    })
  };
});

describe('CostPriceResolutionService', () => {
  let service: CostPriceResolutionService;
  const DEFAULT_COST_PRICE = 0;
  const categoryId = 'test-category';
  const productSku = 'test-product';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CostPriceResolutionService();
  });

  describe('getProductCostPrice', () => {
    it('should return product custom cost price when set', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([{
        sku: productSku,
        categoryId,
        customCostPrice: 100
      }]);
      mockGetDocument.mockResolvedValue({
        id: categoryId,
        costPrice: 50
      });

      // Act
      const result = await service.getProductCostPrice(productSku);

      // Assert
      expect(result).toEqual({
        value: 100,
        source: 'product',
        categoryId,
        sku: productSku
      });
      expect(mockGetDocuments).toHaveBeenCalledWith(
        'products',
        [where('sku', '==', productSku)]
      );
    });

    it('should inherit category cost price when product has no custom price', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([{
        sku: productSku,
        categoryId,
        customCostPrice: null
      }]);
      mockGetDocument.mockResolvedValue({
        id: categoryId,
        costPrice: 50
      });

      // Act
      const result = await service.getProductCostPrice(productSku);

      // Assert
      expect(result).toEqual({
        value: 50,
        source: 'category',
        categoryId,
        sku: productSku
      });
      expect(mockGetDocuments).toHaveBeenCalledWith(
        'products',
        [where('sku', '==', productSku)]
      );
    });

    it('should use default price when neither product nor category has price', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([{
        sku: productSku,
        categoryId,
        customCostPrice: null
      }]);
      mockGetDocument.mockResolvedValue({
        id: categoryId,
        costPrice: null
      });

      // Act
      const result = await service.getProductCostPrice(productSku);

      // Assert
      expect(result).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId,
        sku: productSku
      });
    });

    it('should return default resolution when product not found', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([]);

      // Act & Assert
      const result = await service.getProductCostPrice('non-existent');
      expect(result).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId: null,
        sku: 'non-existent'
      });
      expect(mockGetDocuments).toHaveBeenCalledTimes(1);
    });

    it('should return default resolution when category not found', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([{
        sku: productSku,
        categoryId,
        customCostPrice: null
      }]);
      mockGetDocument.mockResolvedValue(null);

      // Act & Assert
      const result = await service.getProductCostPrice(productSku);
      expect(result).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId: null,
        sku: productSku
      });
      expect(mockGetDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCategoryCostPrice', () => {
    it('should return category cost price when set', async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        id: categoryId,
        costPrice: 50
      });

      // Act
      const result = await service.getCategoryCostPrice(categoryId);

      // Assert
      expect(result).toEqual({
        value: 50,
        source: 'category',
        categoryId,
        sku: ""
      });
      expect(mockGetDocument).toHaveBeenCalledWith('categories', categoryId);
    });

    it('should return default price when category has no price', async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        id: categoryId,
        costPrice: null
      });

      // Act
      const result = await service.getCategoryCostPrice(categoryId);

      // Assert
      expect(result).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId,
        sku: ""
      });
    });

    it('should throw error when category not found', async () => {
      // Arrange
      mockGetDocument.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCategoryCostPrice('non-existent'))
        .rejects
        .toThrow('Category not found: non-existent');
      expect(mockGetDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateCategoryCostPrice', () => {
    it('should update category cost price and log affected products', async () => {
      // Arrange
      mockUpdateDocument.mockResolvedValue(undefined);
      mockGetDocuments.mockResolvedValue([
        { sku: 'product-1', categoryId, customCostPrice: null },
        { sku: 'product-2', categoryId, customCostPrice: null }
      ]);

      // Act
      await service.updateCategoryCostPrice(categoryId, 75);

      // Assert
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        'categories',
        categoryId,
        { costPrice: 75 }
      );
    });

    it('should handle update with null price', async () => {
      // Arrange
      mockUpdateDocument.mockResolvedValue(undefined);
      mockGetDocuments.mockResolvedValue([]);

      // Act
      await service.updateCategoryCostPrice(categoryId, null);

      // Assert
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        'categories',
        categoryId,
        { costPrice: null }
      );
    });
  });

  describe('migrateProductCostPrices', () => {
    it('should calculate average price and update category and products', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([
        { sku: 'product-1', categoryId, customCostPrice: 100 },
        { sku: 'product-2', categoryId, customCostPrice: 200 }
      ]);
      mockUpdateDocument.mockResolvedValue(undefined);
      mockBatchOperation.mockResolvedValue(undefined);

      // Act
      await service.migrateProductCostPrices(categoryId);

      // Assert
      expect(mockGetDocuments).toHaveBeenCalledWith(
        'products',
        [where('categoryId', '==', categoryId)]
      );
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        'categories',
        categoryId,
        { costPrice: 150 }
      );
      expect(mockBatchOperation).toHaveBeenCalledWith(
        [
          { sku: 'product-1', categoryId, customCostPrice: null },
          { sku: 'product-2', categoryId, customCostPrice: null }
        ],
        'products',
        'update',
        expect.any(Function)
      );
    });

    it('should skip migration when no products found', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([]);

      // Act
      await service.migrateProductCostPrices(categoryId);

      // Assert
      expect(mockUpdateDocument).not.toHaveBeenCalled();
      expect(mockBatchOperation).not.toHaveBeenCalled();
    });

    it('should skip migration when no valid prices found', async () => {
      // Arrange
      mockGetDocuments.mockResolvedValue([
        { sku: 'product-1', categoryId, customCostPrice: null },
        { sku: 'product-2', categoryId, customCostPrice: null }
      ]);

      // Act
      await service.migrateProductCostPrices(categoryId);

      // Assert
      expect(mockUpdateDocument).not.toHaveBeenCalled();
      expect(mockBatchOperation).not.toHaveBeenCalled();
    });
  });

  describe('getProductsInheritingCost', () => {
    it('should return products inheriting cost price', async () => {
      // Arrange
      const products = [
        { sku: 'product-1', categoryId, customCostPrice: null },
        { sku: 'product-2', categoryId, customCostPrice: null }
      ];
      mockGetDocuments.mockResolvedValue(products);

      // Act
      const result = await service.getProductsInheritingCost(categoryId);

      // Assert
      expect(result).toEqual(products);
      expect(mockGetDocuments).toHaveBeenCalledWith(
        'products',
        [
          where('categoryId', '==', categoryId),
          where('customCostPrice', '==', null)
        ]
      );
    });
  });

  describe('initializeCostPrices', () => {
    it('should initialize cost prices for multiple products', async () => {
      // Arrange
      const products = [
        { sku: 'product-1', categoryId: 'category-1', customCostPrice: 100 },
        { sku: 'product-2', categoryId: 'category-1', customCostPrice: null },
        { sku: 'product-3', categoryId: 'category-2', customCostPrice: null }
      ];
      
      mockGetDocument
        .mockResolvedValueOnce({ id: 'category-1', costPrice: 50 })
        .mockResolvedValueOnce({ id: 'category-2', costPrice: 75 });

      // Act
      const result = await service.initializeCostPrices(products);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get('product-1')).toEqual({
        value: 100,
        source: 'product',
        categoryId: 'category-1',
        sku: 'product-1'
      });
      expect(result.get('product-2')).toEqual({
        value: 50,
        source: 'category',
        categoryId: 'category-1',
        sku: 'product-2'
      });
      expect(result.get('product-3')).toEqual({
        value: 75,
        source: 'category',
        categoryId: 'category-2',
        sku: 'product-3'
      });
    });

    it('should handle products with missing categories', async () => {
      // Arrange
      const products = [
        { sku: 'product-1', customCostPrice: 100 },
        { sku: 'product-2', categoryId: undefined, customCostPrice: null }
      ];

      // Act
      const result = await service.initializeCostPrices(products);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('product-1')).toEqual({
        value: 100,
        source: 'product',
        categoryId: null,
        sku: 'product-1'
      });
      expect(result.get('product-2')).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId: null,
        sku: 'product-2'
      });
    });

    it('should handle missing category documents', async () => {
      // Arrange
      const products = [
        { sku: 'product-1', categoryId: 'category-1', customCostPrice: null },
        { sku: 'product-2', categoryId: 'category-2', customCostPrice: null }
      ];
      
      mockGetDocument
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'category-2', costPrice: 75 });

      // Act
      const result = await service.initializeCostPrices(products);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('product-1')).toEqual({
        value: DEFAULT_COST_PRICE,
        source: 'default',
        categoryId: 'category-1',
        sku: 'product-1'
      });
      expect(result.get('product-2')).toEqual({
        value: 75,
        source: 'category',
        categoryId: 'category-2',
        sku: 'product-2'
      });
    });
  });
}); 
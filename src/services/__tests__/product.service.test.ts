/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProductService, Product, ProductFilter } from '../product.service';
import { Timestamp } from 'firebase/firestore';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('papaparse');
jest.mock('xlsx');
jest.mock('../firebase.service');
jest.mock('../firebase.config', () => ({ db: {} }));

// Mock Firebase Timestamp
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
  orderBy: jest.fn(),
  where: jest.fn(),
}));

describe('ProductService', () => {
  let service: ProductService;
  let mockPapaParse: jest.MockedFunction<typeof Papa.parse>;
  let mockXLSXRead: jest.MockedFunction<typeof XLSX.read>;
  let mockXLSXUtils: jest.Mocked<typeof XLSX.utils>;

  const mockAmazonData = [
    {
      'seller-sku': 'TEST-SKU-1',
      'item-name': 'Test Product 1',
      'item-description': 'Test description 1',
      'price': '100',
      'quantity': '10',
      'asin1': 'B123456789',
    },
    {
      'seller-sku': 'TEST-SKU-2',
      'item-name': 'Test Product 2',
      'item-description': 'Test description 2',
      'price': '200',
      'quantity': '5',
      'asin1': 'B987654321',
    },
  ];

  const mockFlipkartData = [
    {
      'Seller SKU Id': 'TEST-SKU-3',
      'Product Title': 'Test Product 3',
      'Listing Status': 'Active',
      'Your Selling Price': '150',
      'Minimum Order Quantity': '1',
      'Flipkart Serial Number': 'FK123456',
    },
  ];

  // Helper to get a fresh mockProduct
  function getMockProduct(): Product {
    return {
      sku: 'TEST-SKU-1',
      name: 'Test Product',
      description: 'Test description',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 100,
      metadata: {
        createdAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
        updatedAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
        listingStatus: 'active',
        moq: '1',
        amazonSerialNumber: 'B123456789',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockPapaParse = Papa.parse as jest.MockedFunction<typeof Papa.parse>;
    mockXLSXRead = XLSX.read as jest.MockedFunction<typeof XLSX.read>;
    mockXLSXUtils = XLSX.utils as jest.Mocked<typeof XLSX.utils>;

    // Mock Firebase service methods
    service = new ProductService();
    
    // Mock protected methods from FirebaseService
    jest.spyOn(service as any, 'getDocuments').mockResolvedValue([]);
    jest.spyOn(service as any, 'getDocument').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'setDocument').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'updateDocument').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'deleteDocument').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'batchOperation').mockResolvedValue(undefined);
  });

  describe('parseProducts', () => {
    it('should parse Amazon CSV file', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      (mockPapaParse as any).mockImplementation((file: any, options: any) => {
        if (options?.complete) {
          // Simulate async behavior
          setTimeout(() => {
            options.complete({ data: mockAmazonData });
          }, 0);
        }
      });

      const result = await service.parseProducts(mockFile);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sku: 'TEST-SKU-1',
        name: 'Test Product 1',
        platform: 'amazon',
        sellingPrice: 100,
      });
    });

    it('should parse Flipkart Excel file', async () => {
      const mockFile = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      };

      mockXLSXRead.mockReturnValue(mockWorkbook as any);
      // XLSX.utils.sheet_to_json already processes headers correctly, so return just the data
      mockXLSXUtils.sheet_to_json.mockReturnValue(mockFlipkartData as any);

      // Mock arrayBuffer method
      Object.defineProperty(mockFile, 'arrayBuffer', {
        value: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
        writable: true
      });

      const result = await service.parseProducts(mockFile);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        sku: 'TEST-SKU-3',
        name: 'Test Product 3',
        description: 'Test Product 3', // Now uses Product Title for both name and description
        platform: 'flipkart',
        sellingPrice: 150,
      });
    });

    it('should throw error for unsupported file format', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(service.parseProducts(mockFile)).rejects.toThrow('Unsupported file format');
    });


    it('should handle Papa parse errors', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      (mockPapaParse as any).mockImplementation((file: any, options: any) => {
        if (options?.error) {
          setTimeout(() => {
            options.error(new Error('Parse error'));
          }, 0);
        }
      });

      await expect(service.parseProducts(mockFile)).rejects.toThrow('Parse error');
    });
  });

  describe('saveProducts', () => {
    it('should save products using batch operation', async () => {
      const products = [getMockProduct()];
      const batchSpy = jest.spyOn(service as any, 'batchOperation');

      await service.saveProducts(products);

      expect(batchSpy).toHaveBeenCalledWith(
        products,
        'products',
        'create',
        expect.any(Function)
      );
    });
  });

  describe('saveOrUpdateProducts', () => {
    let getDocumentsSpy: jest.SpyInstance;
    let batchOperationSpy: jest.SpyInstance;
    let updateDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      getDocumentsSpy = jest.spyOn(service as any, 'getDocuments');
      batchOperationSpy = jest.spyOn(service as any, 'batchOperation').mockResolvedValue(undefined);
      updateDocumentSpy = jest.spyOn(service as any, 'updateDocument').mockResolvedValue(undefined);
    });

    it('should create new products when updateExisting is false', async () => {
      const newProducts = [getMockProduct()];
      getDocumentsSpy.mockResolvedValue([]); // No existing products

      const result = await service.saveOrUpdateProducts(newProducts, false);

      expect(batchOperationSpy).toHaveBeenCalledTimes(1);
      expect(batchOperationSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...newProducts[0],
            metadata: expect.objectContaining({
              ...newProducts[0].metadata,
              lastImportedFrom: 'Amazon Import',
              createdAt: expect.any(Object),
              updatedAt: expect.any(Object)
            })
          })
        ]),
        'products',
        'create',
        expect.any(Function)
      );
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it('should create new products when updateExisting is true but no existing products found', async () => {
      const newProducts = [getMockProduct()];
      getDocumentsSpy.mockResolvedValue([]); // No existing products

      const result = await service.saveOrUpdateProducts(newProducts, true);

      expect(batchOperationSpy).toHaveBeenCalledTimes(1);
      expect(batchOperationSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...newProducts[0],
            metadata: expect.objectContaining({
              ...newProducts[0].metadata,
              lastImportedFrom: 'Amazon Import',
              createdAt: expect.any(Object),
              updatedAt: expect.any(Object)
            })
          })
        ]),
        'products',
        'create',
        expect.any(Function)
      );
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it('should only create new products when updateExisting is false and existing products exist', async () => {
      const existingProduct = getMockProduct();
      const newProduct = { ...getMockProduct(), sku: 'NEW-SKU' };
      const products = [existingProduct, newProduct];
      
      getDocumentsSpy.mockResolvedValue([existingProduct]); // One existing product

      const result = await service.saveOrUpdateProducts(products, false);

      expect(batchOperationSpy).toHaveBeenCalledTimes(1);
      expect(batchOperationSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...newProduct,
            metadata: expect.objectContaining({
              lastImportedFrom: 'Amazon Import',
              createdAt: expect.any(Object),
              updatedAt: expect.any(Object)
            })
          })
        ]), // Only the new product
        'products',
        'create',
        expect.any(Function)
      );
      expect(result).toEqual({ created: 1, updated: 0 });
    });

    it('should create new and update existing products when updateExisting is true', async () => {
      const existingProduct = getMockProduct();
      const newProduct = { ...getMockProduct(), sku: 'NEW-SKU' };
      const updatedExistingProduct = {
        ...existingProduct,
        sellingPrice: 150, // Changed price
        metadata: {
          ...existingProduct.metadata,
          listingStatus: 'updated' as const
        }
      };
      const products = [updatedExistingProduct, newProduct];
      
      getDocumentsSpy.mockResolvedValue([existingProduct]); // One existing product

      const result = await service.saveOrUpdateProducts(products, true);

      expect(batchOperationSpy).toHaveBeenCalledTimes(1);
      
      // Check create operation for new product
      expect(batchOperationSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            ...newProduct,
            metadata: expect.objectContaining({
              lastImportedFrom: 'Amazon Import',
              createdAt: expect.any(Object),
              updatedAt: expect.any(Object)
            })
          })
        ]),
        'products',
        'create',
        expect.any(Function)
      );
      
      // Check update operation for existing product uses updateDocument
      expect(updateDocumentSpy).toHaveBeenCalledWith(
        'products',
        existingProduct.sku,
        expect.objectContaining({
          sellingPrice: 150,
          metadata: expect.objectContaining({
            listingStatus: 'updated',
            updatedAt: expect.any(Object),
            lastImportedFrom: 'Amazon Import'
          })
        })
      );
      
      expect(result).toEqual({ created: 1, updated: 1 });
    });

    it('should preserve user customizations during updates', async () => {
      const existingProduct = {
        ...getMockProduct(),
        customCostPrice: 75, // User-set cost price
        categoryId: 'USER-CATEGORY', // User-assigned category
        visibility: 'hidden' as const, // User-set visibility
        description: 'User customized description' // User customization
      };
      
      const importedProduct = {
        ...existingProduct,
        sellingPrice: 200, // Import data
        customCostPrice: 100, // Should be ignored
        categoryId: 'IMPORT-CATEGORY', // Should be ignored
        visibility: 'visible' as const, // Should be ignored
        description: 'Import description', // Should be ignored
        metadata: {
          ...existingProduct.metadata,
          listingStatus: 'active' as const,
          moq: '5'
        }
      };
      
      getDocumentsSpy.mockResolvedValue([existingProduct]);

      const result = await service.saveOrUpdateProducts([importedProduct], true);

      expect(updateDocumentSpy).toHaveBeenCalledWith(
        'products',
        existingProduct.sku,
        expect.objectContaining({
          sellingPrice: 200, // Updated from import
          metadata: expect.objectContaining({
            listingStatus: 'active', // Updated from import
            moq: '5', // Updated from import
            updatedAt: expect.any(Object), // Timestamp updated
            lastImportedFrom: 'Amazon Import'
          })
          // customCostPrice, categoryId, visibility, description should NOT be in update data
        })
      );
      
      expect(result).toEqual({ created: 0, updated: 1 });
    });

    it('should handle mixed scenarios with multiple products', async () => {
      const existingProduct1 = getMockProduct();
      const existingProduct2 = { ...getMockProduct(), sku: 'EXISTING-2' };
      const newProduct1 = { ...getMockProduct(), sku: 'NEW-1' };
      const newProduct2 = { ...getMockProduct(), sku: 'NEW-2' };
      
      const importProducts = [
        { ...existingProduct1, sellingPrice: 300 }, // Update existing
        { ...existingProduct2, sellingPrice: 400 }, // Update existing  
        newProduct1, // Create new
        newProduct2  // Create new
      ];
      
      getDocumentsSpy.mockResolvedValue([existingProduct1, existingProduct2]);

      const result = await service.saveOrUpdateProducts(importProducts, true);

      expect(batchOperationSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ created: 2, updated: 2 });
    });

    it('should handle empty product list', async () => {
      const result = await service.saveOrUpdateProducts([], true);

      expect(batchOperationSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ created: 0, updated: 0 });
    });

    it('should handle errors gracefully', async () => {
      const products = [getMockProduct()];
      getDocumentsSpy.mockRejectedValue(new Error('Database error'));

      await expect(service.saveOrUpdateProducts(products, true))
        .rejects.toThrow('Database error');
    });

    it('should update platform-specific serial numbers correctly', async () => {
      const existingAmazonProduct = {
        ...getMockProduct(),
        platform: 'amazon' as const
      };
      
      const importedAmazonProduct = {
        ...existingAmazonProduct,
        metadata: {
          ...existingAmazonProduct.metadata,
          amazonSerialNumber: 'NEW-AMAZON-123'
        }
      };
      
      getDocumentsSpy.mockResolvedValue([existingAmazonProduct]);

      await service.saveOrUpdateProducts([importedAmazonProduct], true);

      expect(updateDocumentSpy).toHaveBeenCalledWith(
        'products',
        existingAmazonProduct.sku,
        expect.objectContaining({
          metadata: expect.objectContaining({
            amazonSerialNumber: 'NEW-AMAZON-123'
          })
        })
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product with timestamp', async () => {
      const updateData = { name: 'Updated Product' };
      const updateSpy = jest.spyOn(service as any, 'updateDocument').mockResolvedValue(undefined);

      await service.updateProduct('TEST-SKU-1', updateData);

      expect(updateSpy).toHaveBeenCalledWith('products', 'TEST-SKU-1', {
        name: 'Updated Product',
      });
    });
  });

  describe('getProducts', () => {
    beforeEach(() => {
      // Reset mock before each test
      jest.spyOn(service as any, 'getDocuments').mockClear();
    });

    it('should return all products when no filters provided', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const result = await service.getProducts();

      expect(result).toEqual(mockProducts);
      expect(service['getDocuments']).toHaveBeenCalledWith('products', []);
    });

    it('should filter products by platform', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const filters: ProductFilter = { platform: 'amazon' };
      await service.getProducts(filters);

      expect(service['getDocuments']).toHaveBeenCalledWith('products', [
        expect.objectContaining({}) // where clause for platform
      ]);
    });

    it('should filter products by visibility', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const filters: ProductFilter = { visibility: 'visible' };
      await service.getProducts(filters);

      expect(service['getDocuments']).toHaveBeenCalledWith('products', [
        expect.objectContaining({}) // where clause for visibility
      ]);
    });

    it('should filter products by categoryId', async () => {
      const mockProducts = [
        { ...getMockProduct(), categoryId: 'electronics' },
        { ...getMockProduct(), sku: 'TEST-SKU-2', categoryId: 'books' }
      ];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue([mockProducts[0]]);

      const filters: ProductFilter = { categoryId: 'electronics' };
      const result = await service.getProducts(filters);

      expect(service['getDocuments']).toHaveBeenCalledWith('products', [
        expect.objectContaining({}) // where clause for categoryId
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].categoryId).toBe('electronics');
    });

    it('should filter products by search term', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const filters: ProductFilter = { search: 'Test' };
      await service.getProducts(filters);

      expect(service['getDocuments']).toHaveBeenCalledWith('products', [
        expect.objectContaining({}), // where clause for search >= 
        expect.objectContaining({}) // where clause for search <=
      ]);
    });

    it('should combine multiple filters', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const filters: ProductFilter = { 
        platform: 'amazon', 
        categoryId: 'electronics',
        visibility: 'visible'
      };
      await service.getProducts(filters);

      expect(service['getDocuments']).toHaveBeenCalledWith('products', [
        expect.objectContaining({}), // platform
        expect.objectContaining({}), // visibility
        expect.objectContaining({}) // categoryId
      ]);
    });

    it('should handle empty category filter', async () => {
      const mockProducts = [getMockProduct()];
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue(mockProducts);

      const filters: ProductFilter = { categoryId: '' };
      await service.getProducts(filters);

      // Should not add categoryId filter for empty string
      expect(service['getDocuments']).toHaveBeenCalledWith('products', []);
    });

    it('should preserve original SKU when no document ID', async () => {
      const mockProduct = getMockProduct();
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue([mockProduct]);

      const result = await service.getProducts();

      expect(result[0].sku).toBe(mockProduct.sku);
    });
  });

  describe('getProductDetails', () => {
    it('should get product by SKU', async () => {
      jest.spyOn(service as any, 'getDocument').mockResolvedValue(getMockProduct());

      const result = await service.getProductDetails('TEST-SKU-1');

      expect(result).toEqual(getMockProduct());
      expect(service['getDocument']).toHaveBeenCalledWith('products', 'TEST-SKU-1');
    });

    it('should throw error if product not found', async () => {
      jest.spyOn(service as any, 'getDocument').mockResolvedValue(undefined);

      await expect(service.getProductDetails('NON-EXISTENT')).rejects.toThrow(
        'Product with SKU NON-EXISTENT not found'
      );
    });
  });





  describe('deleteProduct', () => {
    it('should delete product by SKU', async () => {
      const deleteSpy = jest.spyOn(service as any, 'deleteDocument');

      await service.deleteProduct('TEST-SKU-1');

      expect(deleteSpy).toHaveBeenCalledWith('products', 'TEST-SKU-1');
    });
  });

  describe('mapTransactionToProduct', () => {
    it('should map transaction to product', async () => {
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue([getMockProduct()]);

      const result = await service.mapTransactionToProduct('TEST-SKU-1');

      expect(result).toEqual(getMockProduct());
    });

    it('should return null if product not found for transaction mapping', async () => {
      jest.spyOn(service as any, 'getDocuments').mockResolvedValue([]);

      const result = await service.mapTransactionToProduct('NON-EXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('file format detection', () => {
    it('should detect Amazon format (text/plain)', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      expect(service['isAmazonFormat'](file)).toBe(true);
    });

    it('should detect Flipkart format (Excel)', () => {
      const file1 = new File(['test'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const file2 = new File(['test'], 'test.xls', { 
        type: 'application/vnd.ms-excel' 
      });
      
      expect(service['isFlipkartFormat'](file1)).toBe(true);
      expect(service['isFlipkartFormat'](file2)).toBe(true);
    });
  });
}); 
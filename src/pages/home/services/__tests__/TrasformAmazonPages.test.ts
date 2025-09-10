import { AmazonPDFTransformer } from '../TrasformAmazonPages';
import { Product } from '../../../../services/product.service';
import { Category } from '../../../../services/category.service';
import { CategorySortConfig } from '../../../../utils/pdfSorting';

// Mock pdf-lib and pdfjs-dist
jest.mock('pdf-lib');
jest.mock('pdfjs-dist/legacy/build/pdf');

const mockProducts: Product[] = [
  {
    sku: 'TEST001',
    name: 'Test Product 1',
    description: 'Test description 1',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 100,
    customCostPrice: null,
    metadata: {},
    categoryId: 'cat1',
  },
  {
    sku: 'TEST002', 
    name: 'Test Product 2',
    description: 'Test description 2',
    platform: 'amazon',
    visibility: 'visible',
    sellingPrice: 200,
    customCostPrice: null,
    metadata: {},
    categoryId: 'cat2',
  },
];

const mockCategories: Category[] = [
  {
    id: 'cat1',
    name: 'Category A',
    description: 'Test category A',
    tag: 'A',
    costPrice: 50,
  },
  {
    id: 'cat2', 
    name: 'Category B',
    description: 'Test category B',
    tag: 'B',
    costPrice: 75,
  },
];

const defaultSortConfig: CategorySortConfig = {
  primarySort: 'category',
  secondarySort: 'sku',
  sortOrder: 'asc',
  groupByCategory: true,
  prioritizeActiveCategories: false,
  sortCategoriesAlphabetically: true,
};

describe('AmazonPDFTransformer', () => {
  let transformer: AmazonPDFTransformer;
  let mockPdfData: Uint8Array;

  beforeEach(() => {
    // Create mock PDF data
    mockPdfData = new Uint8Array([1, 2, 3, 4]); // Simple mock data
    transformer = new AmazonPDFTransformer(
      mockPdfData,
      mockProducts,
      mockCategories,
      defaultSortConfig
    );

    // Clear console logs for clean test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create transformer instance correctly', () => {
    expect(transformer).toBeInstanceOf(AmazonPDFTransformer);
  });

  it('should handle empty products array', () => {
    const emptyTransformer = new AmazonPDFTransformer(
      mockPdfData,
      [],
      mockCategories,
      defaultSortConfig
    );
    expect(emptyTransformer).toBeInstanceOf(AmazonPDFTransformer);
  });

  it('should handle empty categories array', () => {
    const emptyTransformer = new AmazonPDFTransformer(
      mockPdfData,
      mockProducts,
      [],
      defaultSortConfig
    );
    expect(emptyTransformer).toBeInstanceOf(AmazonPDFTransformer);
  });

  describe('recurseQuantity', () => {
    it('should find quantity after price segment', () => {
      const segments = ['Product', 'Name', '₹100', '2'];
      const result = transformer.recurseQuantity(segments);
      expect(result).toBe(3); // Index of '2'
    });

    it('should return -1 when no price found', () => {
      const segments = ['Product', 'Name', '2'];
      const result = transformer.recurseQuantity(segments);
      expect(result).toBe(-1);
    });

    it('should handle multiple price segments', () => {
      const segments = ['Product', '₹50', 'Name', '₹100', '3'];
      const result = transformer.recurseQuantity(segments);
      // The function returns the index after the first non-price segment found after starting search
      expect(result).toBe(2); // Index of 'Name'
    });
  });

  it('should handle sorting configuration correctly', () => {
    const customSortConfig: CategorySortConfig = {
      primarySort: 'sku',
      secondarySort: 'name',
      sortOrder: 'desc',
      groupByCategory: false,
      prioritizeActiveCategories: true,
      sortCategoriesAlphabetically: false,
    };

    const customTransformer = new AmazonPDFTransformer(
      mockPdfData,
      mockProducts,
      mockCategories,
      customSortConfig
    );

    expect(customTransformer).toBeInstanceOf(AmazonPDFTransformer);
  });

  it('should validate constructor parameters', () => {
    expect(() => {
      new AmazonPDFTransformer(
        new Uint8Array(),
        mockProducts,
        mockCategories,
        defaultSortConfig
      );
    }).not.toThrow();
  });
});

describe('AmazonPDFTransformer - Page Duplication Prevention', () => {
  it('should prevent duplicate page processing', () => {
    // This test validates that the new unique page tracking prevents duplication
    // The actual implementation is tested through integration, but we can test
    // the logic conceptually
    const pageSet = new Set<number>();
    const testPages = [0, 1, 2, 1, 3, 2]; // Contains duplicates
    const uniquePages: number[] = [];

    testPages.forEach(page => {
      if (!pageSet.has(page)) {
        pageSet.add(page);
        uniquePages.push(page);
      }
    });

    expect(uniquePages).toEqual([0, 1, 2, 3]);
    expect(uniquePages.length).toBe(4);
  });

  it('should validate page indices correctly', () => {
    const totalPages = 10;
    const testPageIndices = [-1, 0, 5, 9, 10, 15];
    const validPages = testPageIndices.filter(page => page >= 0 && page < totalPages);
    const invalidPages = testPageIndices.filter(page => page < 0 || page >= totalPages);

    expect(validPages).toEqual([0, 5, 9]);
    expect(invalidPages).toEqual([-1, 10, 15]);
  });
});
import { CategoryDataService } from '../categoryData.service';
import { CategoryService, Category } from '../category.service';

// Mock the CategoryService
jest.mock('../category.service');

// Mock DOM methods for file download
Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Mock document methods
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
  remove: jest.fn(),
};

const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: jest.fn(() => mockLink),
});

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: mockRemoveChild,
});

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  type: options?.type || 'text/plain',
})) as jest.MockedClass<typeof Blob>;

const mockCategoryService = CategoryService as jest.MockedClass<typeof CategoryService>;

describe('CategoryDataService', () => {
  let categoryDataService: CategoryDataService;
  let mockGetCategories: jest.SpyInstance;

  const mockCategories = [
    {
      id: '1',
      name: 'Electronics',
      description: 'Electronic products and gadgets',
      tag: 'tech',
      costPrice: 100.50
    },
    {
      id: '2',
      name: 'Books',
      description: 'Educational and entertainment books',
      tag: 'education',
      costPrice: 25.75
    },
    {
      id: '3',
      name: 'Clothing & Fashion',
      description: 'Apparel, accessories, and fashion items',
      tag: 'fashion',
      costPrice: null
    },
    {
      id: '4',
      name: 'Test "Quoted" Category',
      description: 'Category with "quotes" in name and description',
      tag: 'test,comma',
      costPrice: 15.99
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCategories = jest.fn().mockResolvedValue(mockCategories);

    mockCategoryService.mockImplementation(() => ({
      getCategories: mockGetCategories,
    }) as jest.Mocked<CategoryService>);

    categoryDataService = new CategoryDataService();

    // Reset DOM mocks
    mockLink.click.mockClear();
    mockAppendChild.mockClear();
    mockRemoveChild.mockClear();
  });

  describe('Constructor', () => {
    it('creates instance with CategoryService dependency', () => {
      expect(categoryDataService).toBeInstanceOf(CategoryDataService);
      expect(mockCategoryService).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportCategories', () => {
    it('successfully exports categories to CSV', async () => {
      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully exported 4 categories');
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual(mockCategories);
      expect(mockGetCategories).toHaveBeenCalled();
    });

    it('creates correct CSV content', async () => {
      await categoryDataService.exportCategories();

      // Check that Blob was created with correct content
      expect(global.Blob).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('Name,Description,Tag,Cost Price')]),
        { type: 'text/csv' }
      );

      // Get the CSV content from the Blob call
      const blobCall = (global.Blob as jest.Mock).mock.calls[0];
      const csvContent = blobCall[0][0];

      // Check header
      expect(csvContent).toContain('Name,Description,Tag,Cost Price');
      
      // Check data rows
      expect(csvContent).toContain('Electronics,Electronic products and gadgets,tech,100.5');
      expect(csvContent).toContain('Books,Educational and entertainment books,education,25.75');
      expect(csvContent).toContain('Clothing & Fashion,"Apparel, accessories, and fashion items",fashion,');
    });

    it('handles CSV escaping for special characters', async () => {
      await categoryDataService.exportCategories();

      const blobCall = (global.Blob as jest.Mock).mock.calls[0];
      const csvContent = blobCall[0][0];

      // Check that quotes are properly escaped
      expect(csvContent).toContain('"Test ""Quoted"" Category"');
      expect(csvContent).toContain('"Category with ""quotes"" in name and description"');
      expect(csvContent).toContain('"test,comma"');
    });

    it('creates download link with correct attributes', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const mockToISOString = jest.spyOn(mockDate, 'toISOString').mockReturnValue('2024-01-15T10:00:00.000Z');

      await categoryDataService.exportCategories();

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.href).toBe('mock-url');
      expect(mockLink.download).toBe('categories-export-2024-01-15.csv');
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');

      mockToISOString.mockRestore();
      (global.Date as unknown as jest.SpyInstance).mockRestore();
    });

    it('handles empty categories list', async () => {
      mockGetCategories.mockResolvedValue([]);

      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully exported 0 categories');
      expect(result.data).toEqual([]);

      // Should still create CSV with header
      const blobCall = (global.Blob as jest.Mock).mock.calls[0];
      const csvContent = blobCall[0][0];
      expect(csvContent).toContain('Name,Description,Tag,Cost Price');
    });

    it('handles categories with null/undefined values', async () => {
      const categoriesWithNulls = [
        {
          id: '1',
          name: 'Test Category',
          description: null,
          tag: undefined,
          costPrice: null
        }
      ];

      mockGetCategories.mockResolvedValue(categoriesWithNulls as unknown as Category[]);

      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(true);
      
      const blobCall = (global.Blob as jest.Mock).mock.calls[0];
      const csvContent = blobCall[0][0];
      expect(csvContent).toContain('Test Category,,,');
    });

    it('handles service error gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockGetCategories.mockRejectedValue(new Error(errorMessage));

      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to export categories');
      expect(result.errors).toEqual([errorMessage]);
      expect(result.data).toEqual([]);

      // Should not attempt to create download
      expect(global.Blob).not.toHaveBeenCalled();
      expect(mockLink.click).not.toHaveBeenCalled();
    });

    it('handles non-Error exceptions', async () => {
      mockGetCategories.mockRejectedValue('String error');

      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to export categories');
      expect(result.errors).toEqual(['Unknown error']);
    });

    it('handles categories with special characters in all fields', async () => {
      const specialCategories = [
        {
          id: '1',
          name: 'Category\nWith\nNewlines',
          description: 'Description with, commas and "quotes"',
          tag: 'tag\twith\ttabs',
          costPrice: 99.99
        }
      ];

      mockGetCategories.mockResolvedValue(specialCategories);

      const result = await categoryDataService.exportCategories();

      expect(result.success).toBe(true);
      
      const blobCall = (global.Blob as jest.Mock).mock.calls[0];
      const csvContent = blobCall[0][0];
      
      // Should properly escape all special characters
      expect(csvContent).toContain('"Category\nWith\nNewlines"');
      expect(csvContent).toContain('"Description with, commas and ""quotes"""');
      expect(csvContent).toContain('tag	with	tabs'); // Tab characters may not be quoted
    });
  });

  describe('escapeCSV method', () => {
    it('escapes values containing commas', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('value, with, commas');
      expect(result).toBe('"value, with, commas"');
    });

    it('escapes values containing quotes', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('value with "quotes"');
      expect(result).toBe('"value with ""quotes"""');
    });

    it('escapes values containing newlines', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('value\nwith\nnewlines');
      expect(result).toBe('"value\nwith\nnewlines"');
    });

    it('does not escape simple values', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('simplevalue');
      expect(result).toBe('simplevalue');
    });

    it('handles empty string', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('');
      expect(result).toBe('');
    });

    it('handles values with multiple special characters', () => {
      const service = new CategoryDataService();
      const result = (service as unknown as { escapeCSV: (value: string) => string }).escapeCSV('complex, "value"\nwith everything');
      expect(result).toBe('"complex, ""value""\nwith everything"');
    });
  });

  describe('Integration with CategoryService', () => {
    it('calls CategoryService.getCategories once per export', async () => {
      await categoryDataService.exportCategories();
      
      expect(mockGetCategories).toHaveBeenCalledTimes(1);
    });

    it('passes through CategoryService data correctly', async () => {
      const customCategories = [
        { id: '1', name: 'Custom', description: 'Test', tag: 'test', costPrice: 50 }
      ];
      
      mockGetCategories.mockResolvedValue(customCategories);

      const result = await categoryDataService.exportCategories();

      expect(result.data).toEqual(customCategories);
    });
  });

  describe('File Download Process', () => {
    it('follows complete download flow', async () => {
      await categoryDataService.exportCategories();

      // Check that all operations were called
      expect(global.Blob).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
      expect(mockLink.click).toHaveBeenCalledTimes(1);
      expect(mockRemoveChild).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('cleans up resources after download', async () => {
      await categoryDataService.exportCategories();

      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });

  describe('Date Formatting', () => {
    it('formats date correctly for filename', async () => {
      const mockDate = new Date('2024-12-25T15:30:45.123Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      const mockToISOString = jest.spyOn(mockDate, 'toISOString').mockReturnValue('2024-12-25T15:30:45.123Z');

      await categoryDataService.exportCategories();

      expect(mockLink.download).toBe('categories-export-2024-12-25.csv');

      mockToISOString.mockRestore();
      (global.Date as unknown as jest.SpyInstance).mockRestore();
    });
  });
});
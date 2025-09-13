import { ValidationService } from '../validation.service';
import { Category } from '../category.service';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateCategoryData', () => {
    describe('Valid Categories', () => {
      it('validates correct category data', () => {
        const categories: Category[] = [
          {
            name: 'Electronics',
            description: 'Electronic products',
            tag: 'tech',
            costPrice: 100
          },
          {
            name: 'Books',
            description: 'Educational books',
            tag: 'education',
            costPrice: null
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('validates categories with minimal data', () => {
        const categories: Category[] = [
          {
            name: 'Test Category',
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('validates categories with zero cost price', () => {
        const categories: Category[] = [
          {
            name: 'Free Category',
            costPrice: 0
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Required Field Validation', () => {
      it('reports error for missing name', () => {
        const categories: Category[] = [
          {
            name: '',
            description: 'Test description'
          },
          {
            // @ts-expect-error - Testing runtime validation
            name: null
          },
          {
            // Missing name property entirely
            description: 'Another test'
          } as Category
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors[0]).toBe('Category at row 1 is missing a name');
        expect(result.errors[1]).toBe('Category at row 2 is missing a name');
        expect(result.errors[2]).toBe('Category at row 3 is missing a name');
      });

      it('reports error for whitespace-only name', () => {
        const categories: Category[] = [
          {
            name: '   ',
            description: 'Test'
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Category at row 1 is missing a name');
      });
    });

    describe('Cost Price Validation', () => {
      it('reports error for invalid cost price types', () => {
        const categories: Category[] = [
          {
            name: 'Test 1',
            // @ts-expect-error - Testing runtime validation
            costPrice: 'invalid'
          },
          {
            name: 'Test 2',
            // @ts-expect-error - Testing runtime validation
            costPrice: {}
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0]).toBe('Category "Test 1" at row 1 has invalid cost price: invalid');
        expect(result.errors[1]).toBe('Category "Test 2" at row 2 has invalid cost price: [object Object]');
      });

      it('reports error for negative cost price', () => {
        const categories: Category[] = [
          {
            name: 'Negative Price Category',
            costPrice: -10
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Category "Negative Price Category" at row 1 has invalid cost price: -10');
      });

      it('allows null and undefined cost prices', () => {
        const categories: Category[] = [
          {
            name: 'Null Price',
            costPrice: null
          },
          {
            name: 'Undefined Price',
            costPrice: undefined
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Warning Validations', () => {
      it('warns about long category names', () => {
        const longName = 'A'.repeat(101);
        const categories: Category[] = [
          {
            name: longName
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toBe(`Category "${longName}" has a name longer than 100 characters`);
      });

      it('warns about long descriptions', () => {
        const longDescription = 'A'.repeat(501);
        const categories: Category[] = [
          {
            name: 'Test Category',
            description: longDescription
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toBe('Category "Test Category" has a description longer than 500 characters');
      });

      it('does not warn for exactly 100 character name', () => {
        const exactName = 'A'.repeat(100);
        const categories: Category[] = [
          {
            name: exactName
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.warnings).toHaveLength(0);
      });

      it('does not warn for exactly 500 character description', () => {
        const exactDescription = 'A'.repeat(500);
        const categories: Category[] = [
          {
            name: 'Test',
            description: exactDescription
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Duplicate Name Detection', () => {
      it('detects exact duplicate names', () => {
        const categories: Category[] = [
          {
            name: 'Electronics'
          },
          {
            name: 'Electronics'
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('Duplicate category name "Electronics" found at rows 1 and 2');
      });

      it('detects case-insensitive duplicates', () => {
        const categories: Category[] = [
          {
            name: 'Electronics'
          },
          {
            name: 'electronics'
          },
          {
            name: 'ELECTRONICS'
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0]).toBe('Duplicate category name "electronics" found at rows 1 and 2');
        expect(result.errors[1]).toBe('Duplicate category name "ELECTRONICS" found at rows 1 and 3');
      });

      it('detects duplicates after trimming whitespace', () => {
        const categories: Category[] = [
          {
            name: 'Electronics'
          },
          {
            name: '  Electronics  '
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe('Duplicate category name "  Electronics  " found at rows 1 and 2');
      });

      it('handles multiple duplicate sets', () => {
        const categories: Category[] = [
          { name: 'Electronics' },
          { name: 'Books' },
          { name: 'Electronics' }, // Duplicate of first
          { name: 'Clothing' },
          { name: 'books' }, // Duplicate of second (case insensitive)
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContain('Duplicate category name "Electronics" found at rows 1 and 3');
        expect(result.errors).toContain('Duplicate category name "books" found at rows 2 and 5');
      });
    });

    describe('Complex Validation Scenarios', () => {
      it('reports both errors and warnings', () => {
        const longName = 'A'.repeat(101);
        const categories: Category[] = [
          {
            name: '', // Error: missing name
            description: 'B'.repeat(501) // Warning: long description
          },
          {
            name: longName, // Warning: long name
            costPrice: -5 // Error: negative price
          }
        ];

        const result = validationService.validateCategoryData(categories);

        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.warnings).toHaveLength(2);
        
        expect(result.errors).toContain('Category at row 1 is missing a name');
        expect(result.errors).toContain(`Category "${longName}" at row 2 has invalid cost price: -5`);
        
        expect(result.warnings).toContain('Category "" has a description longer than 500 characters');
        expect(result.warnings).toContain(`Category "${longName}" has a name longer than 100 characters`);
      });

      it('handles empty array', () => {
        const result = validationService.validateCategoryData([]);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });
    });
  });

  describe('validateCSVFormat', () => {
    describe('Valid CSV Format', () => {
      it('validates proper CSV with all columns', () => {
        const csvData = 'name,description,tag,costPrice\nElectronics,Electronic products,tech,100\nBooks,Educational books,edu,25';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('validates CSV with only required column', () => {
        const csvData = 'name\nElectronics\nBooks';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(3); // Missing optional columns
      });

      it('handles case-insensitive headers', () => {
        const csvData = 'NAME,DESCRIPTION,TAG,COSTPRICE\nElectronics,Electronic products,tech,100';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('handles headers with extra whitespace', () => {
        const csvData = '  name  ,  description  ,  tag  ,  costPrice  \nElectronics,Electronic products,tech,100';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid CSV Format', () => {
      it('reports error for empty CSV', () => {
        const result = validationService.validateCSVFormat('');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CSV file must contain at least a header row and one data row');
      });

      it('reports error for only header row', () => {
        const csvData = 'name,description,tag,costPrice';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CSV file must contain at least a header row and one data row');
      });

      it('reports error for missing name column', () => {
        const csvData = 'description,tag,costPrice\nElectronic products,tech,100';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('CSV file must contain a "name" column');
      });

      it('handles malformed CSV gracefully', () => {
        // This would cause CSV parsing to throw an error
        const csvData = null as unknown as string;

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid CSV format');
      });
    });

    describe('Warning Scenarios', () => {
      it('warns about missing optional columns', () => {
        const csvData = 'name\nElectronics\nBooks';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(3);
        expect(result.warnings).toContain('CSV file is missing optional column: description');
        expect(result.warnings).toContain('CSV file is missing optional column: tag');
        expect(result.warnings).toContain('CSV file is missing optional column: costPrice');
      });

      it('warns about some missing optional columns', () => {
        const csvData = 'name,description\nElectronics,Electronic products';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(2);
        expect(result.warnings).toContain('CSV file is missing optional column: tag');
        expect(result.warnings).toContain('CSV file is missing optional column: costPrice');
      });

      it('does not warn when all columns are present', () => {
        const csvData = 'name,description,tag,costPrice\nElectronics,Electronic products,tech,100';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Edge Cases', () => {
      it('handles CSV with empty lines', () => {
        const csvData = 'name,description\n\nElectronics,Electronic products\n\nBooks,Educational books\n\n';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
      });

      it('handles CSV with only whitespace lines', () => {
        const csvData = 'name,description\n   \nElectronics,Electronic products\n   ';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
      });

      it('handles CSV with extra columns', () => {
        const csvData = 'name,description,tag,costPrice,extra1,extra2\nElectronics,Electronic products,tech,100,extra,data';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('handles different column order', () => {
        const csvData = 'costPrice,name,tag,description\n100,Electronics,tech,Electronic products';

        const result = validationService.validateCSVFormat(csvData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('handles null input', () => {
        const result = validationService.validateCSVFormat(null as unknown as string);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid CSV format');
      });

      it('handles undefined input', () => {
        const result = validationService.validateCSVFormat(undefined as unknown as string);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid CSV format');
      });

      it('handles non-string input', () => {
        const result = validationService.validateCSVFormat(123 as unknown as string);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid CSV format');
      });
    });
  });

  describe('Integration Tests', () => {
    it('can validate both category data and CSV format in sequence', () => {
      const csvData = 'name,description\nElectronics,Electronic products';
      const categories: Category[] = [
        {
          name: 'Electronics',
          description: 'Electronic products'
        }
      ];

      const csvResult = validationService.validateCSVFormat(csvData);
      const categoryResult = validationService.validateCategoryData(categories);

      expect(csvResult.isValid).toBe(true);
      expect(categoryResult.isValid).toBe(true);
    });

    it('handles validation of categories that would come from parsed CSV', () => {
      // Simulate categories that would be parsed from CSV
      const categories: Category[] = [
        {
          name: 'Electronics',
          description: 'Electronic products',
          tag: 'tech',
          costPrice: 100
        },
        {
          name: 'Books',
          description: '',
          tag: '',
          costPrice: null
        }
      ];

      const result = validationService.validateCategoryData(categories);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
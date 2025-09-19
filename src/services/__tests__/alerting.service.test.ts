import { AlertingService } from '../alerting.service';
import { InventoryAlert } from '../../types/inventory';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Service
jest.mock('../firebase.service', () => ({
  FirebaseService: class MockFirebaseService {
    protected getDocuments = jest.fn();
    protected addDocument = jest.fn();
    protected getDocument = jest.fn();
    protected updateDocument = jest.fn();
    protected handleError = jest.fn();
  }
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  where: jest.fn(() => ({ type: 'where', field: 'test', op: '==', value: 'test' })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })),
  },
}));

describe('AlertingService - Inventory Alert Functionality', () => {
  let alertingService: AlertingService;
  let mockGetDocuments: jest.Mock;
  let mockAddDocument: jest.Mock;
  let mockGetDocument: jest.Mock;
  let mockUpdateDocument: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear any existing intervals from previous tests
    if (alertingService) {
      alertingService.destroy();
    }
    
    alertingService = new AlertingService();
    mockGetDocuments = alertingService.getDocuments;
    mockAddDocument = alertingService.addDocument;
    mockGetDocument = alertingService.getDocument;
    mockUpdateDocument = alertingService.updateDocument;

    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Clean up intervals and console mocks
    if (alertingService) {
      alertingService.destroy();
    }
    jest.restoreAllMocks();
  });

  describe('createInventoryAlert', () => {
    describe('Input Validation', () => {
      it('should throw error for missing categoryGroupId', async () => {
        await expect(
          alertingService.createInventoryAlert(
            '',
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Category group ID is required and must be a valid string');
      });

      it('should throw error for invalid categoryGroupId type', async () => {
        await expect(
          alertingService.createInventoryAlert(
            null as unknown as string,
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Category group ID is required and must be a valid string');
      });

      it('should throw error for invalid alert type', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'invalid_type' as unknown as 'low_stock' | 'zero_stock' | 'negative_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Alert type must be one of: low_stock, zero_stock, negative_stock');
      });

      it('should throw error for missing alert type', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            '' as unknown as 'low_stock' | 'zero_stock' | 'negative_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Alert type must be one of: low_stock, zero_stock, negative_stock');
      });

      it('should throw error for invalid current level (NaN)', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            NaN,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Current level must be a valid number');
      });

      it('should throw error for invalid current level (string)', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            '5' as unknown as number,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Current level must be a valid number');
      });

      it('should throw error for invalid threshold level (NaN)', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            NaN,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Threshold level must be a valid non-negative number');
      });

      it('should throw error for negative threshold level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            -5,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Threshold level must be a valid non-negative number');
      });

      it('should throw error for invalid unit', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'invalid_unit' as unknown as 'kg' | 'g' | 'pcs',
            'medium'
          )
        ).rejects.toThrow('Unit must be one of: kg, g, pcs');
      });

      it('should throw error for missing unit', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            '' as unknown as 'kg' | 'g' | 'pcs',
            'medium'
          )
        ).rejects.toThrow('Unit must be one of: kg, g, pcs');
      });

      it('should throw error for invalid severity', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            'invalid_severity' as unknown as 'low' | 'medium' | 'high' | 'critical'
          )
        ).rejects.toThrow('Severity must be one of: low, medium, high, critical');
      });

      it('should throw error for missing severity', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            '' as unknown as 'low' | 'medium' | 'high' | 'critical'
          )
        ).rejects.toThrow('Severity must be one of: low, medium, high, critical');
      });
    });

    describe('Logical Consistency Validation', () => {
      it('should throw error for zero_stock alert with non-zero current level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'zero_stock',
            5,
            10,
            'pcs',
            'high'
          )
        ).rejects.toThrow('Zero stock alert type requires current level to be exactly 0');
      });

      it('should throw error for negative_stock alert with non-negative current level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'negative_stock',
            5,
            10,
            'pcs',
            'critical'
          )
        ).rejects.toThrow('Negative stock alert type requires current level to be below 0');
      });

      it('should throw error for negative_stock alert with zero current level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'negative_stock',
            0,
            10,
            'pcs',
            'critical'
          )
        ).rejects.toThrow('Negative stock alert type requires current level to be below 0');
      });

      it('should throw error for low_stock alert with zero current level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            0,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Low stock alert type requires current level to be between 0 and threshold level');
      });

      it('should throw error for low_stock alert with negative current level', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            -5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Low stock alert type requires current level to be between 0 and threshold level');
      });

      it('should throw error for low_stock alert with current level above threshold', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            15,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Low stock alert type requires current level to be between 0 and threshold level');
      });

      it('should throw error for low_stock alert with current level equal to threshold', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            10,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Low stock alert type requires current level to be between 0 and threshold level');
      });
    });

    describe('Successful Alert Creation', () => {
      beforeEach(() => {
        // Mock no existing alerts by default
        mockGetDocuments.mockResolvedValue([]);
        mockAddDocument.mockResolvedValue({ id: 'alert-123' });
      });

      it('should create low_stock alert successfully', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          5,
          10,
          'pcs',
          'medium'
        );

        expect(mockGetDocuments).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.arrayContaining([
            expect.anything(), // where('categoryGroupId', '==', 'group-1')
            expect.anything(), // where('alertType', '==', 'low_stock')
            expect.anything()  // where('isActive', '==', true)
          ])
        );

        expect(mockAddDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            categoryGroupId: 'group-1',
            alertType: 'low_stock',
            currentLevel: 5,
            thresholdLevel: 10,
            unit: 'pcs',
            severity: 'medium',
            isActive: true,
            createdAt: expect.any(Object)
          })
        );

        expect(result).toEqual({
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: expect.any(Object)
        });

        expect(console.info).toHaveBeenCalledWith(
          'Inventory alert created successfully:',
          expect.objectContaining({
            alertId: 'alert-123',
            categoryGroupId: 'group-1',
            alertType: 'low_stock'
          })
        );
      });

      it('should create zero_stock alert successfully', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-2',
          'zero_stock',
          0,
          5,
          'kg',
          'high'
        );

        expect(mockAddDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            categoryGroupId: 'group-2',
            alertType: 'zero_stock',
            currentLevel: 0,
            thresholdLevel: 5,
            unit: 'kg',
            severity: 'high',
            isActive: true
          })
        );

        expect(result.alertType).toBe('zero_stock');
        expect(result.currentLevel).toBe(0);
        expect(result.unit).toBe('kg');
      });

      it('should create negative_stock alert successfully', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-3',
          'negative_stock',
          -10,
          5,
          'g',
          'critical'
        );

        expect(mockAddDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            categoryGroupId: 'group-3',
            alertType: 'negative_stock',
            currentLevel: -10,
            thresholdLevel: 5,
            unit: 'g',
            severity: 'critical',
            isActive: true
          })
        );

        expect(result.alertType).toBe('negative_stock');
        expect(result.currentLevel).toBe(-10);
        expect(result.severity).toBe('critical');
      });

      it('should handle different units correctly', async () => {
        // Test kg unit
        await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          2.5,
          5.0,
          'kg',
          'medium'
        );

        expect(mockAddDocument).toHaveBeenLastCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            unit: 'kg',
            currentLevel: 2.5,
            thresholdLevel: 5.0
          })
        );

        // Test g unit
        await alertingService.createInventoryAlert(
          'group-2',
          'low_stock',
          250,
          500,
          'g',
          'low'
        );

        expect(mockAddDocument).toHaveBeenLastCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            unit: 'g',
            currentLevel: 250,
            thresholdLevel: 500
          })
        );

        // Test pcs unit
        await alertingService.createInventoryAlert(
          'group-3',
          'low_stock',
          3,
          10,
          'pcs',
          'high'
        );

        expect(mockAddDocument).toHaveBeenLastCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            unit: 'pcs',
            currentLevel: 3,
            thresholdLevel: 10
          })
        );
      });

      it('should handle different severity levels correctly', async () => {
        const severityLevels: Array<InventoryAlert['severity']> = ['low', 'medium', 'high', 'critical'];

        for (const severity of severityLevels) {
          await alertingService.createInventoryAlert(
            `group-${severity}`,
            'low_stock',
            5,
            10,
            'pcs',
            severity
          );

          expect(mockAddDocument).toHaveBeenLastCalledWith(
            'inventoryAlerts',
            expect.objectContaining({
              severity: severity
            })
          );
        }
      });
    });

    describe('Duplicate Alert Prevention', () => {
      it('should return existing alert when active alert of same type exists', async () => {
        const existingAlert: InventoryAlert = {
          id: 'existing-alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 3,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocuments.mockResolvedValue([existingAlert]);

        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          5,
          10,
          'pcs',
          'high'
        );

        expect(mockGetDocuments).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.arrayContaining([
            expect.anything(), // where('categoryGroupId', '==', 'group-1')
            expect.anything(), // where('alertType', '==', 'low_stock')
            expect.anything()  // where('isActive', '==', true)
          ])
        );

        expect(mockAddDocument).not.toHaveBeenCalled();
        expect(result).toEqual(existingAlert);

        expect(console.warn).toHaveBeenCalledWith(
          'Active low_stock alert already exists for category group group-1:',
          'existing-alert-123'
        );
      });

      it('should create new alert when existing alert is of different type', async () => {
        // Mock will return empty array for low_stock query, but existing alert for zero_stock
        mockGetDocuments.mockResolvedValue([]);
        mockAddDocument.mockResolvedValue({ id: 'new-alert-456' });

        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          5,
          10,
          'pcs',
          'medium'
        );

        expect(mockGetDocuments).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.arrayContaining([
            expect.anything(), // where('categoryGroupId', '==', 'group-1')
            expect.anything(), // where('alertType', '==', 'low_stock')
            expect.anything()  // where('isActive', '==', true)
          ])
        );

        expect(mockAddDocument).toHaveBeenCalled();
        expect(result.id).toBe('new-alert-456');
        expect(result.alertType).toBe('low_stock');
      });

      it('should create new alert when existing alert is for different category group', async () => {
        // Mock will return empty array for group-1 query, but existing alert for group-2
        mockGetDocuments.mockResolvedValue([]);
        mockAddDocument.mockResolvedValue({ id: 'new-alert-456' });

        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          5,
          10,
          'pcs',
          'medium'
        );

        expect(mockGetDocuments).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.arrayContaining([
            expect.anything(), // where('categoryGroupId', '==', 'group-1')
            expect.anything(), // where('alertType', '==', 'low_stock')
            expect.anything()  // where('isActive', '==', true)
          ])
        );

        expect(mockAddDocument).toHaveBeenCalled();
        expect(result.id).toBe('new-alert-456');
        expect(result.categoryGroupId).toBe('group-1');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetDocuments.mockResolvedValue([]);
      });

      it('should handle Firestore getDocuments errors', async () => {
        const firestoreError = new Error('Firestore connection failed');
        mockGetDocuments.mockRejectedValue(firestoreError);

        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Failed to create inventory alert: Firestore connection failed');
      });

      it('should handle Firestore addDocument errors', async () => {
        const firestoreError = new Error('Document creation failed');
        mockAddDocument.mockRejectedValue(firestoreError);

        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Failed to create inventory alert: Document creation failed');
      });

      it('should handle unknown errors gracefully', async () => {
        mockAddDocument.mockRejectedValue('Unknown error string');

        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Failed to create inventory alert: Unknown error during inventory alert creation');
      });

      it('should handle null/undefined errors', async () => {
        mockAddDocument.mockRejectedValue(null);

        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            10,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Failed to create inventory alert: Unknown error during inventory alert creation');
      });
    });

    describe('Edge Cases', () => {
      beforeEach(() => {
        mockGetDocuments.mockResolvedValue([]);
        mockAddDocument.mockResolvedValue({ id: 'alert-edge-case' });
      });

      it('should handle zero threshold level for low_stock alert', async () => {
        await expect(
          alertingService.createInventoryAlert(
            'group-1',
            'low_stock',
            5,
            0,
            'pcs',
            'medium'
          )
        ).rejects.toThrow('Low stock alert type requires current level to be between 0 and threshold level');
      });

      it('should handle fractional values for weight units', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          2.75,
          5.25,
          'kg',
          'medium'
        );

        expect(mockAddDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          expect.objectContaining({
            currentLevel: 2.75,
            thresholdLevel: 5.25
          })
        );

        expect(result.currentLevel).toBe(2.75);
        expect(result.thresholdLevel).toBe(5.25);
      });

      it('should handle very small fractional values', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          0.001,
          0.005,
          'kg',
          'low'
        );

        expect(result.currentLevel).toBe(0.001);
        expect(result.thresholdLevel).toBe(0.005);
      });

      it('should handle large integer values', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-1',
          'low_stock',
          999999,
          1000000,
          'pcs',
          'low'
        );

        expect(result.currentLevel).toBe(999999);
        expect(result.thresholdLevel).toBe(1000000);
      });

      it('should handle negative values for negative_stock alerts', async () => {
        const result = await alertingService.createInventoryAlert(
          'group-1',
          'negative_stock',
          -99.99,
          10,
          'kg',
          'critical'
        );

        expect(result.currentLevel).toBe(-99.99);
        expect(result.alertType).toBe('negative_stock');
      });
    });
  });

  describe('calculateSeverity', () => {
    describe('Input Validation', () => {
      it('should throw error for invalid currentLevel (NaN)', () => {
        expect(() => {
          alertingService.calculateSeverity(NaN, 10, 'low_stock');
        }).toThrow('Current level must be a valid number');
      });

      it('should throw error for invalid currentLevel (string)', () => {
        expect(() => {
          alertingService.calculateSeverity('5' as unknown as number, 10, 'low_stock');
        }).toThrow('Current level must be a valid number');
      });

      it('should throw error for invalid thresholdLevel (NaN)', () => {
        expect(() => {
          alertingService.calculateSeverity(5, NaN, 'low_stock');
        }).toThrow('Threshold level must be a valid number');
      });

      it('should throw error for invalid thresholdLevel (string)', () => {
        expect(() => {
          alertingService.calculateSeverity(5, '10' as unknown as number, 'low_stock');
        }).toThrow('Threshold level must be a valid number');
      });

      it('should throw error for negative thresholdLevel', () => {
        expect(() => {
          alertingService.calculateSeverity(5, -10, 'low_stock');
        }).toThrow('Threshold level must be non-negative');
      });

      it('should throw error for invalid alertType', () => {
        expect(() => {
          alertingService.calculateSeverity(5, 10, 'invalid_type' as unknown as 'low_stock' | 'zero_stock' | 'negative_stock');
        }).toThrow('Alert type must be one of: low_stock, zero_stock, negative_stock');
      });

      it('should throw error for missing alertType', () => {
        expect(() => {
          alertingService.calculateSeverity(5, 10, '' as unknown as 'low_stock' | 'zero_stock' | 'negative_stock');
        }).toThrow('Alert type must be one of: low_stock, zero_stock, negative_stock');
      });
    });

    describe('Negative Stock Scenarios', () => {
      it('should always return critical for negative_stock alerts', () => {
        expect(alertingService.calculateSeverity(-1, 10, 'negative_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(-0.1, 5, 'negative_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(-100, 50, 'negative_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(-999.99, 1000, 'negative_stock')).toBe('critical');
      });

      it('should return critical even with zero threshold for negative_stock', () => {
        expect(alertingService.calculateSeverity(-5, 0, 'negative_stock')).toBe('critical');
      });
    });

    describe('Zero Stock Scenarios', () => {
      it('should return critical for high threshold values (>= 100)', () => {
        expect(alertingService.calculateSeverity(0, 100, 'zero_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(0, 150, 'zero_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(0, 1000, 'zero_stock')).toBe('critical');
      });

      it('should return high for medium threshold values (>= 10, < 100)', () => {
        expect(alertingService.calculateSeverity(0, 10, 'zero_stock')).toBe('high');
        expect(alertingService.calculateSeverity(0, 25, 'zero_stock')).toBe('high');
        expect(alertingService.calculateSeverity(0, 50, 'zero_stock')).toBe('high');
        expect(alertingService.calculateSeverity(0, 99, 'zero_stock')).toBe('high');
      });

      it('should return medium for low threshold values (< 10)', () => {
        expect(alertingService.calculateSeverity(0, 1, 'zero_stock')).toBe('medium');
        expect(alertingService.calculateSeverity(0, 5, 'zero_stock')).toBe('medium');
        expect(alertingService.calculateSeverity(0, 9, 'zero_stock')).toBe('medium');
        expect(alertingService.calculateSeverity(0, 9.99, 'zero_stock')).toBe('medium');
      });

      it('should return medium for zero threshold', () => {
        expect(alertingService.calculateSeverity(0, 0, 'zero_stock')).toBe('medium');
      });
    });

    describe('Low Stock Scenarios', () => {
      it('should return high for currentLevel <= 10% of threshold', () => {
        expect(alertingService.calculateSeverity(1, 100, 'low_stock')).toBe('high'); // 1%
        expect(alertingService.calculateSeverity(5, 100, 'low_stock')).toBe('high'); // 5%
        expect(alertingService.calculateSeverity(10, 100, 'low_stock')).toBe('high'); // 10%
        expect(alertingService.calculateSeverity(0.5, 10, 'low_stock')).toBe('high'); // 5%
      });

      it('should return medium for currentLevel <= 25% of threshold (but > 10%)', () => {
        expect(alertingService.calculateSeverity(15, 100, 'low_stock')).toBe('medium'); // 15%
        expect(alertingService.calculateSeverity(20, 100, 'low_stock')).toBe('medium'); // 20%
        expect(alertingService.calculateSeverity(25, 100, 'low_stock')).toBe('medium'); // 25%
        expect(alertingService.calculateSeverity(2.5, 10, 'low_stock')).toBe('medium'); // 25%
      });

      it('should return low for currentLevel <= 50% of threshold (but > 25%)', () => {
        expect(alertingService.calculateSeverity(30, 100, 'low_stock')).toBe('low'); // 30%
        expect(alertingService.calculateSeverity(40, 100, 'low_stock')).toBe('low'); // 40%
        expect(alertingService.calculateSeverity(50, 100, 'low_stock')).toBe('low'); // 50%
        expect(alertingService.calculateSeverity(4, 10, 'low_stock')).toBe('low'); // 40%
      });

      it('should return low for currentLevel > 50% of threshold', () => {
        expect(alertingService.calculateSeverity(60, 100, 'low_stock')).toBe('low'); // 60%
        expect(alertingService.calculateSeverity(75, 100, 'low_stock')).toBe('low'); // 75%
        expect(alertingService.calculateSeverity(90, 100, 'low_stock')).toBe('low'); // 90%
        expect(alertingService.calculateSeverity(99, 100, 'low_stock')).toBe('low'); // 99%
      });

      it('should handle fractional values correctly', () => {
        expect(alertingService.calculateSeverity(0.05, 1, 'low_stock')).toBe('high'); // 5%
        expect(alertingService.calculateSeverity(0.15, 1, 'low_stock')).toBe('medium'); // 15%
        expect(alertingService.calculateSeverity(0.35, 1, 'low_stock')).toBe('low'); // 35%
        expect(alertingService.calculateSeverity(2.5, 5.5, 'low_stock')).toBe('low'); // ~45%
      });

      it('should handle very small numbers correctly', () => {
        expect(alertingService.calculateSeverity(0.001, 0.01, 'low_stock')).toBe('high'); // 10%
        expect(alertingService.calculateSeverity(0.002, 0.01, 'low_stock')).toBe('medium'); // 20%
        expect(alertingService.calculateSeverity(0.004, 0.01, 'low_stock')).toBe('low'); // 40%
      });

      it('should handle zero threshold for low_stock', () => {
        // When threshold is 0, any positive current level should be treated as severe
        expect(alertingService.calculateSeverity(1, 0, 'low_stock')).toBe('high');
        expect(alertingService.calculateSeverity(0.1, 0, 'low_stock')).toBe('high');
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large numbers', () => {
        expect(alertingService.calculateSeverity(1000000, 10000000, 'low_stock')).toBe('high'); // 10%
        expect(alertingService.calculateSeverity(-1000000, 10000000, 'negative_stock')).toBe('critical');
        expect(alertingService.calculateSeverity(0, 1000000, 'zero_stock')).toBe('critical');
      });

      it('should handle currentLevel equal to threshold boundaries', () => {
        const threshold = 100;
        
        // Exact boundary values for low_stock
        expect(alertingService.calculateSeverity(10, threshold, 'low_stock')).toBe('high'); // Exactly 10%
        expect(alertingService.calculateSeverity(25, threshold, 'low_stock')).toBe('medium'); // Exactly 25%
        expect(alertingService.calculateSeverity(50, threshold, 'low_stock')).toBe('low'); // Exactly 50%
      });

      it('should handle floating point precision issues', () => {
        // Test cases that might have floating point precision issues
        // 0.1 + 0.2 = 0.30000000000000004, which when divided by 3 gives ~10.000000000000002%
        // This should still be treated as ~10% and classified as 'high'
        const floatingPointSum = 0.1 + 0.2; // 0.30000000000000004
        const percentage = (floatingPointSum / 3) * 100; // ~10.000000000000002%
        expect(percentage).toBeGreaterThan(10); // Due to floating point precision
        expect(alertingService.calculateSeverity(floatingPointSum, 3, 'low_stock')).toBe('medium'); // Should be medium since it's slightly > 10%
        
        // This should be clearly above 10%
        expect(alertingService.calculateSeverity(1.1 * 0.1, 1, 'low_stock')).toBe('medium'); // 0.11000000000000001 = ~11%
      });

      it('should handle zero currentLevel for non-zero-stock alerts', () => {
        // Edge case: currentLevel is 0 but alert type is not zero_stock
        expect(alertingService.calculateSeverity(0, 10, 'low_stock')).toBe('high'); // 0% of threshold
      });
    });
  });

  describe('resolveInventoryAlert', () => {
    describe('Input Validation', () => {
      it('should throw error for missing alertId', async () => {
        await expect(
          alertingService.resolveInventoryAlert('', 'user-123')
        ).rejects.toThrow('Alert ID is required and must be a valid string');
      });

      it('should throw error for invalid alertId type', async () => {
        await expect(
          alertingService.resolveInventoryAlert(null as unknown as string, 'user-123')
        ).rejects.toThrow('Alert ID is required and must be a valid string');
      });

      it('should throw error for non-string alertId', async () => {
        await expect(
          alertingService.resolveInventoryAlert(123 as unknown as string, 'user-123')
        ).rejects.toThrow('Alert ID is required and must be a valid string');
      });

      it('should throw error for missing acknowledgedBy', async () => {
        await expect(
          alertingService.resolveInventoryAlert('alert-123', '')
        ).rejects.toThrow('Acknowledged by is required and must be a valid string');
      });

      it('should throw error for invalid acknowledgedBy type', async () => {
        await expect(
          alertingService.resolveInventoryAlert('alert-123', null as unknown as string)
        ).rejects.toThrow('Acknowledged by is required and must be a valid string');
      });

      it('should throw error for non-string acknowledgedBy', async () => {
        await expect(
          alertingService.resolveInventoryAlert('alert-123', 456 as unknown as string)
        ).rejects.toThrow('Acknowledged by is required and must be a valid string');
      });
    });

    describe('Alert Existence and State Validation', () => {
      it('should throw error when alert does not exist', async () => {
        mockGetDocument.mockResolvedValue(undefined);

        await expect(
          alertingService.resolveInventoryAlert('non-existent-alert', 'user-123')
        ).rejects.toThrow('Failed to resolve inventory alert: Alert with ID non-existent-alert not found');

        expect(mockGetDocument).toHaveBeenCalledWith('inventoryAlerts', 'non-existent-alert');
      });

      it('should throw error when alert is already resolved', async () => {
        const inactiveAlert: InventoryAlert = {
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: false, // Already resolved
          acknowledgedBy: 'previous-user',
          acknowledgedAt: Timestamp.now(),
          resolvedAt: Timestamp.now(),
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(inactiveAlert);

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Alert with ID alert-123 is already resolved');

        expect(mockGetDocument).toHaveBeenCalledWith('inventoryAlerts', 'alert-123');
        expect(mockUpdateDocument).not.toHaveBeenCalled();
      });
    });

    describe('Successful Alert Resolution', () => {
      beforeEach(() => {
        mockUpdateDocument.mockResolvedValue(undefined);
      });

      it('should resolve active low_stock alert successfully', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-123', 'user-456');

        expect(mockGetDocument).toHaveBeenCalledWith('inventoryAlerts', 'alert-123');
        
        expect(mockUpdateDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          'alert-123',
          expect.objectContaining({
            isActive: false,
            acknowledgedBy: 'user-456',
            acknowledgedAt: expect.any(Object),
            resolvedAt: expect.any(Object)
          })
        );

        expect(result).toEqual(
          expect.objectContaining({
            id: 'alert-123',
            categoryGroupId: 'group-1',
            alertType: 'low_stock',
            currentLevel: 5,
            thresholdLevel: 10,
            unit: 'pcs',
            severity: 'medium',
            isActive: false,
            acknowledgedBy: 'user-456',
            acknowledgedAt: expect.any(Object),
            resolvedAt: expect.any(Object)
          })
        );

        expect(console.info).toHaveBeenCalledWith(
          'Inventory alert resolved successfully:',
          expect.objectContaining({
            alertId: 'alert-123',
            categoryGroupId: 'group-1',
            alertType: 'low_stock',
            acknowledgedBy: 'user-456'
          })
        );
      });

      it('should resolve active zero_stock alert successfully', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-456',
          categoryGroupId: 'group-2',
          alertType: 'zero_stock',
          currentLevel: 0,
          thresholdLevel: 15,
          unit: 'kg',
          severity: 'high',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-456', 'admin-789');

        expect(mockUpdateDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          'alert-456',
          expect.objectContaining({
            isActive: false,
            acknowledgedBy: 'admin-789',
            acknowledgedAt: expect.any(Object),
            resolvedAt: expect.any(Object)
          })
        );

        expect(result.alertType).toBe('zero_stock');
        expect(result.isActive).toBe(false);
        expect(result.acknowledgedBy).toBe('admin-789');
      });

      it('should resolve active negative_stock alert successfully', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-789',
          categoryGroupId: 'group-3',
          alertType: 'negative_stock',
          currentLevel: -5,
          thresholdLevel: 20,
          unit: 'g',
          severity: 'critical',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-789', 'supervisor-321');

        expect(mockUpdateDocument).toHaveBeenCalledWith(
          'inventoryAlerts',
          'alert-789',
          expect.objectContaining({
            isActive: false,
            acknowledgedBy: 'supervisor-321',
            acknowledgedAt: expect.any(Object),
            resolvedAt: expect.any(Object)
          })
        );

        expect(result.alertType).toBe('negative_stock');
        expect(result.severity).toBe('critical');
        expect(result.isActive).toBe(false);
        expect(result.acknowledgedBy).toBe('supervisor-321');
      });

      it('should handle different unit types correctly', async () => {
        const units: Array<'kg' | 'g' | 'pcs'> = ['kg', 'g', 'pcs'];

        for (const unit of units) {
          const activeAlert: InventoryAlert = {
            id: `alert-${unit}`,
            categoryGroupId: `group-${unit}`,
            alertType: 'low_stock',
            currentLevel: 5,
            thresholdLevel: 10,
            unit: unit,
            severity: 'medium',
            isActive: true,
            createdAt: Timestamp.now()
          };

          mockGetDocument.mockResolvedValue(activeAlert);

          const result = await alertingService.resolveInventoryAlert(`alert-${unit}`, 'user-123');

          expect(result.unit).toBe(unit);
          expect(result.isActive).toBe(false);
        }
      });

      it('should handle different severity levels correctly', async () => {
        const severityLevels: Array<InventoryAlert['severity']> = ['low', 'medium', 'high', 'critical'];

        for (const severity of severityLevels) {
          const activeAlert: InventoryAlert = {
            id: `alert-${severity}`,
            categoryGroupId: `group-${severity}`,
            alertType: 'low_stock',
            currentLevel: 5,
            thresholdLevel: 10,
            unit: 'pcs',
            severity: severity,
            isActive: true,
            createdAt: Timestamp.now()
          };

          mockGetDocument.mockResolvedValue(activeAlert);

          const result = await alertingService.resolveInventoryAlert(`alert-${severity}`, 'user-123');

          expect(result.severity).toBe(severity);
          expect(result.isActive).toBe(false);
        }
      });

      it('should preserve all original alert data when resolving', async () => {
        const originalAlert: InventoryAlert = {
          id: 'alert-full',
          categoryGroupId: 'group-complex',
          alertType: 'low_stock',
          currentLevel: 2.5,
          thresholdLevel: 10.75,
          unit: 'kg',
          severity: 'high',
          isActive: true,
          createdAt: Timestamp.fromDate(new Date('2023-01-01T10:00:00Z'))
        };

        mockGetDocument.mockResolvedValue(originalAlert);

        const result = await alertingService.resolveInventoryAlert('alert-full', 'operator-555');

        // Verify all original data is preserved
        expect(result.categoryGroupId).toBe('group-complex');
        expect(result.alertType).toBe('low_stock');
        expect(result.currentLevel).toBe(2.5);
        expect(result.thresholdLevel).toBe(10.75);
        expect(result.unit).toBe('kg');
        expect(result.severity).toBe('high');
        expect(result.createdAt).toEqual(originalAlert.createdAt);

        // Verify resolution data is added
        expect(result.isActive).toBe(false);
        expect(result.acknowledgedBy).toBe('operator-555');
        expect(result.acknowledgedAt).toBeInstanceOf(Object);
        expect(result.resolvedAt).toBeInstanceOf(Object);
      });
    });

    describe('Error Handling', () => {
      it('should handle Firestore getDocument errors', async () => {
        const firestoreError = new Error('Firestore read failed');
        mockGetDocument.mockRejectedValue(firestoreError);

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Firestore read failed');

        expect(mockUpdateDocument).not.toHaveBeenCalled();
      });

      it('should handle Firestore updateDocument errors', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);
        
        const firestoreError = new Error('Firestore update failed');
        mockUpdateDocument.mockRejectedValue(firestoreError);

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Firestore update failed');

        expect(mockGetDocument).toHaveBeenCalled();
        expect(mockUpdateDocument).toHaveBeenCalled();
      });

      it('should handle unknown errors gracefully', async () => {
        mockGetDocument.mockRejectedValue('Unknown error string');

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Unknown error during alert resolution');
      });

      it('should handle null/undefined errors', async () => {
        mockGetDocument.mockRejectedValue(null);

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Unknown error during alert resolution');
      });

      it('should handle partial Firestore operations gracefully', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);
        
        // Mock a timeout or network error during update
        const networkError = new Error('Network timeout');
        mockUpdateDocument.mockRejectedValue(networkError);

        await expect(
          alertingService.resolveInventoryAlert('alert-123', 'user-456')
        ).rejects.toThrow('Failed to resolve inventory alert: Network timeout');

        // Verify the alert was fetched but update failed
        expect(mockGetDocument).toHaveBeenCalledWith('inventoryAlerts', 'alert-123');
        expect(mockUpdateDocument).toHaveBeenCalled();
      });
    });

    describe('Edge Cases', () => {
      beforeEach(() => {
        mockUpdateDocument.mockResolvedValue(undefined);
      });

      it('should handle very long alertId', async () => {
        const longAlertId = 'a'.repeat(1000);
        const activeAlert: InventoryAlert = {
          id: longAlertId,
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert(longAlertId, 'user-123');

        expect(result.id).toBe(longAlertId);
        expect(result.isActive).toBe(false);
      });

      it('should handle very long acknowledgedBy', async () => {
        const longUserId = 'u'.repeat(500);
        const activeAlert: InventoryAlert = {
          id: 'alert-123',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-123', longUserId);

        expect(result.acknowledgedBy).toBe(longUserId);
        expect(result.isActive).toBe(false);
      });

      it('should handle special characters in parameters', async () => {
        const specialAlertId = 'alert-123-@#$%^&*()_+{}|:"<>?[]\\;\'./,`~';
        const specialUserId = 'user-456-üñíçødé-€@domain.com';
        
        const activeAlert: InventoryAlert = {
          id: specialAlertId,
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert(specialAlertId, specialUserId);

        expect(result.id).toBe(specialAlertId);
        expect(result.acknowledgedBy).toBe(specialUserId);
        expect(result.isActive).toBe(false);
      });

      it('should handle fractional inventory values correctly', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-fractional',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 1.23456789,
          thresholdLevel: 10.98765432,
          unit: 'kg',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-fractional', 'user-123');

        expect(result.currentLevel).toBe(1.23456789);
        expect(result.thresholdLevel).toBe(10.98765432);
        expect(result.isActive).toBe(false);
      });

      it('should handle alert with existing partial resolution data', async () => {
        // Alert that has acknowledgedBy but is still active (edge case)
        const partialAlert: InventoryAlert = {
          id: 'alert-partial',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true, // Still active
          acknowledgedBy: 'previous-user', // But has previous acknowledgment data
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(partialAlert);

        const result = await alertingService.resolveInventoryAlert('alert-partial', 'new-user');

        expect(result.acknowledgedBy).toBe('new-user'); // Should be overwritten
        expect(result.isActive).toBe(false);
        expect(result.acknowledgedAt).toBeInstanceOf(Object);
        expect(result.resolvedAt).toBeInstanceOf(Object);
      });
    });

    describe('Timestamp Consistency', () => {
      beforeEach(() => {
        mockUpdateDocument.mockResolvedValue(undefined);
      });

      it('should set acknowledgedAt and resolvedAt to the same timestamp', async () => {
        const activeAlert: InventoryAlert = {
          id: 'alert-timestamp',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: Timestamp.now()
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-timestamp', 'user-123');

        // Both timestamps should be Timestamp objects
        expect(result.acknowledgedAt).toBeInstanceOf(Object);
        expect(result.resolvedAt).toBeInstanceOf(Object);
        
        // In our implementation, they should be the same timestamp
        expect(result.acknowledgedAt).toEqual(result.resolvedAt);
      });

      it('should preserve original createdAt timestamp', async () => {
        const originalCreatedAt = Timestamp.fromDate(new Date('2023-01-01T00:00:00Z'));
        const activeAlert: InventoryAlert = {
          id: 'alert-preserve',
          categoryGroupId: 'group-1',
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: originalCreatedAt
        };

        mockGetDocument.mockResolvedValue(activeAlert);

        const result = await alertingService.resolveInventoryAlert('alert-preserve', 'user-123');

        expect(result.createdAt).toEqual(originalCreatedAt);
        expect(result.acknowledgedAt).not.toEqual(originalCreatedAt);
        expect(result.resolvedAt).not.toEqual(originalCreatedAt);
      });
    });
  });

  describe('Service Integration', () => {
    it('should properly extend FirebaseService', () => {
      expect(alertingService.getDocuments).toBeDefined();
      expect(alertingService.addDocument).toBeDefined();
      expect(alertingService.getDocument).toBeDefined();
      expect(alertingService.updateDocument).toBeDefined();
      expect(typeof alertingService.createInventoryAlert).toBe('function');
      expect(typeof alertingService.resolveInventoryAlert).toBe('function');
    });

    it('should have proper collection name constant', () => {
      expect((alertingService as AlertingService & { INVENTORY_ALERTS_COLLECTION: string }).INVENTORY_ALERTS_COLLECTION).toBe('inventoryAlerts');
    });

    it('should have calculateSeverity method', () => {
      expect(typeof alertingService.calculateSeverity).toBe('function');
    });

    it('should have resolveInventoryAlert method', () => {
      expect(typeof alertingService.resolveInventoryAlert).toBe('function');
    });
  });
});
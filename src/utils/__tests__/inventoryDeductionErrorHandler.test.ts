import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import InventoryDeductionErrorHandler, { 
  inventoryDeductionErrorHandler,
  DeductionError,
  RecoveryResult,
  RollbackOperation 
} from '../inventoryDeductionErrorHandler';
import monitoringService from '../../services/monitoring.service';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  }
}));

// Mock monitoring service
jest.mock('../../services/monitoring.service', () => ({
  captureError: jest.fn(),
  trackEvent: jest.fn()
}));

const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockWriteBatch = writeBatch as jest.MockedFunction<typeof writeBatch>;
const mockMonitoringService = monitoringService as jest.Mocked<typeof monitoringService>;

describe('InventoryDeductionErrorHandler', () => {
  let errorHandler: InventoryDeductionErrorHandler;
  let mockBatch: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new InventoryDeductionErrorHandler();
    
    mockBatch = {
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined)
    };
    
    mockDb = { mockDb: true };
    mockGetFirestore.mockReturnValue(mockDb);
    mockWriteBatch.mockReturnValue(mockBatch);
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' } as any);
    
    // Clear localStorage
    localStorage.clear();
  });

  describe('handleError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Request timeout');
      const context = { categoryGroupId: 'test-category', operation: 'deduction' };
      
      const result = errorHandler.handleError(networkError, context);
      
      expect(result.errorType).toBe('network');
      expect(result.severity).toBe('medium');
      expect(result.recoverable).toBe(true);
      expect(result.suggestedActions).toContain('Check internet connection');
      expect(mockMonitoringService.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Request timeout',
          severity: 'medium'
        })
      );
    });

    it('should categorize insufficient inventory errors correctly', () => {
      const inventoryError = new Error('Insufficient inventory available');
      const context = { 
        categoryGroupId: 'test-category',
        requestedQuantity: 10,
        availableQuantity: 5
      };
      
      const result = errorHandler.handleError(inventoryError, context);
      
      expect(result.errorType).toBe('insufficient_inventory');
      expect(result.severity).toBe('low');
      expect(result.recoverable).toBe(true);
      expect(result.suggestedActions).toContain('Check current inventory levels');
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Invalid quantity provided');
      
      const result = errorHandler.handleError(validationError);
      
      expect(result.errorType).toBe('validation');
      expect(result.severity).toBe('low');
      expect(result.recoverable).toBe(true);
      expect(result.suggestedActions).toContain('Verify input data is correct');
    });

    it('should categorize Firestore permission errors correctly', () => {
      const firestoreError = new Error('permission-denied: Insufficient permissions');
      
      const result = errorHandler.handleError(firestoreError);
      
      expect(result.errorType).toBe('firestore');
      expect(result.severity).toBe('high');
      expect(result.recoverable).toBe(false);
      expect(result.suggestedActions).toContain('Check user authentication status');
    });

    it('should categorize Firestore rate limit errors correctly', () => {
      const rateLimitError = new Error('quota exceeded');
      
      const result = errorHandler.handleError(rateLimitError);
      
      expect(result.errorType).toBe('firestore');
      expect(result.severity).toBe('high');
      expect(result.recoverable).toBe(true);
      expect(result.suggestedActions).toContain('Reduce batch size');
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Some random error');
      
      const result = errorHandler.handleError(unknownError);
      
      expect(result.errorType).toBe('unknown');
      expect(result.severity).toBe('medium');
      expect(result.message).toBe('Some random error');
    });

    it('should store error context in localStorage', () => {
      const error = new Error('Test error');
      
      errorHandler.handleError(error, { test: 'context' });
      
      const storedErrors = JSON.parse(localStorage.getItem('inventory_deduction_context') || '[]');
      expect(storedErrors).toHaveLength(1);
      expect(storedErrors[0].message).toBe('Test error');
    });
  });

  describe('attemptRecovery', () => {
    it('should not attempt recovery for non-recoverable errors', async () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'firestore',
        severity: 'high',
        message: 'Permission denied',
        context: {},
        recoverable: false,
        suggestedActions: []
      };
      
      const result = await errorHandler.attemptRecovery(error);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Error is not recoverable');
    });

    it('should attempt network error recovery', async () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'network',
        severity: 'medium',
        message: 'Network timeout',
        context: {},
        recoverable: true,
        suggestedActions: []
      };
      
      // Mock the delay to speed up tests
      jest.spyOn(errorHandler as any, 'delay').mockResolvedValue(undefined);
      
      const result = await errorHandler.attemptRecovery(error);
      
      // Recovery will fail without original request, but it should try
      expect(result.success).toBe(false);
    });

    it('should handle insufficient inventory recovery', async () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'insufficient_inventory',
        severity: 'low',
        message: 'Not enough inventory',
        context: {
          categoryGroupId: 'test-category',
          requestedQuantity: 10
        },
        recoverable: true,
        suggestedActions: []
      };
      
      const mockDocSnap = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue({ currentInventory: 5 })
      };
      mockGetDoc.mockResolvedValue(mockDocSnap as any);
      
      const result = await errorHandler.attemptRecovery(error);
      
      expect(mockGetDoc).toHaveBeenCalled();
      expect(result.suggestedActions).toContain('Partial fulfillment available: 5 units');
    });
  });

  describe('rollbackOperations', () => {
    it('should successfully rollback inventory operations', async () => {
      const operations: RollbackOperation[] = [
        {
          type: 'inventory_revert',
          categoryGroupId: 'test-category-1',
          data: {},
          originalValue: 100,
          completed: false
        },
        {
          type: 'category_revert',
          categoryGroupId: 'test-category-2',
          data: {},
          originalValue: 10,
          completed: false
        }
      ];
      
      const result = await errorHandler.rollbackOperations(operations);
      
      expect(result).toBe(true);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(mockMonitoringService.trackEvent).toHaveBeenCalledWith(
        'inventory_deduction_rollback_success',
        expect.objectContaining({
          rollbacksApplied: 2,
          totalOperations: 2
        })
      );
    });

    it('should handle rollback failures gracefully', async () => {
      const operations: RollbackOperation[] = [
        {
          type: 'inventory_revert',
          categoryGroupId: 'test-category-1',
          data: {},
          originalValue: 100,
          completed: false
        }
      ];
      
      mockBatch.commit.mockRejectedValue(new Error('Rollback failed'));
      
      const result = await errorHandler.rollbackOperations(operations);
      
      expect(result).toBe(false);
      expect(mockMonitoringService.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rollback failed: Rollback failed',
          severity: 'critical'
        })
      );
    });

    it('should return true for empty operations array', async () => {
      const result = await errorHandler.rollbackOperations([]);
      expect(result).toBe(true);
    });
  });

  describe('trackOperation and rollback stack management', () => {
    it('should track operations for rollback', () => {
      const operation = {
        type: 'inventory_revert' as const,
        categoryGroupId: 'test-category',
        data: { currentInventory: 50 },
        originalValue: 100
      };
      
      errorHandler.trackOperation(operation);
      
      const pending = errorHandler.getPendingRollbacks();
      expect(pending).toHaveLength(1);
      expect(pending[0].categoryGroupId).toBe('test-category');
      expect(pending[0].completed).toBe(false);
    });

    it('should mark operations as completed', () => {
      const operation = {
        type: 'inventory_revert' as const,
        categoryGroupId: 'test-category',
        data: {},
        originalValue: 100
      };
      
      errorHandler.trackOperation(operation);
      errorHandler.markOperationComplete('test-category');
      
      const pending = errorHandler.getPendingRollbacks();
      expect(pending).toHaveLength(0);
    });

    it('should clear rollback stack', () => {
      const operation = {
        type: 'inventory_revert' as const,
        categoryGroupId: 'test-category',
        data: {},
        originalValue: 100
      };
      
      errorHandler.trackOperation(operation);
      errorHandler.clearRollbackStack();
      
      const pending = errorHandler.getPendingRollbacks();
      expect(pending).toHaveLength(0);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly message for insufficient inventory', () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'insufficient_inventory',
        severity: 'low',
        message: 'Not enough inventory',
        context: { availableQuantity: 5 },
        recoverable: true,
        suggestedActions: ['Check inventory', 'Add more stock']
      };
      
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message.title).toBe('Insufficient Inventory');
      expect(message.description).toContain('Available: 5 units');
      expect(message.actions).toEqual(['Check inventory', 'Add more stock']);
    });

    it('should return user-friendly message for network errors', () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'network',
        severity: 'medium',
        message: 'Connection failed',
        context: {},
        recoverable: true,
        suggestedActions: ['Check connection', 'Retry']
      };
      
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message.title).toBe('Connection Problem');
      expect(message.description).toContain('check your internet connection');
    });

    it('should return user-friendly message for validation errors', () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'validation',
        severity: 'low',
        message: 'Invalid data',
        context: {},
        recoverable: true,
        suggestedActions: ['Fix data']
      };
      
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message.title).toBe('Invalid Data');
      expect(message.description).toContain('invalid or incomplete');
    });

    it('should return default message for unknown errors', () => {
      const error: DeductionError = {
        id: 'test-error',
        timestamp: new Date().toISOString(),
        errorType: 'unknown',
        severity: 'medium',
        message: 'Unknown error',
        context: {},
        recoverable: false,
        suggestedActions: []
      };
      
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message.title).toBe('Unexpected Error');
      expect(message.actions).toContain('Try again');
    });
  });

  describe('error history management', () => {
    it('should store and retrieve error history', () => {
      const error = new Error('Test error 1');
      errorHandler.handleError(error);
      
      const error2 = new Error('Test error 2');
      errorHandler.handleError(error2);
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Test error 1');
      expect(history[1].message).toBe('Test error 2');
    });

    it('should clear error history', () => {
      const error = new Error('Test error');
      errorHandler.handleError(error);
      
      errorHandler.clearErrorHistory();
      
      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(0);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      // Should not throw
      expect(() => {
        errorHandler.handleError(new Error('Test error'));
      }).not.toThrow();
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(inventoryDeductionErrorHandler).toBeInstanceOf(InventoryDeductionErrorHandler);
    });
  });
});
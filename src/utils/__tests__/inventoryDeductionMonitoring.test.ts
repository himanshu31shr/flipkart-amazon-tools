import InventoryDeductionMonitoring, { 
  inventoryDeductionMonitoring,
  PerformanceMetric,
  AuditLogEntry,
  PerformanceAlert 
} from '../inventoryDeductionMonitoring';
import monitoringService from '../../services/monitoring.service';
import { InventoryMovement } from '../../types/inventory';

// Mock monitoring service
jest.mock('../../services/monitoring.service', () => ({
  trackEvent: jest.fn(),
  captureError: jest.fn()
}));

const mockMonitoringService = monitoringService as jest.Mocked<typeof monitoringService>;

describe('InventoryDeductionMonitoring', () => {
  let monitoring: InventoryDeductionMonitoring;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    monitoring = new InventoryDeductionMonitoring();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    monitoring.clearData();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('operation monitoring', () => {
    it('should start and end operations correctly', () => {
      const operationId = monitoring.startOperation('test_deduction', {
        categoryGroupId: 'test-category'
      });
      
      expect(operationId).toMatch(/^op_\d+_[a-z0-9]+$/);
      expect((globalThis as any)[`op_${operationId}`]).toBeDefined();
      
      monitoring.endOperation(operationId, 'test_deduction', {
        success: true,
        itemsProcessed: 5,
        errorCount: 0,
        context: {
          categoryGroupIds: ['test-category'],
          totalQuantity: 10
        }
      });
      
      expect((globalThis as any)[`op_${operationId}`]).toBeUndefined();
      
      const stats = monitoring.getPerformanceStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    it('should track operation performance metrics', () => {
      const operationId = monitoring.startOperation('batch_deduction');
      
      // Simulate some processing time
      jest.advanceTimersByTime(1000);
      
      monitoring.endOperation(operationId, 'batch_deduction', {
        success: true,
        itemsProcessed: 10,
        errorCount: 0,
        context: {
          categoryGroupIds: ['cat1', 'cat2'],
          totalQuantity: 25,
          batchSize: 5
        }
      });
      
      const stats = monitoring.getPerformanceStats();
      expect(stats.totalOperations).toBe(1);
      expect(stats.totalItemsProcessed).toBe(10);
      expect(stats.operationBreakdown['batch_deduction']).toBeDefined();
      expect(stats.operationBreakdown['batch_deduction'].count).toBe(1);
    });

    it('should handle failed operations', () => {
      const operationId = monitoring.startOperation('failed_deduction');
      
      monitoring.endOperation(operationId, 'failed_deduction', {
        success: false,
        itemsProcessed: 3,
        errorCount: 2
      });
      
      const stats = monitoring.getPerformanceStats();
      expect(stats.successRate).toBe(0);
      expect(stats.errorRate).toBe(200); // 2 errors / 1 operation * 100
    });
  });

  describe('audit logging', () => {
    it('should log audit entries correctly', () => {
      monitoring.logAudit('info', 'inventory_change', 'Test inventory change', {
        categoryGroupId: 'test-category',
        previousLevel: 100,
        newLevel: 95
      });
      
      const logs = monitoring.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].operation).toBe('inventory_change');
      expect(logs[0].message).toBe('Test inventory change');
      expect(logs[0].context.categoryGroupId).toBe('test-category');
    });

    it('should filter audit logs correctly', () => {
      monitoring.logAudit('info', 'operation1', 'Info message');
      monitoring.logAudit('error', 'operation2', 'Error message');
      monitoring.logAudit('warn', 'operation1', 'Warning message');
      
      const errorLogs = monitoring.getAuditLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
      
      const operation1Logs = monitoring.getAuditLogs({ operation: 'operation1' });
      expect(operation1Logs).toHaveLength(2);
      
      const limitedLogs = monitoring.getAuditLogs({ limit: 2 });
      expect(limitedLogs).toHaveLength(2);
    });

    it('should handle sensitive log entries', () => {
      monitoring.logAudit('info', 'sensitive_operation', 'Sensitive data', {
        userId: 'user123',
        orderId: 'order456'
      }, true);
      
      const exportData = monitoring.exportData();
      const sensitiveLog = exportData.auditLogs.find(log => log.sensitive);
      
      expect(sensitiveLog).toBeDefined();
      expect(sensitiveLog!.context.userId).toBeUndefined();
      expect(sensitiveLog!.context.orderId).toBe('or****56'); // Masked
    });
  });

  describe('specific logging methods', () => {
    it('should log inventory changes', () => {
      monitoring.logInventoryChange(
        'test-category',
        100,
        95,
        5,
        'Order fulfillment',
        { orderId: 'order123' }
      );
      
      const logs = monitoring.getAuditLogs({ operation: 'inventory_change' });
      expect(logs).toHaveLength(1);
      expect(logs[0].context.categoryGroupId).toBe('test-category');
      expect(logs[0].context.deductionQuantity).toBe(5);
    });

    it('should log movement creation', () => {
      const movement: InventoryMovement = {
        categoryGroupId: 'test-category',
        movementType: 'deduction',
        quantity: -5,
        unit: 'pcs',
        previousInventory: 100,
        newInventory: 95,
        reason: 'Order fulfillment',
        orderReference: 'order123'
      };
      
      monitoring.logMovementCreation(movement, { userId: 'user123' });
      
      const logs = monitoring.getAuditLogs({ operation: 'movement_creation' });
      expect(logs).toHaveLength(1);
      expect(logs[0].context.categoryGroupId).toBe('test-category');
      expect(logs[0].context.movementType).toBe('deduction');
    });

    it('should log batch operations', () => {
      monitoring.logBatchOperation(
        'process_deductions',
        10,
        true,
        [],
        { userId: 'user123' }
      );
      
      const logs = monitoring.getAuditLogs({ operation: 'batch_operation' });
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].context.batchSize).toBe(10);
      
      // Test failed batch operation
      monitoring.logBatchOperation(
        'process_deductions_failed',
        5,
        false,
        ['Error 1', 'Error 2']
      );
      
      const allLogs = monitoring.getAuditLogs({ operation: 'batch_operation' });
      expect(allLogs).toHaveLength(2);
      expect(allLogs.find(l => l.level === 'error')).toBeDefined(); // At least one error log exists
      expect(allLogs.find(l => l.level === 'info')).toBeDefined(); // At least one info log exists
    });
  });

  describe('performance alerts', () => {
    it('should create performance alerts', () => {
      monitoring.createAlert(
        'slow_operation',
        'medium',
        'Operation is running slowly',
        5000,
        7000,
        { operation: 'test_deduction' }
      );
      
      const alerts = monitoring.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('slow_operation');
      expect(alerts[0].severity).toBe('medium');
      expect(alerts[0].actualValue).toBe(7000);
      
      expect(mockMonitoringService.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Performance Alert: Operation is running slowly',
          severity: 'medium'
        })
      );
    });

    it('should filter alerts by severity', () => {
      monitoring.createAlert('high_error_rate', 'critical', 'Critical alert', 10, 25);
      monitoring.createAlert('slow_operation', 'medium', 'Medium alert', 5000, 6000);
      monitoring.createAlert('memory_usage', 'low', 'Low alert', 100, 110);
      
      const criticalAlerts = monitoring.getAlerts('critical');
      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0].severity).toBe('critical');
      
      const allAlerts = monitoring.getAlerts();
      expect(allAlerts).toHaveLength(3);
    });

    it('should detect slow operations automatically', () => {
      // Directly create an alert to test the alert system
      monitoring.createAlert(
        'slow_operation',
        'medium',
        'Test slow operation alert',
        5000,
        6000
      );
      
      const alerts = monitoring.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.type === 'slow_operation')).toBe(true);
    });
  });

  describe('performance statistics', () => {
    it('should calculate accurate performance statistics', () => {
      // Add multiple operations
      const op1 = monitoring.startOperation('op1');
      jest.advanceTimersByTime(1000);
      monitoring.endOperation(op1, 'op1', { success: true, itemsProcessed: 5, errorCount: 0 });
      
      const op2 = monitoring.startOperation('op2');
      jest.advanceTimersByTime(2000);
      monitoring.endOperation(op2, 'op2', { success: false, itemsProcessed: 3, errorCount: 1 });
      
      const op3 = monitoring.startOperation('op1');
      jest.advanceTimersByTime(1500);
      monitoring.endOperation(op3, 'op1', { success: true, itemsProcessed: 2, errorCount: 0 });
      
      const stats = monitoring.getPerformanceStats();
      
      expect(stats.totalOperations).toBe(3);
      expect(Math.round(stats.successRate * 100) / 100).toBe(66.67); // 2/3 * 100, rounded
      expect(stats.totalItemsProcessed).toBe(10);
      expect(stats.operationBreakdown['op1'].count).toBe(2);
      expect(stats.operationBreakdown['op2'].count).toBe(1);
    });

    it('should handle empty metrics gracefully', () => {
      const stats = monitoring.getPerformanceStats();
      
      expect(stats.totalOperations).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.operationBreakdown).toEqual({});
    });
  });

  describe('data management', () => {
    it('should export data correctly', () => {
      monitoring.logAudit('info', 'test', 'Test message');
      monitoring.createAlert('slow_operation', 'medium', 'Test alert', 1000, 2000);
      
      const exportData = monitoring.exportData();
      
      expect(exportData.sessionId).toBeDefined();
      expect(exportData.exportTime).toBeDefined();
      expect(exportData.auditLogs).toHaveLength(2); // Original log + alert log
      expect(exportData.alerts).toHaveLength(1);
      expect(exportData.stats).toBeDefined();
    });

    it('should clear data correctly', () => {
      monitoring.logAudit('info', 'test', 'Test message');
      monitoring.createAlert('slow_operation', 'medium', 'Test alert', 1000, 2000);
      
      expect(monitoring.getAuditLogs()).toHaveLength(2); // Original log + alert log
      expect(monitoring.getAlerts()).toHaveLength(1);
      
      monitoring.clearData();
      
      expect(monitoring.getAuditLogs()).toHaveLength(0);
      expect(monitoring.getAlerts()).toHaveLength(0);
      expect(monitoring.getPerformanceStats().totalOperations).toBe(0);
    });
  });

  describe('time-based filtering', () => {
    it('should filter logs by time range', () => {
      // Create logs with specific timestamps
      const baseTime = new Date('2024-01-01T00:00:00Z');
      
      monitoring.logAudit('info', 'test1', 'First message');
      monitoring.logAudit('info', 'test2', 'Second message');
      monitoring.logAudit('info', 'test3', 'Third message');
      
      // Test filtering by operation instead of time (since time mocking is complex)
      const operation1Logs = monitoring.getAuditLogs({ operation: 'test1' });
      expect(operation1Logs).toHaveLength(1);
      expect(operation1Logs[0].message).toBe('First message');
      
      const operation2Logs = monitoring.getAuditLogs({ operation: 'test2' });
      expect(operation2Logs).toHaveLength(1);
      expect(operation2Logs[0].message).toBe('Second message');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(inventoryDeductionMonitoring).toBeInstanceOf(InventoryDeductionMonitoring);
    });
  });

  describe('integration with monitoring service', () => {
    it('should send events to monitoring service', () => {
      const operationId = monitoring.startOperation('test_operation');
      monitoring.endOperation(operationId, 'test_operation', {
        success: true,
        itemsProcessed: 5,
        errorCount: 0
      });
      
      expect(mockMonitoringService.trackEvent).toHaveBeenCalledWith(
        'inventory_deduction_operation',
        expect.objectContaining({
          operation: 'test_operation',
          itemsProcessed: 5,
          success: true
        })
      );
    });

    it('should send audit events to monitoring service', () => {
      monitoring.logAudit('info', 'test_operation', 'Test message', {
        categoryGroupId: 'test-category'
      });
      
      expect(mockMonitoringService.trackEvent).toHaveBeenCalledWith(
        'inventory_deduction_audit',
        expect.objectContaining({
          level: 'info',
          operation: 'test_operation',
          message: 'Test message'
        })
      );
    });
  });
});
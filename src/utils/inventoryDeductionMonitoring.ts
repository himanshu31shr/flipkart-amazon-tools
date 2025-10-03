import monitoringService from '../services/monitoring.service';
import { InventoryMovement } from '../types/inventory';

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  operation: string;
  duration: number; // milliseconds
  itemsProcessed: number;
  success: boolean;
  errorCount: number;
  context: {
    userId?: string;
    sessionId: string;
    categoryGroupIds: string[];
    totalQuantity: number;
    batchSize?: number;
    retryCount?: number;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  operation: string;
  message: string;
  context: {
    userId?: string;
    sessionId: string;
    categoryGroupId?: string;
    requestedQuantity?: number;
    actualDeduction?: number;
    newInventoryLevel?: number;
    reason?: string;
    orderId?: string;
    batchId?: string;
    operationId?: string;
    previousLevel?: number;
    movementType?: string;
    batchSize?: number;
    alertType?: string;
    deductionQuantity?: number;
    currentBatch?: number;
    totalBatches?: number;
    completedOperations?: number;
    newLevel?: number;
    startTime?: number;
    duration?: number;
    quantity?: number;
    errorCount?: number;
    threshold?: number;
    itemsProcessed?: number;
    previousInventory?: number;
    errors?: number;
    actualValue?: number;
    newInventory?: number;
    errorDetails?: string[];
  };
  sensitive: boolean; // Whether this log contains sensitive data
}

export interface PerformanceAlert {
  id: string;
  timestamp: string;
  type: 'slow_operation' | 'high_error_rate' | 'memory_usage' | 'batch_timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  actualValue: number;
  context: Record<string, unknown>;
}

class InventoryDeductionMonitoring {
  private readonly PERFORMANCE_THRESHOLDS = {
    slowOperationMs: 5000,
    highErrorRatePercent: 10,
    batchTimeoutMs: 30000,
    maxMemoryUsageMB: 100
  };

  private performanceMetrics: PerformanceMetric[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private alerts: PerformanceAlert[] = [];
  private sessionId: string;
  private operationCounters = new Map<string, { total: number; errors: number; duration: number }>();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceMonitoring();
  }

  /**
   * Start monitoring a deduction operation
   */
  startOperation(operation: string, context?: Record<string, unknown>): string {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    this.logAudit('info', operation, 'Operation started', {
      operationId,
      startTime,
      ...context
    });

    // Store start time for duration calculation
    (globalThis as unknown as Record<string, number>)[`op_${operationId}`] = startTime;
    
    return operationId;
  }

  /**
   * End monitoring a deduction operation
   */
  endOperation(
    operationId: string,
    operation: string,
    result: {
      success: boolean;
      itemsProcessed: number;
      errorCount: number;
      context?: Record<string, unknown>;
    }
  ): void {
    const endTime = Date.now();
    const startTime = (globalThis as unknown as Record<string, number>)[`op_${operationId}`] || endTime;
    const duration = endTime - startTime;

    // Clean up
    delete (globalThis as unknown as Record<string, number>)[`op_${operationId}`];

    // Create performance metric
    const metric: PerformanceMetric = {
      id: `perf_${operationId}`,
      timestamp: new Date().toISOString(),
      operation,
      duration,
      itemsProcessed: result.itemsProcessed,
      success: result.success,
      errorCount: result.errorCount,
      context: {
        sessionId: this.sessionId,
        categoryGroupIds: (result.context?.categoryGroupIds as string[]) || [],
        totalQuantity: (result.context?.totalQuantity as number) || 0,
        batchSize: result.context?.batchSize as number | undefined,
        retryCount: result.context?.retryCount as number | undefined
      }
    };

    this.performanceMetrics.push(metric);
    this.updateOperationCounters(operation, duration, result.errorCount > 0);

    // Log completion
    this.logAudit(
      result.success ? 'info' : 'error',
      operation,
      `Operation ${result.success ? 'completed' : 'failed'}`,
      {
        operationId,
        duration,
        itemsProcessed: result.itemsProcessed,
        errorCount: result.errorCount,
        ...result.context
      }
    );

    // Check for performance alerts
    this.checkPerformanceThresholds(metric);

    // Send to monitoring service
    monitoringService.trackEvent('inventory_deduction_operation', {
      operation,
      duration,
      itemsProcessed: result.itemsProcessed,
      success: result.success,
      errorCount: result.errorCount,
      sessionId: this.sessionId
    });
  }

  /**
   * Log audit entry for inventory deduction
   */
  logAudit(
    level: AuditLogEntry['level'],
    operation: string,
    message: string,
    context: Partial<AuditLogEntry['context']> = {},
    sensitive: boolean = false
  ): void {
    const auditEntry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      context: {
        sessionId: this.sessionId,
        ...context
      },
      sensitive
    };

    this.auditLogs.push(auditEntry);

    // Send to monitoring service with appropriate filtering
    const logData = sensitive ? this.sanitizeLogEntry(auditEntry) : auditEntry;
    
    monitoringService.trackEvent('inventory_deduction_audit', {
      level,
      operation,
      message,
      auditId: auditEntry.id,
      sensitive,
      context: logData.context
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : console.log;
      
      logMethod(`[${level.toUpperCase()}] ${operation}: ${message}`, context);
    }
  }

  /**
   * Log inventory level change
   */
  logInventoryChange(
    categoryGroupId: string,
    previousLevel: number,
    newLevel: number,
    deductionQuantity: number,
    reason: string,
    context?: Record<string, unknown>
  ): void {
    this.logAudit('info', 'inventory_change', 'Inventory level updated', {
      categoryGroupId,
      previousLevel,
      newLevel,
      deductionQuantity,
      reason,
      ...context
    });
  }

  /**
   * Log movement creation
   */
  logMovementCreation(movement: InventoryMovement, context?: Record<string, unknown>): void {
    this.logAudit('info', 'movement_creation', 'Inventory movement created', {
      categoryGroupId: movement.categoryGroupId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      previousInventory: movement.previousInventory,
      newInventory: movement.newInventory,
      reason: movement.reason,
      orderId: movement.orderReference,
      ...context
    });
  }

  /**
   * Log batch operation
   */
  logBatchOperation(
    operation: string,
    batchSize: number,
    success: boolean,
    errors: string[] = [],
    context?: Record<string, unknown>
  ): void {
    this.logAudit(
      success ? 'info' : 'error',
      'batch_operation',
      `Batch ${operation} ${success ? 'completed' : 'failed'}`,
      {
        batchSize,
        errorCount: errors.length,
        errorDetails: errors.slice(0, 5), // Limit error details
        ...context
      }
    );
  }

  /**
   * Create performance alert
   */
  createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    actualValue: number,
    context: Record<string, unknown> = {}
  ): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      threshold,
      actualValue,
      context: {
        sessionId: this.sessionId,
        ...context
      }
    };

    this.alerts.push(alert);

    // Send to monitoring service
    monitoringService.captureError({
      message: `Performance Alert: ${message}`,
      severity: severity === 'critical' ? 'critical' : 'medium',
      tags: {
        alertType: type,
        alertSeverity: severity,
        threshold: threshold.toString(),
        actualValue: actualValue.toString()
      },
      context: alert.context
    });

    // Log the alert
    this.logAudit('warn', 'performance_alert', message, {
      alertType: type,
      threshold,
      actualValue,
      ...context
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    errorRate: number;
    totalItemsProcessed: number;
    operationBreakdown: Record<string, { count: number; avgDuration: number; errorRate: number }>;
  } {
    const totalOps = this.performanceMetrics.length;
    
    if (totalOps === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        errorRate: 0,
        totalItemsProcessed: 0,
        operationBreakdown: {}
      };
    }

    const successful = this.performanceMetrics.filter(m => m.success).length;
    const totalDuration = this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalItems = this.performanceMetrics.reduce((sum, m) => sum + m.itemsProcessed, 0);
    const totalErrors = this.performanceMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    // Create operation breakdown
    const operationBreakdown: Record<string, { count: number; avgDuration: number; errorRate: number }> = {};
    
    for (const metric of this.performanceMetrics) {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = { count: 0, avgDuration: 0, errorRate: 0 };
      }
      
      const breakdown = operationBreakdown[metric.operation];
      breakdown.count++;
      breakdown.avgDuration = (breakdown.avgDuration * (breakdown.count - 1) + metric.duration) / breakdown.count;
      breakdown.errorRate = (breakdown.errorRate * (breakdown.count - 1) + (metric.errorCount > 0 ? 1 : 0)) / breakdown.count * 100;
    }

    return {
      totalOperations: totalOps,
      averageDuration: totalDuration / totalOps,
      successRate: (successful / totalOps) * 100,
      errorRate: (totalErrors / totalOps) * 100,
      totalItemsProcessed: totalItems,
      operationBreakdown
    };
  }

  /**
   * Get recent audit logs
   */
  getAuditLogs(
    filters: {
      level?: AuditLogEntry['level'];
      operation?: string;
      categoryGroupId?: string;
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    // Apply filters
    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }
    
    if (filters.operation) {
      logs = logs.filter(log => log.operation === filters.operation);
    }
    
    if (filters.categoryGroupId) {
      logs = logs.filter(log => log.context.categoryGroupId === filters.categoryGroupId);
    }
    
    if (filters.startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.startTime!);
    }
    
    if (filters.endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= filters.endTime!);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  /**
   * Get recent alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    let alerts = [...this.alerts];
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Clear monitoring data
   */
  clearData(): void {
    this.performanceMetrics = [];
    this.auditLogs = [];
    this.alerts = [];
    this.operationCounters.clear();
  }

  /**
   * Export monitoring data for external analysis
   */
  exportData(): {
    sessionId: string;
    exportTime: string;
    performanceMetrics: PerformanceMetric[];
    auditLogs: AuditLogEntry[];
    alerts: PerformanceAlert[];
    stats: {
      totalOperations: number;
      averageDuration: number;
      successRate: number;
      errorRate: number;
      totalItemsProcessed: number;
      operationBreakdown: Record<string, { count: number; avgDuration: number; errorRate: number }>;
    };
  } {
    return {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      performanceMetrics: this.performanceMetrics,
      auditLogs: this.auditLogs.map(log => log.sensitive ? this.sanitizeLogEntry(log) : log),
      alerts: this.alerts,
      stats: this.getPerformanceStats()
    };
  }

  private initializePerformanceMonitoring(): void {
    // Set up periodic performance checks
    setInterval(() => {
      this.checkOverallPerformance();
    }, 60000); // Check every minute

    // Set up memory monitoring
    if ('performance' in window && 'memory' in (performance as Performance & { memory?: unknown })) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    // Check for slow operations
    if (metric.duration > this.PERFORMANCE_THRESHOLDS.slowOperationMs) {
      this.createAlert(
        'slow_operation',
        metric.duration > this.PERFORMANCE_THRESHOLDS.slowOperationMs * 2 ? 'high' : 'medium',
        `Slow ${metric.operation} operation detected`,
        this.PERFORMANCE_THRESHOLDS.slowOperationMs,
        metric.duration,
        {
          operation: metric.operation,
          itemsProcessed: metric.itemsProcessed
        }
      );
    }

    // Check batch timeout
    if (metric.operation.includes('batch') && metric.duration > this.PERFORMANCE_THRESHOLDS.batchTimeoutMs) {
      this.createAlert(
        'batch_timeout',
        'high',
        `Batch operation timeout detected`,
        this.PERFORMANCE_THRESHOLDS.batchTimeoutMs,
        metric.duration,
        {
          operation: metric.operation,
          itemsProcessed: metric.itemsProcessed
        }
      );
    }
  }

  private checkOverallPerformance(): void {
    const recentMetrics = this.performanceMetrics.filter(
      metric => Date.now() - new Date(metric.timestamp).getTime() < 300000 // Last 5 minutes
    );

    if (recentMetrics.length === 0) return;

    // Check error rate
    const errorRate = (recentMetrics.filter(m => m.errorCount > 0).length / recentMetrics.length) * 100;
    
    if (errorRate > this.PERFORMANCE_THRESHOLDS.highErrorRatePercent) {
      this.createAlert(
        'high_error_rate',
        errorRate > this.PERFORMANCE_THRESHOLDS.highErrorRatePercent * 2 ? 'critical' : 'high',
        `High error rate detected in recent operations`,
        this.PERFORMANCE_THRESHOLDS.highErrorRatePercent,
        errorRate,
        {
          recentOperations: recentMetrics.length,
          timeWindow: '5 minutes'
        }
      );
    }
  }

  private checkMemoryUsage(): void {
    if ('performance' in window && 'memory' in (performance as Performance & { memory?: unknown })) {
      const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > this.PERFORMANCE_THRESHOLDS.maxMemoryUsageMB) {
        this.createAlert(
          'memory_usage',
          usedMB > this.PERFORMANCE_THRESHOLDS.maxMemoryUsageMB * 1.5 ? 'critical' : 'high',
          `High memory usage detected`,
          this.PERFORMANCE_THRESHOLDS.maxMemoryUsageMB,
          usedMB,
          {
            totalHeapSize: memory.totalJSHeapSize / 1024 / 1024,
            heapLimit: memory.jsHeapSizeLimit / 1024 / 1024
          }
        );
      }
    }
  }

  private updateOperationCounters(operation: string, duration: number, hasError: boolean): void {
    const current = this.operationCounters.get(operation) || { total: 0, errors: 0, duration: 0 };
    
    current.total++;
    current.duration = (current.duration * (current.total - 1) + duration) / current.total;
    if (hasError) current.errors++;
    
    this.operationCounters.set(operation, current);
  }

  private sanitizeLogEntry(entry: AuditLogEntry): AuditLogEntry {
    // Remove or mask sensitive information
    const sanitizedContext = { ...entry.context };
    
    // Remove potentially sensitive fields
    delete sanitizedContext.userId;
    if (sanitizedContext.orderId) {
      sanitizedContext.orderId = this.maskString(sanitizedContext.orderId as string);
    }
    
    return {
      ...entry,
      context: sanitizedContext
    };
  }

  private maskString(value: string): string {
    if (value.length <= 4) return '***';
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  private generateSessionId(): string {
    return `inv_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// Singleton instance
export const inventoryDeductionMonitoring = new InventoryDeductionMonitoring();

export default InventoryDeductionMonitoring;
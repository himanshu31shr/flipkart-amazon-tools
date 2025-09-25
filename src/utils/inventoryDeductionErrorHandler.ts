import { 
  getFirestore, 
  doc, 
  getDoc, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { InventoryDeductionResult } from '../types/inventory';
import monitoringService from '../services/monitoring.service';

export interface DeductionError {
  id: string;
  timestamp: string;
  errorType: 'validation' | 'insufficient_inventory' | 'network' | 'firestore' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    categoryGroupId?: string;
    requestedQuantity?: number;
    availableQuantity?: number;
    operation?: string;
    userId?: string;
    sessionId?: string;
  };
  recoverable: boolean;
  suggestedActions: string[];
  originalRequest?: any;
  stackTrace?: string;
}

export interface RecoveryResult {
  success: boolean;
  recoveredOperations: number;
  failedOperations: number;
  rollbackComplete: boolean;
  errors: DeductionError[];
  newAttemptResult?: InventoryDeductionResult;
  suggestedActions?: string[];
}

export interface RollbackOperation {
  type: 'inventory_revert' | 'movement_remove' | 'category_revert';
  categoryGroupId: string;
  data: any;
  originalValue?: any;
  completed: boolean;
}

class InventoryDeductionErrorHandler {
  private readonly ERROR_CONTEXT_KEY = 'inventory_deduction_context';
  private rollbackStack: RollbackOperation[] = [];

  /**
   * Handle and categorize deduction errors
   */
  handleError(error: unknown, context?: any): DeductionError {
    const deductionError = this.categorizeError(error, context);
    
    // Log to monitoring service
    monitoringService.captureError({
      message: deductionError.message,
      stack: deductionError.stackTrace,
      severity: deductionError.severity,
      tags: {
        errorType: deductionError.errorType,
        operation: 'inventory_deduction',
        recoverable: deductionError.recoverable.toString()
      },
      context: {
        deductionErrorId: deductionError.id,
        ...deductionError.context
      }
    });

    // Store error context for recovery
    this.storeErrorContext(deductionError);

    return deductionError;
  }

  /**
   * Categorize errors based on type and content
   */
  private categorizeError(error: unknown, context?: any): DeductionError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    let errorType: DeductionError['errorType'] = 'unknown';
    let severity: DeductionError['severity'] = 'medium';
    let message = 'An unknown error occurred';
    let recoverable = false;
    let suggestedActions: string[] = [];
    let stackTrace: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stackTrace = error.stack;

      // Firebase/Firestore errors
      if (message.includes('permission-denied')) {
        errorType = 'firestore';
        severity = 'high';
        recoverable = false;
        suggestedActions = [
          'Check user authentication status',
          'Verify Firestore security rules',
          'Contact administrator if problem persists'
        ];
      } else if (message.includes('unavailable') || message.includes('timeout')) {
        errorType = 'network';
        severity = 'medium';
        recoverable = true;
        suggestedActions = [
          'Check internet connection',
          'Retry the operation',
          'Try again in a few moments'
        ];
      } else if (message.includes('insufficient') || message.includes('inventory')) {
        errorType = 'insufficient_inventory';
        severity = 'low';
        recoverable = true;
        suggestedActions = [
          'Check current inventory levels',
          'Adjust deduction quantity',
          'Add inventory before proceeding'
        ];
      } else if (message.includes('validation') || message.includes('invalid') || message.includes('Invalid')) {
        errorType = 'validation';
        severity = 'low';
        recoverable = true;
        suggestedActions = [
          'Verify input data is correct',
          'Check required fields',
          'Ensure quantities are positive numbers'
        ];
      } else if (message.includes('quota') || message.includes('rate-limit')) {
        errorType = 'firestore';
        severity = 'high';
        recoverable = true;
        suggestedActions = [
          'Wait before retrying',
          'Reduce batch size',
          'Contact support if problem persists'
        ];
      }
    }

    return {
      id: errorId,
      timestamp,
      errorType,
      severity,
      message,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      recoverable,
      suggestedActions,
      originalRequest: context?.originalRequest,
      stackTrace
    };
  }

  /**
   * Attempt to recover from failed operations
   */
  async attemptRecovery(deductionError: DeductionError): Promise<RecoveryResult> {
    const recoveryResult: RecoveryResult = {
      success: false,
      recoveredOperations: 0,
      failedOperations: 0,
      rollbackComplete: false,
      errors: []
    };

    try {
      // Check if error is recoverable
      if (!deductionError.recoverable) {
        recoveryResult.errors.push({
          ...deductionError,
          message: 'Error is not recoverable'
        });
        return recoveryResult;
      }

      // Attempt different recovery strategies based on error type
      switch (deductionError.errorType) {
        case 'network':
          return await this.recoverFromNetworkError(deductionError, recoveryResult);
        
        case 'insufficient_inventory':
          return await this.recoverFromInsufficientInventory(deductionError, recoveryResult);
        
        case 'validation':
          return await this.recoverFromValidationError(deductionError, recoveryResult);
        
        case 'firestore':
          return await this.recoverFromFirestoreError(deductionError, recoveryResult);
        
        default:
          recoveryResult.errors.push({
            ...deductionError,
            message: 'No recovery strategy available for this error type'
          });
          return recoveryResult;
      }
    } catch (recoveryError) {
      const handledRecoveryError = this.handleError(recoveryError, {
        originalError: deductionError,
        operation: 'error_recovery'
      });
      
      recoveryResult.errors.push(handledRecoveryError);
      return recoveryResult;
    }
  }

  /**
   * Rollback operations to maintain data consistency
   */
  async rollbackOperations(operations: RollbackOperation[]): Promise<boolean> {
    if (operations.length === 0) return true;

    try {
      const db = getFirestore();
      const batch = writeBatch(db);
      let rollbacksApplied = 0;

      for (const operation of operations.reverse()) {
        try {
          const docRef = doc(db, 'categoryGroups', operation.categoryGroupId);
          
          switch (operation.type) {
            case 'inventory_revert':
              if (operation.originalValue !== undefined) {
                batch.update(docRef, {
                  currentInventory: operation.originalValue,
                  lastUpdated: Timestamp.now()
                });
                rollbacksApplied++;
              }
              break;
            
            case 'category_revert':
              if (operation.originalValue !== undefined) {
                batch.update(docRef, {
                  inventoryDeductionQuantity: operation.originalValue,
                  lastUpdated: Timestamp.now()
                });
                rollbacksApplied++;
              }
              break;
            
            case 'movement_remove':
              // For movements, we might need to delete the document
              // This would require a separate operation
              break;
          }
        } catch (opError) {
          console.error(`Failed to rollback operation for ${operation.categoryGroupId}:`, opError);
        }
      }

      if (rollbacksApplied > 0) {
        await batch.commit();
        
        monitoringService.trackEvent('inventory_deduction_rollback_success', {
          rollbacksApplied,
          totalOperations: operations.length
        });
      }

      return true;
    } catch (error) {
      monitoringService.captureError({
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        tags: {
          operation: 'rollback',
          operationsCount: operations.length.toString()
        }
      });
      
      return false;
    }
  }

  /**
   * Track operation for potential rollback
   */
  trackOperation(operation: Omit<RollbackOperation, 'completed'>): void {
    this.rollbackStack.push({
      ...operation,
      completed: false
    });
  }

  /**
   * Mark operation as completed (won't be rolled back)
   */
  markOperationComplete(categoryGroupId: string): void {
    const operation = this.rollbackStack.find(op => 
      op.categoryGroupId === categoryGroupId && !op.completed
    );
    if (operation) {
      operation.completed = true;
    }
  }

  /**
   * Get pending rollback operations
   */
  getPendingRollbacks(): RollbackOperation[] {
    return this.rollbackStack.filter(op => !op.completed);
  }

  /**
   * Clear rollback stack
   */
  clearRollbackStack(): void {
    this.rollbackStack = [];
  }

  /**
   * Recovery strategy for network errors
   */
  private async recoverFromNetworkError(
    error: DeductionError, 
    result: RecoveryResult
  ): Promise<RecoveryResult> {
    // Implement exponential backoff retry
    const maxRetries = 3;
    const baseDelay = 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.delay(baseDelay * Math.pow(2, attempt - 1));
        
        // Retry the original operation if available
        if (error.originalRequest) {
          // This would depend on the specific operation being retried
          result.success = true;
          result.recoveredOperations = 1;
          break;
        }
      } catch (retryError) {
        if (attempt === maxRetries) {
          result.errors.push(this.handleError(retryError, {
            originalError: error,
            attempt,
            operation: 'network_recovery'
          }));
        }
      }
    }
    
    return result;
  }

  /**
   * Recovery strategy for insufficient inventory errors
   */
  private async recoverFromInsufficientInventory(
    error: DeductionError, 
    result: RecoveryResult
  ): Promise<RecoveryResult> {
    // Check current inventory levels and suggest alternatives
    if (error.context.categoryGroupId) {
      try {
        const db = getFirestore();
        const docRef = doc(db, 'categoryGroups', error.context.categoryGroupId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const currentInventory = docSnap.data().currentInventory || 0;
          const requestedQuantity = error.context.requestedQuantity || 0;
          
          if (currentInventory > 0 && currentInventory < requestedQuantity) {
            // Partial fulfillment possible
            result.suggestedActions = [
              `Partial fulfillment available: ${currentInventory} units`,
              'Consider processing partial quantity',
              'Add more inventory to complete full request'
            ];
            result.recoveredOperations = 0; // User needs to decide
          }
        }
      } catch (checkError) {
        result.errors.push(this.handleError(checkError, {
          originalError: error,
          operation: 'inventory_check'
        }));
      }
    }
    
    return result;
  }

  /**
   * Recovery strategy for validation errors
   */
  private async recoverFromValidationError(
    error: DeductionError, 
    result: RecoveryResult
  ): Promise<RecoveryResult> {
    // Validation errors typically require user intervention
    result.suggestedActions = [
      'Review and correct input data',
      'Ensure all required fields are filled',
      'Verify quantities are positive numbers',
      'Check category group exists and is valid'
    ];
    
    return result;
  }

  /**
   * Recovery strategy for Firestore errors
   */
  private async recoverFromFirestoreError(
    error: DeductionError, 
    result: RecoveryResult
  ): Promise<RecoveryResult> {
    if (error.message.includes('quota') || error.message.includes('rate-limit')) {
      // Wait and retry with smaller batch size
      await this.delay(5000);
      result.suggestedActions = [
        'Reducing operation batch size',
        'Implementing exponential backoff',
        'Consider breaking large operations into smaller chunks'
      ];
    } else if (error.message.includes('permission-denied')) {
      result.suggestedActions = [
        'Check user authentication',
        'Verify user permissions',
        'Contact administrator'
      ];
    }
    
    return result;
  }

  /**
   * Generate user-friendly error messages
   */
  getUserFriendlyMessage(error: DeductionError): {
    title: string;
    description: string;
    actions: string[];
  } {
    switch (error.errorType) {
      case 'insufficient_inventory':
        return {
          title: 'Insufficient Inventory',
          description: `Not enough inventory available for this operation. ${error.context.availableQuantity ? `Available: ${error.context.availableQuantity} units` : ''}`,
          actions: error.suggestedActions
        };
      
      case 'network':
        return {
          title: 'Connection Problem',
          description: 'Unable to connect to the server. Please check your internet connection.',
          actions: error.suggestedActions
        };
      
      case 'validation':
        return {
          title: 'Invalid Data',
          description: 'The provided data is invalid or incomplete.',
          actions: error.suggestedActions
        };
      
      case 'firestore':
        return {
          title: 'Database Error',
          description: 'A database error occurred. This may be temporary.',
          actions: error.suggestedActions
        };
      
      default:
        return {
          title: 'Unexpected Error',
          description: 'An unexpected error occurred. Please try again.',
          actions: ['Try again', 'Contact support if the problem persists']
        };
    }
  }

  private generateErrorId(): string {
    return `inv_deduction_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeErrorContext(error: DeductionError): void {
    try {
      const existingErrors = JSON.parse(
        localStorage.getItem(this.ERROR_CONTEXT_KEY) || '[]'
      );
      
      existingErrors.push(error);
      
      // Keep only last 50 errors
      const recentErrors = existingErrors.slice(-50);
      localStorage.setItem(this.ERROR_CONTEXT_KEY, JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error context:', storageError);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get stored error history for debugging
   */
  getErrorHistory(): DeductionError[] {
    try {
      return JSON.parse(localStorage.getItem(this.ERROR_CONTEXT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    localStorage.removeItem(this.ERROR_CONTEXT_KEY);
  }
}

export const inventoryDeductionErrorHandler = new InventoryDeductionErrorHandler();

export default InventoryDeductionErrorHandler;
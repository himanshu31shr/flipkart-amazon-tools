import { FirebaseService } from './firebase.service';
import { InventoryAlert } from '../types/inventory';
import { Timestamp, where } from 'firebase/firestore';

/**
 * Alerting Service
 * 
 * Manages alerting rules and notifications for:
 * - Critical errors
 * - Performance degradation
 * - Service outages
 * - Threshold breaches
 * - Inventory threshold monitoring
 */

export interface AlertRule {
  id: string;
  name: string;
  type: 'error_rate' | 'performance' | 'availability' | 'custom';
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    timeWindow: number; // in minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // in minutes
  lastTriggered?: Date;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'console' | 'localStorage' | 'webhook' | 'email';
  config: Record<string, unknown>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: Date;
}

export class AlertingService extends FirebaseService {
  // Firebase collection constants
  private readonly INVENTORY_ALERTS_COLLECTION = 'inventoryAlerts';
  
  // Application monitoring properties
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private isEnabled: boolean;
  private checkInterval: number = 60000; // 1 minute
  private intervalId?: number;

  constructor() {
    super();
    this.isEnabled = this.shouldEnableAlerting();
    this.initializeDefaultRules();
    
    if (this.isEnabled) {
      this.startAlertingService();
    }
  }

  private shouldEnableAlerting(): boolean {
    // Enable alerting in production and staging environments
    const hostname = window.location.hostname;
    return hostname.includes('github.io') || 
           hostname.includes('netlify.app') || 
           hostname.includes('vercel.app') ||
           process.env.NODE_ENV === 'production';
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'critical_error_rate',
        name: 'Critical Error Rate',
        type: 'error_rate',
        condition: {
          metric: 'error_rate_critical',
          operator: '>',
          threshold: 0,
          timeWindow: 5 // 5 minutes
        },
        severity: 'critical',
        enabled: true,
        cooldown: 10, // 10 minutes
        actions: [
          {
            type: 'console',
            config: { level: 'error' }
          },
          {
            type: 'localStorage',
            config: { key: 'critical_alerts' }
          }
        ]
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'error_rate',
        condition: {
          metric: 'error_rate_total',
          operator: '>',
          threshold: 10,
          timeWindow: 15 // 15 minutes
        },
        severity: 'high',
        enabled: true,
        cooldown: 30,
        actions: [
          {
            type: 'console',
            config: { level: 'warn' }
          },
          {
            type: 'localStorage',
            config: { key: 'error_alerts' }
          }
        ]
      },
      {
        id: 'performance_degradation',
        name: 'Performance Degradation',
        type: 'performance',
        condition: {
          metric: 'avg_page_load_time',
          operator: '>',
          threshold: 5000, // 5 seconds
          timeWindow: 10
        },
        severity: 'medium',
        enabled: true,
        cooldown: 20,
        actions: [
          {
            type: 'console',
            config: { level: 'warn' }
          },
          {
            type: 'localStorage',
            config: { key: 'performance_alerts' }
          }
        ]
      },
      {
        id: 'slow_page_load',
        name: 'Slow Page Load',
        type: 'performance',
        condition: {
          metric: 'page_load_time',
          operator: '>',
          threshold: 10000, // 10 seconds
          timeWindow: 5
        },
        severity: 'high',
        enabled: true,
        cooldown: 15,
        actions: [
          {
            type: 'console',
            config: { level: 'error' }
          },
          {
            type: 'localStorage',
            config: { key: 'performance_alerts' }
          }
        ]
      }
    ];
  }

  private startAlertingService(): void {
    this.intervalId = window.setInterval(() => {
      this.checkAlertRules();
    }, this.checkInterval);

    // Also check on page load
    setTimeout(() => {
      this.checkAlertRules();
    }, 2000);
  }

  private checkAlertRules(): void {
    if (!this.isEnabled) return;

    this.rules.forEach(rule => {
      if (!rule.enabled) return;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldown * 60000);
        if (new Date() < cooldownEnd) return;
      }

      // Evaluate rule condition
      const shouldTrigger = this.evaluateRule(rule);
      if (shouldTrigger) {
        this.triggerAlert(rule);
      }
    });
  }

  private evaluateRule(rule: AlertRule): boolean {
    try {
      const timeWindowMs = rule.condition.timeWindow * 60000;
      const now = Date.now();
      const windowStart = now - timeWindowMs;

      switch (rule.type) {
        case 'error_rate':
          return this.evaluateErrorRateRule(rule, windowStart, now);
        case 'performance':
          return this.evaluatePerformanceRule(rule, windowStart, now);
        case 'availability':
          return this.evaluateAvailabilityRule(rule, windowStart, now);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error evaluating alert rule:', rule.name, error);
      return false;
    }
  }

  private evaluateErrorRateRule(rule: AlertRule, windowStart: number, now: number): boolean {
    const errors = this.getErrorsInTimeWindow(windowStart, now);
    
    let value: number;
    switch (rule.condition.metric) {
      case 'error_rate_critical':
        value = errors.filter(e => e.severity === 'critical').length;
        break;
      case 'error_rate_total':
        value = errors.length;
        break;
      default:
        return false;
    }

    return this.compareValues(value, rule.condition.operator, rule.condition.threshold);
  }

  private evaluatePerformanceRule(rule: AlertRule, windowStart: number, now: number): boolean {
    const performanceData = this.getPerformanceInTimeWindow(windowStart, now);
    
    if (performanceData.length === 0) return false;

    let value: number;
    switch (rule.condition.metric) {
      case 'avg_page_load_time':
        value = performanceData.reduce((sum, p) => sum + p.metrics.pageLoadTime, 0) / performanceData.length;
        break;
      case 'page_load_time':
        // Check if any single page load exceeds threshold
        value = Math.max(...performanceData.map(p => p.metrics.pageLoadTime));
        break;
      default:
        return false;
    }

    return this.compareValues(value, rule.condition.operator, rule.condition.threshold);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private evaluateAvailabilityRule(_rule: AlertRule, _windowStart: number, _now: number): boolean {
    // For frontend apps, availability can be measured by successful health checks
    // This would typically integrate with external monitoring services
    return false;
  }

  private compareValues(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '=': return value === threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      default: return false;
    }
  }

  private getErrorsInTimeWindow(windowStart: number, now: number): Array<{timestamp: string; severity: string}> {
    try {
      const errors = JSON.parse(localStorage.getItem('monitoring_errors') || '[]');
      return errors.filter((error: {timestamp: string; severity: string}) => {
        const errorTime = new Date(error.timestamp).getTime();
        return errorTime >= windowStart && errorTime <= now;
      });
    } catch {
      return [];
    }
  }

  private getPerformanceInTimeWindow(windowStart: number, now: number): Array<{timestamp: string; metrics: {pageLoadTime: number}}> {
    try {
      const performance = JSON.parse(localStorage.getItem('monitoring_performance') || '[]');
      return performance.filter((metric: {timestamp: string}) => {
        const metricTime = new Date(metric.timestamp).getTime();
        return metricTime >= windowStart && metricTime <= now;
      });
    } catch {
      return [];
    }
  }

  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      timestamp: new Date(),
      severity: rule.severity,
      message: this.generateAlertMessage(rule),
      details: {
        rule: rule,
        threshold: rule.condition.threshold,
        metric: rule.condition.metric
      },
      resolved: false
    };

    this.alerts.push(alert);
    rule.lastTriggered = new Date();

    // Execute alert actions
    rule.actions.forEach(action => {
      this.executeAlertAction(alert, action);
    });

    // Store alerts in localStorage
    this.saveAlertsToStorage();
  }

  private generateAlertMessage(rule: AlertRule): string {
    switch (rule.type) {
      case 'error_rate':
        return `Error rate alert: ${rule.name} - ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold} in ${rule.condition.timeWindow} minutes`;
      case 'performance':
        return `Performance alert: ${rule.name} - ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}ms in ${rule.condition.timeWindow} minutes`;
      case 'availability':
        return `Availability alert: ${rule.name} - Service availability issue detected`;
      default:
        return `Alert: ${rule.name}`;
    }
  }

  private executeAlertAction(alert: Alert, action: AlertAction): void {
    try {
      switch (action.type) {
        case 'console': {
          const level = action.config.level as string || 'log';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (console as any)[level](`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert);
          break;
        }

        case 'localStorage': {
          const key = action.config.key as string || 'alerts';
          const existingAlerts = JSON.parse(localStorage.getItem(key) || '[]');
          existingAlerts.push(alert);
          localStorage.setItem(key, JSON.stringify(existingAlerts.slice(-100))); // Keep last 100
          break;
        }

        case 'webhook':
          // In a real implementation, this would send to a webhook URL
          console.log('Webhook alert (not implemented):', alert);
          break;

        case 'email':
          // In a real implementation, this would send an email
          console.log('Email alert (not implemented):', alert);
          break;
      }
    } catch (error) {
      console.error('Failed to execute alert action:', action.type, error);
    }
  }

  private saveAlertsToStorage(): void {
    try {
      localStorage.setItem('monitoring_alerts', JSON.stringify(this.alerts.slice(-1000))); // Keep last 1000
    } catch (error) {
      console.error('Failed to save alerts to storage:', error);
    }
  }

  // Public API methods

  public addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex >= 0) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  public removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  public getRules(): AlertRule[] {
    return [...this.rules];
  }

  public getAlerts(resolved?: boolean): Alert[] {
    return this.alerts.filter(alert => resolved === undefined || alert.resolved === resolved);
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.saveAlertsToStorage();
    }
  }

  public getStoredAlerts(): Alert[] {
    try {
      return JSON.parse(localStorage.getItem('monitoring_alerts') || '[]');
    } catch {
      return [];
    }
  }

  public clearAlerts(): void {
    this.alerts = [];
    localStorage.removeItem('monitoring_alerts');
  }

  /**
   * Create and store a new inventory alert in Firestore
   * 
   * This method creates inventory threshold alerts when stock levels fall below
   * configured thresholds. It validates input parameters, checks for duplicate alerts,
   * and stores the alert with proper Firebase integration and audit tracking.
   * 
   * The method supports different alert types based on inventory levels:
   * - 'low_stock': inventory > 0 but below threshold
   * - 'zero_stock': inventory exactly equals 0
   * - 'negative_stock': inventory below 0 (oversold situation)
   * 
   * Duplicate alert prevention: Checks for existing active alerts of the same type
   * for the same category group to prevent alert spam.
   * 
   * @param categoryGroupId - ID of the category group triggering the alert
   * @param alertType - Type of inventory alert ('low_stock', 'zero_stock', 'negative_stock')
   * @param currentLevel - Current inventory level that triggered the alert
   * @param thresholdLevel - Threshold level that was breached
   * @param unit - Unit of measurement ('kg', 'g', 'pcs')
   * @param severity - Alert severity level ('low', 'medium', 'high', 'critical')
   * @returns Promise resolving to the created InventoryAlert object
   * @throws Error if validation fails or Firestore operation fails
   * 
   * Requirements Coverage:
   * - R3: Threshold monitoring and alerting system
   * - R5: Alert management with proper validation and error handling
   * - Duplicate alert prevention for better user experience
   * - Comprehensive audit trail with Firebase integration
   */
  async createInventoryAlert(
    categoryGroupId: string,
    alertType: InventoryAlert['alertType'],
    currentLevel: number,
    thresholdLevel: number,
    unit: 'kg' | 'g' | 'pcs',
    severity: InventoryAlert['severity']
  ): Promise<InventoryAlert> {
    // Input validation
    if (!categoryGroupId || typeof categoryGroupId !== 'string') {
      throw new Error('Category group ID is required and must be a valid string');
    }

    if (!alertType || !['low_stock', 'zero_stock', 'negative_stock'].includes(alertType)) {
      throw new Error('Alert type must be one of: low_stock, zero_stock, negative_stock');
    }

    if (typeof currentLevel !== 'number' || isNaN(currentLevel)) {
      throw new Error('Current level must be a valid number');
    }

    if (typeof thresholdLevel !== 'number' || isNaN(thresholdLevel) || thresholdLevel < 0) {
      throw new Error('Threshold level must be a valid non-negative number');
    }

    if (!unit || !['kg', 'g', 'pcs'].includes(unit)) {
      throw new Error('Unit must be one of: kg, g, pcs');
    }

    if (!severity || !['low', 'medium', 'high', 'critical'].includes(severity)) {
      throw new Error('Severity must be one of: low, medium, high, critical');
    }

    // Validate logical consistency between alert type and current level
    if (alertType === 'zero_stock' && currentLevel !== 0) {
      throw new Error('Zero stock alert type requires current level to be exactly 0');
    }

    if (alertType === 'negative_stock' && currentLevel >= 0) {
      throw new Error('Negative stock alert type requires current level to be below 0');
    }

    if (alertType === 'low_stock' && (currentLevel <= 0 || currentLevel >= thresholdLevel)) {
      throw new Error('Low stock alert type requires current level to be between 0 and threshold level');
    }

    try {
      // Check for existing active alerts of the same type for the same category group
      // to prevent duplicate alerts
      const existingAlerts = await this.getDocuments<InventoryAlert>(
        this.INVENTORY_ALERTS_COLLECTION,
        [
          where('categoryGroupId', '==', categoryGroupId),
          where('alertType', '==', alertType),
          where('isActive', '==', true)
        ]
      );

      if (existingAlerts.length > 0) {
        // Return the existing alert instead of creating a duplicate
        const existingAlert = existingAlerts[0];
        console.warn(`Active ${alertType} alert already exists for category group ${categoryGroupId}:`, existingAlert.id);
        return existingAlert;
      }

      // Create new inventory alert object
      const alertData: Omit<InventoryAlert, 'id'> = {
        categoryGroupId,
        alertType,
        currentLevel,
        thresholdLevel,
        unit,
        severity,
        isActive: true,
        createdAt: Timestamp.now()
      };

      // Store alert in Firestore
      const result = await this.addDocument(this.INVENTORY_ALERTS_COLLECTION, alertData);

      // Create the complete alert object with generated ID
      const createdAlert: InventoryAlert = {
        ...alertData,
        id: result.id
      };

      // Log successful alert creation for audit purposes
      console.info(`Inventory alert created successfully:`, {
        alertId: result.id,
        categoryGroupId,
        alertType,
        currentLevel,
        thresholdLevel,
        unit,
        severity
      });

      return createdAlert;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during inventory alert creation';
      throw new Error(`Failed to create inventory alert: ${errorMessage}`);
    }
  }

  /**
   * Calculate the appropriate severity level for an inventory alert
   * 
   * This method intelligently determines alert severity based on inventory conditions,
   * considering the alert type and how current levels relate to threshold levels.
   * 
   * Business Logic Rules:
   * - negative_stock: Always 'critical' (operational emergency - oversold situation)
   * - zero_stock: Severity based on threshold importance
   *   - threshold >= 100: 'critical' (high-importance items)
   *   - threshold >= 10: 'high' (medium-importance items)
   *   - threshold < 10: 'medium' (low-importance items)
   * - low_stock: Percentage-based calculation relative to threshold
   *   - <= 10% of threshold: 'high' (critically low)
   *   - <= 25% of threshold: 'medium' (moderately low)
   *   - <= 50% of threshold or higher: 'low' (below threshold but not critical)
   * 
   * @param currentLevel - Current inventory level that triggered the alert
   * @param thresholdLevel - Threshold level that was breached
   * @param alertType - Type of inventory alert ('low_stock', 'zero_stock', 'negative_stock')
   * @returns Calculated severity level ('low', 'medium', 'high', 'critical')
   * @throws Error if validation fails for input parameters
   * 
   * Requirements Coverage:
   * - R3: Intelligent severity calculation for threshold monitoring
   * - R5: Business rule implementation for different alert types
   * - Smart escalation based on inventory conditions and business impact
   */
  calculateSeverity(
    currentLevel: number,
    thresholdLevel: number,
    alertType: InventoryAlert['alertType']
  ): InventoryAlert['severity'] {
    // Input validation
    if (typeof currentLevel !== 'number' || isNaN(currentLevel)) {
      throw new Error('Current level must be a valid number');
    }

    if (typeof thresholdLevel !== 'number' || isNaN(thresholdLevel)) {
      throw new Error('Threshold level must be a valid number');
    }

    if (thresholdLevel < 0) {
      throw new Error('Threshold level must be non-negative');
    }

    if (!alertType || !['low_stock', 'zero_stock', 'negative_stock'].includes(alertType)) {
      throw new Error('Alert type must be one of: low_stock, zero_stock, negative_stock');
    }

    // Apply business logic rules based on alert type
    switch (alertType) {
      case 'negative_stock':
        // Negative stock is always critical - operational emergency
        return 'critical';

      case 'zero_stock':
        // Severity based on threshold importance level
        if (thresholdLevel >= 100) {
          return 'critical'; // High-importance items
        } else if (thresholdLevel >= 10) {
          return 'high'; // Medium-importance items
        } else {
          return 'medium'; // Low-importance items
        }

      case 'low_stock': {
        // Percentage-based calculation for granular severity assessment
        if (thresholdLevel === 0) {
          // Special case: any positive level with zero threshold is concerning
          return 'high';
        }

        const percentageOfThreshold = (currentLevel / thresholdLevel) * 100;

        if (percentageOfThreshold <= 10) {
          return 'high'; // Critically low stock (10% or less)
        } else if (percentageOfThreshold <= 25) {
          return 'medium'; // Moderately low stock (11-25%)
        } else {
          return 'low'; // Below threshold but not critical (26% and above)
        }
      }

      default:
        // This should never be reached due to validation above
        throw new Error(`Unsupported alert type: ${alertType}`);
    }
  }

  /**
   * Resolve an active inventory alert by marking it as inactive and tracking acknowledgment
   * 
   * This method marks an inventory alert as resolved by updating its status and tracking
   * who acknowledged it. This is essential for alert lifecycle management and provides
   * audit trail for alert resolution. The method ensures only active alerts can be resolved
   * and maintains data integrity through proper validation.
   * 
   * Business Logic:
   * - Alert must exist and be currently active (isActive: true)
   * - Sets isActive to false to mark alert as resolved
   * - Records who acknowledged the alert (acknowledgedBy)
   * - Records when the alert was acknowledged (acknowledgedAt)
   * - Records when the alert was resolved (resolvedAt)
   * - Updates the alert document in Firestore atomically
   * 
   * @param alertId - ID of the alert to resolve
   * @param acknowledgedBy - User ID or identifier of who is resolving the alert
   * @returns Promise resolving to the updated InventoryAlert object
   * @throws Error if alert doesn't exist, is already resolved, or validation fails
   * 
   * Requirements Coverage:
   * - R5: Alert management with proper validation and lifecycle tracking
   * - R3: Alert resolution for threshold monitoring system
   * - Comprehensive audit trail for alert acknowledgment and resolution
   * - Data integrity through validation and atomic updates
   */
  async resolveInventoryAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<InventoryAlert> {
    // Input validation
    if (!alertId || typeof alertId !== 'string') {
      throw new Error('Alert ID is required and must be a valid string');
    }

    if (!acknowledgedBy || typeof acknowledgedBy !== 'string') {
      throw new Error('Acknowledged by is required and must be a valid string');
    }

    try {
      // Fetch the existing alert to validate it exists and is active
      const existingAlert = await this.getDocument<InventoryAlert>(
        this.INVENTORY_ALERTS_COLLECTION,
        alertId
      );

      if (!existingAlert) {
        throw new Error(`Alert with ID ${alertId} not found`);
      }

      if (!existingAlert.isActive) {
        throw new Error(`Alert with ID ${alertId} is already resolved`);
      }

      // Prepare the update data for alert resolution
      const now = Timestamp.now();
      const updateData: Partial<InventoryAlert> = {
        isActive: false,
        acknowledgedBy,
        acknowledgedAt: now,
        resolvedAt: now
      };

      // Update the alert in Firestore
      await this.updateDocument(this.INVENTORY_ALERTS_COLLECTION, alertId, updateData);

      // Create the updated alert object to return
      const resolvedAlert: InventoryAlert = {
        ...existingAlert,
        ...updateData,
        id: alertId
      };

      // Log successful alert resolution for audit purposes
      console.info(`Inventory alert resolved successfully:`, {
        alertId,
        categoryGroupId: existingAlert.categoryGroupId,
        alertType: existingAlert.alertType,
        acknowledgedBy,
        resolvedAt: now
      });

      return resolvedAlert;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during alert resolution';
      throw new Error(`Failed to resolve inventory alert: ${errorMessage}`);
    }
  }

  /**
   * Fetch all inventory alerts from Firestore
   * 
   * @returns Promise resolving to array of InventoryAlert objects
   */
  async getInventoryAlerts(): Promise<InventoryAlert[]> {
    try {
      return await this.getDocuments<InventoryAlert>(this.INVENTORY_ALERTS_COLLECTION);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching inventory alerts';
      throw new Error(`Failed to fetch inventory alerts: ${errorMessage}`);
    }
  }

  /**
   * Update an inventory alert document
   * 
   * @param alertId - ID of the alert to update
   * @param updateData - Partial data to update
   * @returns Promise that resolves when update is complete
   */
  async updateInventoryAlert(alertId: string, updateData: Partial<InventoryAlert>): Promise<void> {
    try {
      await this.updateDocument(this.INVENTORY_ALERTS_COLLECTION, alertId, updateData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating inventory alert';
      throw new Error(`Failed to update inventory alert: ${errorMessage}`);
    }
  }

  /**
   * Get a specific inventory alert by ID
   * 
   * @param alertId - ID of the alert to fetch
   * @returns Promise resolving to InventoryAlert or undefined if not found
   */
  async getInventoryAlert(alertId: string): Promise<InventoryAlert | undefined> {
    try {
      return await this.getDocument<InventoryAlert>(this.INVENTORY_ALERTS_COLLECTION, alertId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching inventory alert';
      throw new Error(`Failed to fetch inventory alert: ${errorMessage}`);
    }
  }

  public destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

// Singleton instance
const alertingService = new AlertingService();

export default alertingService; 
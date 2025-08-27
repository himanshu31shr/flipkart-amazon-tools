/**
 * Alerting Service
 * 
 * Manages alerting rules and notifications for:
 * - Critical errors
 * - Performance degradation
 * - Service outages
 * - Threshold breaches
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

class AlertingService {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private isEnabled: boolean;
  private checkInterval: number = 60000; // 1 minute
  private intervalId?: number;

  constructor() {
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
          
          break;

        case 'email':
          // In a real implementation, this would send an email
          
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
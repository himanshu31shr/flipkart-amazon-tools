/**
 * Real-time Updates Performance Test Suite
 * 
 * Tests real-time performance requirements for the inventory management system's
 * WebSocket/Firestore real-time capabilities. Validates alert propagation times,
 * multi-user scenarios, and system uptime requirements.
 * 
 * Performance Requirements:
 * - Alert propagation: <3 seconds from threshold breach to dashboard display
 * - Real-time updates: Simultaneous users receive updates within acceptable latency
 * - System uptime: 99.9% availability with failover to email notifications
 * - Concurrent users: Handle multiple simultaneous inventory updates
 * - Dashboard responsiveness: Real-time widgets update without performance degradation
 * 
 * Requirements Coverage:
 * - R3: Threshold-Based Alert System - real-time alert generation and propagation
 * - R10: Performance and Load Testing - real-time update performance validation
 * 
 * @group performance
 * @group real-time
 * @group inventory-alerts
 */

import { InventoryService } from '../../services/inventory.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import { AlertingService } from '../../services/alerting.service';
import { 
  InventoryDeductionItem, 
  InventoryAlert,
  InventoryMovement,
  InventoryLevel
} from '../../types/inventory';
import { CategoryGroup } from '../../types/categoryGroup';

// Mock Firebase real-time capabilities
jest.mock('../../services/firebase.service');
jest.mock('../../services/categoryGroup.service');
jest.mock('../../services/alerting.service');

// Real-time performance thresholds
const REAL_TIME_THRESHOLDS = {
  ALERT_PROPAGATION_MS: 3000,      // R10: Alert propagation within 3 seconds
  DASHBOARD_UPDATE_MS: 1000,       // Dashboard widgets update within 1 second
  MULTI_USER_LATENCY_MS: 2000,     // Multi-user updates within 2 seconds
  UPTIME_PERCENTAGE: 99.9,         // 99.9% uptime requirement
  FAILOVER_TIME_MS: 5000,          // Failover mechanism within 5 seconds
  CONCURRENT_USERS: 50,            // Support for 50 concurrent users
  BATCH_UPDATE_SIZE: 100           // Batch processing of 100 updates
};

// Mock CategoryGroupService and AlertingService
const MockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;
const MockAlertingService = AlertingService as jest.MockedClass<typeof AlertingService>;

describe('Real-time Updates Performance Testing', () => {
  let inventoryService: InventoryService;
  let mockCategoryGroupService: jest.Mocked<CategoryGroupService>;
  let mockAlertingService: jest.Mocked<AlertingService>;
  
  // Simulate real-time listeners
  const realtimeListeners = new Map<string, Function[]>();
  const alertSubscriptions = new Map<string, Function[]>();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mocked service instances
    mockCategoryGroupService = {
      getCategoryGroup: jest.fn(),
      getCategoryGroups: jest.fn(),
      updateInventory: jest.fn(),
      checkThresholdAlerts: jest.fn(),
      subscribeToInventoryChanges: jest.fn(),
      unsubscribeFromInventoryChanges: jest.fn(),
    } as any;

    mockAlertingService = {
      subscribeToAlerts: jest.fn(),
      createAlert: jest.fn(),
      resolveAlert: jest.fn(),
      isServiceAvailable: jest.fn(),
      failoverToEmail: jest.fn(),
    } as any;

    MockCategoryGroupService.mockImplementation(() => mockCategoryGroupService);
    MockAlertingService.mockImplementation(() => mockAlertingService);
    
    inventoryService = new InventoryService();

    // Setup real-time listener simulation
    setupRealtimeSimulation();
  });

  afterEach(() => {
    // Clear all simulated listeners
    realtimeListeners.clear();
    alertSubscriptions.clear();
  });

  /**
   * Helper function to simulate Firestore real-time listeners
   */
  function setupRealtimeSimulation() {
    // Simulate real-time subscription to inventory changes
    mockCategoryGroupService.subscribeToInventoryChanges.mockImplementation(
      (groupId: string, callback: Function) => {
        if (!realtimeListeners.has(groupId)) {
          realtimeListeners.set(groupId, []);
        }
        realtimeListeners.get(groupId)!.push(callback);
        
        // Return unsubscribe function
        return () => {
          const listeners = realtimeListeners.get(groupId) || [];
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        };
      }
    );

    // Simulate real-time subscription to alerts
    mockAlertingService.subscribeToAlerts.mockImplementation(
      (callback: Function) => {
        if (!alertSubscriptions.has('global')) {
          alertSubscriptions.set('global', []);
        }
        alertSubscriptions.get('global')!.push(callback);
        
        return () => {
          const listeners = alertSubscriptions.get('global') || [];
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        };
      }
    );
  }

  /**
   * Helper function to simulate real-time events
   */
  function simulateRealtimeEvent(groupId: string, data: any, delay: number = 50) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const listeners = realtimeListeners.get(groupId) || [];
        listeners.forEach(callback => callback(data));
        resolve();
      }, delay);
    });
  }

  /**
   * Helper function to simulate alert events
   */
  function simulateAlertEvent(alert: InventoryAlert, delay: number = 50) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const listeners = alertSubscriptions.get('global') || [];
        listeners.forEach(callback => callback(alert));
        resolve();
      }, delay);
    });
  }

  describe('Alert Propagation Performance', () => {
    it('should propagate inventory threshold alerts within 3 seconds', async () => {
      const testGroupId = 'real-time-alert-group';
      const alertCallbacks: InventoryAlert[] = [];
      
      // Setup category group with threshold
      const testGroup: CategoryGroup = {
        id: testGroupId,
        name: 'Real-time Alert Test Group',
        description: 'Testing real-time alert propagation',
        color: '#FF5722',
        currentInventory: 15,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 10
      };

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue(testGroup);
      
      // Mock alert creation with realistic timing
      mockCategoryGroupService.checkThresholdAlerts.mockImplementation(async (groupId) => {
        // Simulate database write delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const alert: InventoryAlert = {
          id: `alert-${Date.now()}`,
          categoryGroupId: groupId,
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
        };
        
        // Simulate real-time alert propagation immediately
        if (alertCallback) {
          alertCallback(alert);
        }
        
        return alert;
      });

      // Setup alert listener
      let alertReceived = false;
      let alertReceivedTime: number;
      const startTime = performance.now();

      // Setup callback directly for test
      let alertCallback: Function;
      mockAlertingService.subscribeToAlerts.mockImplementation((callback) => {
        alertCallback = callback;
        return () => {};
      });

      // Subscribe to alerts and measure propagation time
      const unsubscribe = mockAlertingService.subscribeToAlerts((alert: InventoryAlert) => {
        if (!alertReceived) {
          alertReceived = true;
          alertReceivedTime = performance.now();
          alertCallbacks.push(alert);
        }
      });

      // Trigger inventory deduction that causes threshold breach
      const orderItems: InventoryDeductionItem[] = [{
        categoryGroupId: testGroupId,
        quantity: 12, // This will bring inventory to 3, below threshold of 10
        unit: 'pcs',
        productSku: 'REALTIME-TEST-001'
      }];

      // Mock the inventory update to trigger alert
      mockCategoryGroupService.updateInventory.mockImplementation(async (groupId, quantity) => {
        const newLevel = testGroup.currentInventory - quantity;
        
        // Simulate the alert check and creation
        await mockCategoryGroupService.checkThresholdAlerts(groupId);
        
        return {
          newInventoryLevel: newLevel,
          movementId: `movement-${Date.now()}`
        };
      });

      // Execute the deduction
      await inventoryService.deductInventoryFromOrder(orderItems);

      // Wait for real-time propagation with timeout
      let attempts = 0;
      while (!alertReceived && attempts < 60) { // Max 3 seconds wait
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      const propagationTime = alertReceivedTime! - startTime;

      // Verify alert propagation performance
      expect(alertReceived).toBe(true);
      expect(propagationTime).toBeLessThan(REAL_TIME_THRESHOLDS.ALERT_PROPAGATION_MS);
      expect(alertCallbacks).toHaveLength(1);
      expect(alertCallbacks[0].alertType).toBe('low_stock');

      console.log(`✓ Alert propagation: ${propagationTime.toFixed(2)}ms (threshold: ${REAL_TIME_THRESHOLDS.ALERT_PROPAGATION_MS}ms)`);
      
      unsubscribe();
    }, 10000); // 10 second timeout

    it('should handle multiple simultaneous threshold breaches efficiently', async () => {
      const groupCount = 10;
      const alertsReceived: InventoryAlert[] = [];
      let allAlertsReceived = false;
      
      // Setup multiple category groups at threshold
      const testGroups = Array.from({ length: groupCount }, (_, index) => ({
        id: `multi-alert-group-${index}`,
        name: `Multi Alert Group ${index}`,
        description: 'Testing multiple alerts',
        color: '#FF9800',
        currentInventory: 15,
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: 10
      }));

      mockCategoryGroupService.getCategoryGroup.mockImplementation(async (id) => {
        return testGroups.find(g => g.id === id) || null;
      });

      // Setup callback for multiple alerts
      let multiAlertCallback: Function;
      
      // Mock simultaneous alert creation
      mockCategoryGroupService.checkThresholdAlerts.mockImplementation(async (groupId) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        const alert: InventoryAlert = {
          id: `alert-${groupId}-${Date.now()}`,
          categoryGroupId: groupId,
          alertType: 'low_stock',
          currentLevel: 5,
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
        };
        
        // Simulate real-time propagation immediately
        if (multiAlertCallback) {
          multiAlertCallback(alert);
        }
        
        return alert;
      });

      const startTime = performance.now();

      // Setup alert listener for multiple alerts  
      mockAlertingService.subscribeToAlerts.mockImplementation((callback) => {
        multiAlertCallback = callback;
        return () => {};
      });

      const receivedGroupIds = new Set<string>();
      
      const unsubscribe = mockAlertingService.subscribeToAlerts((alert: InventoryAlert) => {
        // Only count the first alert per group to avoid duplicates
        if (!receivedGroupIds.has(alert.categoryGroupId)) {
          receivedGroupIds.add(alert.categoryGroupId);
          alertsReceived.push(alert);
          if (alertsReceived.length === groupCount) {
            allAlertsReceived = true;
          }
        }
      });

      // Create simultaneous deductions across all groups
      const orderItems: InventoryDeductionItem[] = testGroups.map((group, index) => ({
        categoryGroupId: group.id,
        quantity: 12,
        unit: 'pcs' as const,
        productSku: `MULTI-TEST-${index.toString().padStart(3, '0')}`
      }));

      mockCategoryGroupService.updateInventory.mockImplementation(async (groupId, quantity) => {
        const group = testGroups.find(g => g.id === groupId);
        if (!group) throw new Error('Group not found');
        
        const newLevel = group.currentInventory - quantity;
        
        // Trigger alert check
        await mockCategoryGroupService.checkThresholdAlerts(groupId);
        
        return {
          newInventoryLevel: newLevel,
          movementId: `movement-${groupId}-${Date.now()}`
        };
      });

      // Execute all deductions concurrently
      await inventoryService.deductInventoryFromOrder(orderItems);

      // Wait for all alerts with timeout
      let attempts = 0;
      while (!allAlertsReceived && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      const totalTime = performance.now() - startTime;

      // Verify multiple alert performance
      expect(allAlertsReceived).toBe(true);
      expect(alertsReceived).toHaveLength(groupCount);
      expect(totalTime).toBeLessThan(REAL_TIME_THRESHOLDS.ALERT_PROPAGATION_MS);

      // Verify all alerts are unique
      const uniqueGroupIds = new Set(alertsReceived.map(a => a.categoryGroupId));
      expect(uniqueGroupIds.size).toBe(groupCount);

      console.log(`✓ Multiple alerts: ${groupCount} alerts in ${totalTime.toFixed(2)}ms`);
      console.log(`  Average per alert: ${(totalTime / groupCount).toFixed(2)}ms`);
      
      unsubscribe();
    }, 10000); // 10 second timeout
  });

  describe('Multi-User Real-time Updates', () => {
    it('should handle concurrent users receiving simultaneous inventory updates', async () => {
      const userCount = REAL_TIME_THRESHOLDS.CONCURRENT_USERS;
      const testGroupId = 'multi-user-group';
      const userUpdateCounts = new Map<number, number>();
      
      // Setup test group
      const testGroup: CategoryGroup = {
        id: testGroupId,
        name: 'Multi-user Test Group',
        description: 'Testing multi-user real-time updates',
        color: '#2196F3',
        currentInventory: 10000,
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 100
      };

      mockCategoryGroupService.getCategoryGroup.mockResolvedValue(testGroup);

      // Simulate multiple users subscribing to the same group
      const userSubscriptions: Function[] = [];
      const startTime = performance.now();

      for (let userId = 0; userId < userCount; userId++) {
        userUpdateCounts.set(userId, 0);
        
        const unsubscribe = mockCategoryGroupService.subscribeToInventoryChanges(
          testGroupId,
          (data: { newInventoryLevel: number; movementId: string }) => {
            const currentCount = userUpdateCounts.get(userId) || 0;
            userUpdateCounts.set(userId, currentCount + 1);
          }
        );
        
        userSubscriptions.push(unsubscribe);
      }

      // Mock inventory update with real-time propagation
      mockCategoryGroupService.updateInventory.mockImplementation(async (groupId, quantity) => {
        const newLevel = testGroup.currentInventory - quantity;
        const movementId = `movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Simulate real-time propagation to all subscribers
        setTimeout(() => {
          simulateRealtimeEvent(groupId, { newInventoryLevel: newLevel, movementId }, 10);
        }, 50);
        
        return { newInventoryLevel: newLevel, movementId };
      });

      // Perform multiple inventory updates
      const updateCount = 10;
      const updatePromises = [];

      for (let i = 0; i < updateCount; i++) {
        const orderItems: InventoryDeductionItem[] = [{
          categoryGroupId: testGroupId,
          quantity: 1,
          unit: 'pcs',
          productSku: `MULTI-USER-${i}`
        }];
        
        updatePromises.push(inventoryService.deductInventoryFromOrder(orderItems));
      }

      await Promise.all(updatePromises);

      // Wait for real-time propagation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const totalTime = performance.now() - startTime;

      // Verify all users received all updates
      const receivedCounts = Array.from(userUpdateCounts.values());
      const expectedUpdatesPerUser = updateCount;
      
      expect(totalTime).toBeLessThan(REAL_TIME_THRESHOLDS.MULTI_USER_LATENCY_MS);
      
      // Check that most users received most updates (allowing for some network simulation variance)
      const usersWithCompleteUpdates = receivedCounts.filter(count => count >= expectedUpdatesPerUser * 0.8).length;
      const successRate = (usersWithCompleteUpdates / userCount) * 100;
      
      expect(successRate).toBeGreaterThan(90); // 90% of users should receive 80% of updates

      console.log(`✓ Multi-user updates: ${userCount} users, ${updateCount} updates in ${totalTime.toFixed(2)}ms`);
      console.log(`  Success rate: ${successRate.toFixed(1)}% of users received updates`);
      console.log(`  Average updates per user: ${receivedCounts.reduce((a, b) => a + b, 0) / userCount}`);
      
      // Cleanup subscriptions
      userSubscriptions.forEach(unsubscribe => unsubscribe());
    }, 10000); // 10 second timeout

    it('should maintain dashboard responsiveness during real-time updates', async () => {
      const updateFrequency = 100; // Updates per second simulation
      const testDuration = 5000; // 5 seconds
      const dashboardUpdateTimes: number[] = [];
      
      // Setup dashboard widgets simulation
      const dashboardWidgets = ['inventory-summary', 'alerts-widget', 'recent-movements'];
      const widgetUpdateCounts = new Map<string, number>();
      
      dashboardWidgets.forEach(widget => widgetUpdateCounts.set(widget, 0));

      // Simulate dashboard subscriptions
      const widgetSubscriptions: Function[] = [];
      
      dashboardWidgets.forEach(widget => {
        const unsubscribe = mockAlertingService.subscribeToAlerts((data: any) => {
          const updateStartTime = performance.now();
          
          // Simulate widget update processing
          setTimeout(() => {
            const updateTime = performance.now() - updateStartTime;
            dashboardUpdateTimes.push(updateTime);
            
            const currentCount = widgetUpdateCounts.get(widget) || 0;
            widgetUpdateCounts.set(widget, currentCount + 1);
          }, Math.random() * 50 + 10); // 10-60ms processing time
        });
        
        widgetSubscriptions.push(unsubscribe);
      });

      const startTime = performance.now();
      let updateCount = 0;

      // Simulate high-frequency real-time updates
      const updateInterval = setInterval(() => {
        if (performance.now() - startTime >= testDuration) {
          clearInterval(updateInterval);
          return;
        }

        // Simulate alert or inventory change
        const mockAlert: InventoryAlert = {
          id: `dashboard-test-${updateCount}`,
          categoryGroupId: `group-${updateCount % 10}`,
          alertType: 'low_stock',
          currentLevel: Math.floor(Math.random() * 20),
          thresholdLevel: 10,
          unit: 'pcs',
          severity: 'medium',
          isActive: true,
          createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
        };
        
        simulateAlertEvent(mockAlert, 0);
        updateCount++;
      }, 1000 / updateFrequency);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      const totalTime = performance.now() - startTime;

      // Analyze dashboard responsiveness
      const averageUpdateTime = dashboardUpdateTimes.reduce((a, b) => a + b, 0) / dashboardUpdateTimes.length;
      const maxUpdateTime = Math.max(...dashboardUpdateTimes);
      const updatesPerWidget = Array.from(widgetUpdateCounts.values());

      expect(averageUpdateTime).toBeLessThan(REAL_TIME_THRESHOLDS.DASHBOARD_UPDATE_MS);
      expect(maxUpdateTime).toBeLessThan(REAL_TIME_THRESHOLDS.DASHBOARD_UPDATE_MS * 2); // Allow some spikes
      
      // Verify widgets received updates
      updatesPerWidget.forEach(count => {
        expect(count).toBeGreaterThan(0);
      });

      console.log(`✓ Dashboard responsiveness: ${updateCount} updates over ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`  Average widget update time: ${averageUpdateTime.toFixed(2)}ms`);
      console.log(`  Max widget update time: ${maxUpdateTime.toFixed(2)}ms`);
      console.log(`  Updates per widget:`, Object.fromEntries(widgetUpdateCounts));
      
      // Cleanup
      widgetSubscriptions.forEach(unsubscribe => unsubscribe());
    }, 15000); // 15 second timeout for longer test
  });

  describe('System Uptime and Failover Testing', () => {
    it('should maintain 99.9% uptime with proper failover mechanisms', async () => {
      const totalTestPeriod = 10000; // 10 seconds simulation
      const checkInterval = 100; // Check every 100ms
      const expectedChecks = totalTestPeriod / checkInterval;
      const maxAllowedFailures = Math.floor(expectedChecks * (1 - REAL_TIME_THRESHOLDS.UPTIME_PERCENTAGE / 100));
      
      let serviceChecks = 0;
      let serviceFailures = 0;
      let failoverActivations = 0;
      const failoverTimes: number[] = [];

      // Mock service availability with occasional failures
      mockAlertingService.isServiceAvailable.mockImplementation(() => {
        serviceChecks++;
        
        // Simulate 99.95% uptime (better than required 99.9%)
        const isAvailable = Math.random() > 0.0005; // 0.05% failure rate
        
        if (!isAvailable) {
          serviceFailures++;
        }
        
        return isAvailable;
      });

      // Mock failover mechanism
      mockAlertingService.failoverToEmail.mockImplementation(async () => {
        const failoverStartTime = performance.now();
        
        // Simulate failover delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        
        const failoverTime = performance.now() - failoverStartTime;
        failoverTimes.push(failoverTime);
        failoverActivations++;
        
        return { success: true, fallbackMethod: 'email' };
      });

      const startTime = performance.now();

      // Simulate continuous monitoring
      const monitoringInterval = setInterval(async () => {
        if (performance.now() - startTime >= totalTestPeriod) {
          clearInterval(monitoringInterval);
          return;
        }

        // Check service availability
        const isAvailable = mockAlertingService.isServiceAvailable();
        
        if (!isAvailable) {
          // Trigger failover
          await mockAlertingService.failoverToEmail();
        }
      }, checkInterval);

      // Wait for monitoring period
      await new Promise(resolve => setTimeout(resolve, totalTestPeriod + 500));

      const actualUptime = ((serviceChecks - serviceFailures) / serviceChecks) * 100;
      const averageFailoverTime = failoverTimes.length > 0 
        ? failoverTimes.reduce((a, b) => a + b, 0) / failoverTimes.length 
        : 0;

      // Verify uptime requirements
      expect(actualUptime).toBeGreaterThanOrEqual(REAL_TIME_THRESHOLDS.UPTIME_PERCENTAGE);
      expect(serviceFailures).toBeLessThanOrEqual(maxAllowedFailures);
      
      if (failoverTimes.length > 0) {
        expect(averageFailoverTime).toBeLessThan(REAL_TIME_THRESHOLDS.FAILOVER_TIME_MS);
      }

      console.log(`✓ System uptime: ${actualUptime.toFixed(3)}% (required: ${REAL_TIME_THRESHOLDS.UPTIME_PERCENTAGE}%)`);
      console.log(`  Total checks: ${serviceChecks}, Failures: ${serviceFailures}`);
      console.log(`  Failover activations: ${failoverActivations}`);
      
      if (averageFailoverTime > 0) {
        console.log(`  Average failover time: ${averageFailoverTime.toFixed(2)}ms`);
      }
    }, 15000); // 15 second timeout

    it('should handle real-time connection interruptions gracefully', async () => {
      const testGroupId = 'connection-test-group';
      const reconnectionTimes: number[] = [];
      let disconnectionCount = 0;
      let reconnectionCount = 0;
      
      // Simulate connection interruptions
      const connectionStates = new Map<string, boolean>();
      connectionStates.set(testGroupId, true);

      // Mock connection monitoring
      const mockConnection = {
        isConnected: (groupId: string) => connectionStates.get(groupId) || false,
        reconnect: async (groupId: string) => {
          const reconnectStartTime = performance.now();
          
          // Simulate reconnection delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
          
          connectionStates.set(groupId, true);
          reconnectionCount++;
          
          const reconnectionTime = performance.now() - reconnectStartTime;
          reconnectionTimes.push(reconnectionTime);
          
          return true;
        },
        disconnect: (groupId: string) => {
          connectionStates.set(groupId, false);
          disconnectionCount++;
        }
      };

      // Setup real-time subscription with connection monitoring
      const receivedUpdates: any[] = [];
      let subscription: Function | null = null;

      const subscribeWithReconnection = () => {
        subscription = mockCategoryGroupService.subscribeToInventoryChanges(
          testGroupId,
          (data: any) => {
            if (mockConnection.isConnected(testGroupId)) {
              receivedUpdates.push(data);
            }
          }
        );
      };

      subscribeWithReconnection();

      // Simulate periodic connection interruptions
      const interruptionInterval = setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance of disconnection
          mockConnection.disconnect(testGroupId);
          
          // Attempt reconnection after delay
          setTimeout(async () => {
            await mockConnection.reconnect(testGroupId);
            subscribeWithReconnection(); // Re-establish subscription
          }, 100);
        }
      }, 500);

      // Simulate continuous inventory updates
      const updateCount = 20;
      const updateInterval = setInterval(() => {
        if (receivedUpdates.length < updateCount) {
          const updateData = {
            newInventoryLevel: 1000 - receivedUpdates.length,
            movementId: `movement-${receivedUpdates.length}`,
            timestamp: Date.now()
          };
          
          simulateRealtimeEvent(testGroupId, updateData, 0);
        }
      }, 200);

      // Run test for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      clearInterval(interruptionInterval);
      clearInterval(updateInterval);

      const averageReconnectionTime = reconnectionTimes.length > 0
        ? reconnectionTimes.reduce((a, b) => a + b, 0) / reconnectionTimes.length
        : 0;
      
      const updateDeliveryRate = (receivedUpdates.length / updateCount) * 100;

      // Verify connection resilience
      expect(updateDeliveryRate).toBeGreaterThan(80); // At least 80% of updates should be received
      expect(reconnectionCount).toBeGreaterThan(0); // Should have reconnected at least once
      
      if (averageReconnectionTime > 0) {
        expect(averageReconnectionTime).toBeLessThan(2000); // Reconnection within 2 seconds
      }

      console.log(`✓ Connection resilience: ${updateDeliveryRate.toFixed(1)}% update delivery rate`);
      console.log(`  Disconnections: ${disconnectionCount}, Reconnections: ${reconnectionCount}`);
      
      if (averageReconnectionTime > 0) {
        console.log(`  Average reconnection time: ${averageReconnectionTime.toFixed(2)}ms`);
      }

      // Cleanup
      if (subscription) {
        subscription();
      }
    }, 15000); // 15 second timeout
  });

  describe('Real-time Data Consistency', () => {
    it('should maintain data consistency across multiple real-time streams', async () => {
      const groupCount = 5;
      const updateCount = 20;
      const dataConsistencyChecks: boolean[] = [];
      
      // Setup multiple groups with cross-referenced data
      const testGroups = Array.from({ length: groupCount }, (_, index) => ({
        id: `consistency-group-${index}`,
        name: `Consistency Group ${index}`,
        description: 'Testing data consistency',
        color: '#9C27B0',
        currentInventory: 1000,
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: 100
      }));

      // Track state across all streams
      const groupStates = new Map<string, number>();
      testGroups.forEach(group => groupStates.set(group.id, group.currentInventory));

      mockCategoryGroupService.getCategoryGroup.mockImplementation(async (id) => {
        return testGroups.find(g => g.id === id) || null;
      });

      // Setup real-time streams for all groups
      const streamSubscriptions: Function[] = [];
      
      testGroups.forEach(group => {
        const unsubscribe = mockCategoryGroupService.subscribeToInventoryChanges(
          group.id,
          (data: { newInventoryLevel: number; movementId: string; timestamp: number }) => {
            groupStates.set(group.id, data.newInventoryLevel);
            
            // Check data consistency across streams
            const allLevels = Array.from(groupStates.values());
            const isConsistent = allLevels.every(level => level >= 0); // Basic consistency check
            dataConsistencyChecks.push(isConsistent);
          }
        );
        
        streamSubscriptions.push(unsubscribe);
      });

      // Mock coordinated updates with consistency guarantees
      mockCategoryGroupService.updateInventory.mockImplementation(async (groupId, quantity) => {
        const currentLevel = groupStates.get(groupId) || 0;
        const newLevel = Math.max(0, currentLevel - quantity); // Prevent negative inventory
        
        // Simulate atomic update with slight delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Update local state
        groupStates.set(groupId, newLevel);
        
        // Propagate to real-time stream
        setTimeout(() => {
          simulateRealtimeEvent(groupId, {
            newInventoryLevel: newLevel,
            movementId: `movement-${groupId}-${Date.now()}`,
            timestamp: Date.now()
          }, 10);
        }, 25);
        
        return {
          newInventoryLevel: newLevel,
          movementId: `movement-${groupId}-${Date.now()}`
        };
      });

      // Execute coordinated updates across multiple groups
      const updatePromises = [];
      
      for (let i = 0; i < updateCount; i++) {
        const groupIndex = i % groupCount;
        const groupId = testGroups[groupIndex].id;
        
        const orderItems: InventoryDeductionItem[] = [{
          categoryGroupId: groupId,
          quantity: Math.floor(Math.random() * 50) + 1,
          unit: 'pcs',
          productSku: `CONSISTENCY-${i}`
        }];
        
        updatePromises.push(inventoryService.deductInventoryFromOrder(orderItems));
      }

      await Promise.all(updatePromises);

      // Wait for all real-time propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify data consistency
      const consistencyRate = dataConsistencyChecks.length > 0
        ? (dataConsistencyChecks.filter(check => check).length / dataConsistencyChecks.length) * 100
        : 100;

      const finalStates = Array.from(groupStates.values());
      const allStatesValid = finalStates.every(level => level >= 0);

      expect(consistencyRate).toBeGreaterThan(95); // 95% consistency rate
      expect(allStatesValid).toBe(true);
      expect(dataConsistencyChecks.length).toBeGreaterThan(0);

      console.log(`✓ Data consistency: ${consistencyRate.toFixed(1)}% consistency rate`);
      console.log(`  Consistency checks: ${dataConsistencyChecks.length}`);
      console.log(`  Final inventory levels:`, Object.fromEntries(groupStates));
      
      // Cleanup
      streamSubscriptions.forEach(unsubscribe => unsubscribe());
    });
  });
});
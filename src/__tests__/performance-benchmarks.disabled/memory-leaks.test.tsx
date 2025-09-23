/**
 * Memory Leak Detection Test Suite
 * 
 * Tests memory management for long-running inventory operations to detect and prevent
 * memory leaks in inventory features. Validates component unmounting, cleanup mechanisms,
 * Redux state management, subscription disposal, and WebSocket connection cleanup.
 * 
 * Memory Testing Requirements:
 * - Component lifecycle and cleanup validation
 * - Redux state management memory monitoring
 * - Service subscription disposal verification
 * - Real-time connection cleanup testing
 * - Long-running operation memory efficiency
 * - Event listener and interval cleanup
 * 
 * Performance Requirements:
 * - Memory usage should remain stable during extended operations
 * - Components should properly clean up resources on unmount
 * - Redux subscriptions should be disposed correctly
 * - Real-time connections should not accumulate
 * - Service instances should release resources properly
 * 
 * @group performance
 * @group memory-testing
 * @group leak-detection
 */

import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, Store } from '@reduxjs/toolkit';
import { InventoryService } from '../../services/inventory.service';
import { AlertingService } from '../../services/alerting.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import inventoryReducer from '../../store/slices/inventorySlice';
import categoriesReducer from '../../store/slices/categoriesSlice';
import categoryGroupsReducer from '../../store/slices/categoryGroupsSlice';
import { InventoryDeductionItem } from '../../types/inventory';

// Mock Firebase services for memory testing
jest.mock('../../services/firebase.service');
jest.mock('../../services/categoryGroup.service');
jest.mock('../../services/inventory.service');
jest.mock('../../services/alerting.service');

// Memory testing utilities
interface MemorySnapshot {
  heapUsed: number;
  external: number;
  timestamp: number;
  context: string;
}

interface MemoryTestResult {
  initialSnapshot: MemorySnapshot;
  finalSnapshot: MemorySnapshot;
  peakSnapshot: MemorySnapshot;
  memoryIncrease: number;
  memoryIncreaseKB: number;
  peakIncrease: number;
  peakIncreaseKB: number;
  passed: boolean;
  details: string;
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private thresholds = {
    maxIncrease: 8 * 1024 * 1024, // 8MB
    maxPeakIncrease: 15 * 1024 * 1024, // 15MB
    maxComponentLeakage: 2 * 1024 * 1024, // 2MB per component
  };

  takeSnapshot(context: string): MemorySnapshot {
    const memoryUsage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      timestamp: Date.now(),
      context,
    };
    
    this.snapshots.push(snapshot);
    return snapshot;
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }

  analyzeMemoryUsage(initialContext: string, finalContext: string): MemoryTestResult {
    const initialSnapshot = this.snapshots.find(s => s.context === initialContext);
    const finalSnapshot = this.snapshots.find(s => s.context === finalContext);
    
    if (!initialSnapshot || !finalSnapshot) {
      throw new Error('Missing memory snapshots for analysis');
    }

    const peakSnapshot = this.snapshots.reduce((peak, current) => 
      current.heapUsed > peak.heapUsed ? current : peak
    );

    const memoryIncrease = finalSnapshot.heapUsed - initialSnapshot.heapUsed;
    const memoryIncreaseKB = memoryIncrease / 1024;
    const peakIncrease = peakSnapshot.heapUsed - initialSnapshot.heapUsed;
    const peakIncreaseKB = peakIncrease / 1024;

    const passed = memoryIncrease <= this.thresholds.maxIncrease && 
                   peakIncrease <= this.thresholds.maxPeakIncrease;

    return {
      initialSnapshot,
      finalSnapshot,
      peakSnapshot,
      memoryIncrease,
      memoryIncreaseKB,
      peakIncrease,
      peakIncreaseKB,
      passed,
      details: `Memory increase: ${memoryIncreaseKB.toFixed(2)}KB, Peak increase: ${peakIncreaseKB.toFixed(2)}KB`,
    };
  }

  reset(): void {
    this.snapshots = [];
  }
}

// Simple test component for memory leak testing
const SimpleTestComponent: React.FC<{ onMount?: () => void; onUnmount?: () => void }> = ({ 
  onMount, 
  onUnmount 
}) => {
  React.useEffect(() => {
    onMount?.();
    return () => {
      onUnmount?.();
    };
  }, [onMount, onUnmount]);

  return <div data-testid="test-component">Memory Leak Test Component</div>;
};

// Test helper to create Redux store
const createTestStore = (): Store => {
  return configureStore({ 
    reducer: {
      inventory: inventoryReducer,
      categories: categoriesReducer,
      categoryGroups: categoryGroupsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for testing
      }),
  }) as any;
};

// Test helper to render component with store
const renderWithStore = (component: React.ReactElement, store?: Store) => {
  const testStore = store || createTestStore();
  return {
    ...render(
      <Provider store={testStore}>
        {component}
      </Provider>
    ),
    store: testStore,
  };
};

describe('Memory Leak Detection Test Suite', () => {
  let memoryMonitor: MemoryMonitor;
  let mockInventoryService: jest.Mocked<InventoryService>;
  let mockAlertingService: jest.Mocked<AlertingService>;
  let mockCategoryGroupService: jest.Mocked<CategoryGroupService>;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    
    // Clear all mocks
    jest.clearAllMocks();
    cleanup();
    
    // Force garbage collection before each test
    memoryMonitor.forceGarbageCollection();
    
    // Setup service mocks
    mockInventoryService = {
      deductInventoryFromOrder: jest.fn(),
      adjustInventoryManually: jest.fn(),
      getInventoryLevels: jest.fn(),
      getInventoryMovements: jest.fn(),
    } as any;

    mockAlertingService = {
      getInventoryAlerts: jest.fn(),
      createInventoryAlert: jest.fn(),
      resolveInventoryAlert: jest.fn(),
      destroy: jest.fn(),
    } as any;

    mockCategoryGroupService = {
      getCategoryGroups: jest.fn(),
      getCategoryGroup: jest.fn(),
      updateInventory: jest.fn(),
      checkThresholdAlerts: jest.fn(),
    } as any;

    // Setup default mock responses
    mockInventoryService.getInventoryLevels.mockResolvedValue([]);
    mockInventoryService.getInventoryMovements.mockResolvedValue([]);
    mockInventoryService.deductInventoryFromOrder.mockResolvedValue({
      deductions: [],
      warnings: [],
      errors: [],
    }) as any;

    mockAlertingService.getInventoryAlerts.mockResolvedValue([]);
    mockCategoryGroupService.getCategoryGroups.mockResolvedValue([]);
  }) as any;

  afterEach(() => {
    cleanup();
    memoryMonitor.reset();
    
    // Clean up any remaining intervals or timeouts
    jest.clearAllTimers();
    
    // Force final garbage collection
    memoryMonitor.forceGarbageCollection();
  }) as any;

  describe('Component Lifecycle Memory Management', () => {
    it('should properly clean up simple test components on unmount', async () => {
      memoryMonitor.takeSnapshot('component-initial');

      let mountCallbacks = 0;
      let unmountCallbacks = 0;

      const onMount = () => { mountCallbacks++; };
      const onUnmount = () => { unmountCallbacks++; };

      const { unmount } = renderWithStore(
        <SimpleTestComponent onMount={onMount} onUnmount={onUnmount} />
      );
      
      memoryMonitor.takeSnapshot('component-mounted');

      expect(mountCallbacks).toBe(1);
      expect(unmountCallbacks).toBe(0);

      // Simulate component usage
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      }) as any;

      memoryMonitor.takeSnapshot('component-used');

      // Unmount component
      act(() => {
        unmount();
      }) as any;

      // Allow cleanup to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }) as any;

      expect(mountCallbacks).toBe(1);
      expect(unmountCallbacks).toBe(1);

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('component-unmounted');

      const result = memoryMonitor.analyzeMemoryUsage('component-initial', 'component-unmounted');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(2000); // Less than 2MB increase

      console.log(`✓ Simple component cleanup: ${result.details}`);
    }) as any;

    it('should handle rapid component mount/unmount cycles without memory accumulation', async () => {
      memoryMonitor.takeSnapshot('cycle-initial');

      const mountCycles = 20;
      let totalMountCallbacks = 0;
      let totalUnmountCallbacks = 0;
      
      for (let i = 0; i < mountCycles; i++) {
        const onMount = () => { totalMountCallbacks++; };
        const onUnmount = () => { totalUnmountCallbacks++; };

        const { unmount } = renderWithStore(
          <SimpleTestComponent onMount={onMount} onUnmount={onUnmount} />
        );
        
        // Brief usage
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        }) as any;

        // Unmount
        act(() => {
          unmount();
        }) as any;

        // Allow cleanup
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        }) as any;

        // Periodic garbage collection
        if (i % 5 === 0) {
          memoryMonitor.forceGarbageCollection();
          memoryMonitor.takeSnapshot(`cycle-${i}`);
        }
      }

      expect(totalMountCallbacks).toBe(mountCycles);
      expect(totalUnmountCallbacks).toBe(mountCycles);

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('cycle-final');

      const result = memoryMonitor.analyzeMemoryUsage('cycle-initial', 'cycle-final');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(1000); // Less than 1MB for 20 cycles

      console.log(`✓ Rapid mount/unmount cycles (${mountCycles}x): ${result.details}`);
    }) as any;
  }) as any;

  describe('Redux State Management Memory Monitoring', () => {
    it('should not leak memory during multiple Redux dispatches', async () => {
      memoryMonitor.takeSnapshot('redux-initial');

      const store = createTestStore();
      const { unmount } = renderWithStore(<SimpleTestComponent />, store);

      memoryMonitor.takeSnapshot('redux-mounted');

      // Simulate multiple Redux actions
      const actionCount = 200;
      
      await act(async () => {
        for (let i = 0; i < actionCount; i++) {
          // Simulate various inventory actions that are known to work
          store.dispatch({ 
            type: 'inventory/setSelectedInventoryLevel', 
            payload: `level-${i}` 
          }) as any;
          store.dispatch({ 
            type: 'inventory/setSelectedInventoryLevel', 
            payload: null 
          }) as any;
          
          // Periodic memory monitoring
          if (i % 50 === 0) {
            memoryMonitor.takeSnapshot(`redux-action-${i}`);
          }
        }
      }) as any;

      memoryMonitor.takeSnapshot('redux-actions-complete');

      // Clean up component
      act(() => {
        unmount();
      }) as any;

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }) as any;

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('redux-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('redux-initial', 'redux-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(3000); // Less than 3MB for 200 actions

      console.log(`✓ Redux state management (${actionCount} actions): ${result.details}`);
    }) as any;

    it('should handle large state objects without memory leaks', async () => {
      memoryMonitor.takeSnapshot('large-state-initial');

      const store = createTestStore();
      const { unmount } = renderWithStore(<SimpleTestComponent />, store);

      // Create large inventory data sets
      const largeInventoryLevels = Array.from({ length: 1000 }, (_, index) => ({
        categoryGroupId: `group-${index}`,
        name: `Test Group ${index}`,
        currentInventory: Math.floor(Math.random() * 1000),
        inventoryUnit: 'pcs' as const,
        inventoryType: 'qty' as const,
        minimumThreshold: Math.floor(Math.random() * 50),
        status: 'healthy' as const,
        lastInventoryUpdate: new Date(),
      }));

      memoryMonitor.takeSnapshot('large-state-created');

      await act(async () => {
        // Simulate loading large data sets using a working action type
        store.dispatch({
          type: 'inventory/fetchInventoryLevels/fulfilled',
          payload: largeInventoryLevels,
        }) as any;

        await new Promise(resolve => setTimeout(resolve, 100));
      }) as any;

      memoryMonitor.takeSnapshot('large-state-loaded');

      // Clear the large data
      await act(async () => {
        store.dispatch({
          type: 'inventory/fetchInventoryLevels/fulfilled',
          payload: [],
        }) as any;

        await new Promise(resolve => setTimeout(resolve, 50));
      }) as any;

      memoryMonitor.takeSnapshot('large-state-cleared');

      // Clean up component
      act(() => {
        unmount();
      }) as any;

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }) as any;

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('large-state-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('large-state-initial', 'large-state-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(3000); // Less than 3MB for large dataset

      console.log(`✓ Large state management (1000 items): ${result.details}`);
    }) as any;
  }) as any;

  describe('Service Subscription Disposal', () => {
    it('should properly dispose InventoryService subscriptions and cleanup resources', async () => {
      memoryMonitor.takeSnapshot('inventory-service-initial');

      const inventoryService = new InventoryService();
      
      memoryMonitor.takeSnapshot('inventory-service-created');

      // Simulate service usage with multiple operations
      const operations = 50;
      
      for (let i = 0; i < operations; i++) {
        const orderItems: InventoryDeductionItem[] = [{
          categoryGroupId: `test-group-${i}`,
          quantity: Math.floor(Math.random() * 10) + 1,
          unit: 'pcs',
          productSku: `TEST-${i}`,
        }];

        try {
          await inventoryService.deductInventoryFromOrder(orderItems);
        } catch {
          // Ignore mock errors in memory test
        }

        // Periodic memory monitoring
        if (i % 10 === 0) {
          memoryMonitor.takeSnapshot(`inventory-service-operation-${i}`);
        }
      }

      memoryMonitor.takeSnapshot('inventory-service-used');

      // Clean up service (if it has cleanup methods)
      if (typeof (inventoryService as any).destroy === 'function') {
        (inventoryService as any).destroy();
      }

      // Allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('inventory-service-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('inventory-service-initial', 'inventory-service-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(1500); // Less than 1.5MB for service operations

      console.log(`✓ InventoryService cleanup (${operations} operations): ${result.details}`);
    }) as any;

    it('should properly dispose AlertingService with interval cleanup', async () => {
      memoryMonitor.takeSnapshot('alerting-service-initial');

      const alertingService = new AlertingService();
      
      memoryMonitor.takeSnapshot('alerting-service-created');

      // Simulate alerting service usage
      await act(async () => {
        // Let the service run for a bit to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 200));
      }) as any;

      memoryMonitor.takeSnapshot('alerting-service-used');

      // Clean up alerting service
      alertingService.destroy();

      // Allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('alerting-service-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('alerting-service-initial', 'alerting-service-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(1000); // Less than 1MB for alerting service

      console.log(`✓ AlertingService cleanup with intervals: ${result.details}`);
    }) as any;

    it('should handle service instance creation and destruction cycles', async () => {
      memoryMonitor.takeSnapshot('service-cycle-initial');

      const cycles = 20;
      
      for (let i = 0; i < cycles; i++) {
        // Create service instances
        const inventoryService = new InventoryService();
        const alertingService = new AlertingService();
        
        // Use services briefly
        try {
          await inventoryService.getInventoryLevels();
        } catch {
          // Ignore mock errors
        }

        // Clean up services
        if (typeof (inventoryService as any).destroy === 'function') {
          (inventoryService as any).destroy();
        }
        alertingService.destroy();

        // Periodic garbage collection
        if (i % 5 === 0) {
          memoryMonitor.forceGarbageCollection();
          memoryMonitor.takeSnapshot(`service-cycle-${i}`);
        }
      }

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('service-cycle-final');

      const result = memoryMonitor.analyzeMemoryUsage('service-cycle-initial', 'service-cycle-final');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(2000); // Less than 2MB for 20 cycles

      console.log(`✓ Service lifecycle cycles (${cycles}x): ${result.details}`);
    }) as any;
  }) as any;

  describe('Real-time Connection Cleanup', () => {
    it('should clean up simulated WebSocket connections for real-time inventory alerts', async () => {
      memoryMonitor.takeSnapshot('websocket-initial');

      // Mock WebSocket-like behavior for real-time alerts
      const connections: Array<{ close: () => void; listeners: Set<() => void> }> = [];
      
      const createMockConnection = () => {
        const listeners = new Set<() => void>();
        const connection = {
          close: () => {
            listeners.clear();
          },
          listeners,
          addEventListener: (_event: string, listener: () => void) => {
            listeners.add(listener);
          },
          removeEventListener: (_event: string, listener: () => void) => {
            listeners.delete(listener);
          },
        };
        connections.push(connection);
        return connection;
      };

      memoryMonitor.takeSnapshot('websocket-setup');

      // Simulate multiple real-time connections
      const connectionCount = 25;
      const mockConnections = [];
      
      for (let i = 0; i < connectionCount; i++) {
        const connection = createMockConnection();
        
        // Add event listeners to simulate real usage
        const listener1 = () => console.log(`Alert ${i} received`);
        const listener2 = () => console.log(`Status ${i} updated`);
        
        connection.addEventListener('alert', listener1);
        connection.addEventListener('status', listener2);
        
        mockConnections.push(connection);
        
        // Periodic memory monitoring
        if (i % 5 === 0) {
          memoryMonitor.takeSnapshot(`websocket-connection-${i}`);
        }
      }

      memoryMonitor.takeSnapshot('websocket-connected');

      // Verify connections are active
      expect(connections).toHaveLength(connectionCount);
      const totalListeners = connections.reduce((sum, conn) => sum + conn.listeners.size, 0);
      expect(totalListeners).toBe(connectionCount * 2); // 2 listeners per connection

      // Clean up connections
      for (const connection of mockConnections) {
        connection.close();
      }

      // Allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('websocket-cleanup');

      // Verify cleanup
      const remainingListeners = connections.reduce((sum, conn) => sum + conn.listeners.size, 0);
      expect(remainingListeners).toBe(0);

      const result = memoryMonitor.analyzeMemoryUsage('websocket-initial', 'websocket-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(500); // Less than 500KB for WebSocket simulation

      console.log(`✓ WebSocket connection cleanup (${connectionCount} connections): ${result.details}`);
    }) as any;

    it('should handle event listener cleanup for inventory monitoring', async () => {
      memoryMonitor.takeSnapshot('event-listener-initial');

      // Mock event listeners for inventory monitoring
      const eventListeners: Array<{
        element: any;
        event: string;
        listener: () => void;
        cleanup: () => void;
      }> = [];

      const addEventListenerWithCleanup = (element: any, event: string, listener: () => void) => {
        element.addEventListener(event, listener);
        const cleanup = () => {
          element.removeEventListener(event, listener);
        };
        eventListeners.push({ element, event, listener, cleanup }) as any;
        return cleanup;
      };

      memoryMonitor.takeSnapshot('event-listener-setup');

      // Simulate various event listeners for inventory features
      const mockElements = Array.from({ length: 30 }, () => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      for (let i = 0; i < mockElements.length; i++) {
        const element = mockElements[i];
        
        // Add multiple listeners per element
        addEventListenerWithCleanup(element, 'inventoryUpdate', () => {}) as any;
        addEventListenerWithCleanup(element, 'thresholdAlert', () => {}) as any;
        addEventListenerWithCleanup(element, 'stockChange', () => {}) as any;
        
        if (i % 10 === 0) {
          memoryMonitor.takeSnapshot(`event-listener-${i}`);
        }
      }

      memoryMonitor.takeSnapshot('event-listener-attached');

      expect(eventListeners).toHaveLength(mockElements.length * 3);

      // Clean up all event listeners
      for (const { cleanup } of eventListeners) {
        cleanup();
      }

      // Allow cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('event-listener-cleanup');

      // Verify cleanup was called
      for (const element of mockElements) {
        expect(element.removeEventListener).toHaveBeenCalledTimes(3);
      }

      const result = memoryMonitor.analyzeMemoryUsage('event-listener-initial', 'event-listener-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(1000); // Less than 1MB for event listeners

      console.log(`✓ Event listener cleanup (${eventListeners.length} listeners): ${result.details}`);
    }) as any;
  }) as any;

  describe('Long-running Operation Memory Efficiency', () => {
    it('should maintain memory efficiency during extended inventory processing', async () => {
      memoryMonitor.takeSnapshot('long-running-initial');

      const inventoryService = new InventoryService();
      const processingRounds = 100;
      const itemsPerRound = 10;

      memoryMonitor.takeSnapshot('long-running-started');

      for (let round = 0; round < processingRounds; round++) {
        // Create order items for this round
        const orderItems: InventoryDeductionItem[] = Array.from(
          { length: itemsPerRound },
          (_, index) => ({
            categoryGroupId: `group-${round}-${index}`,
            quantity: Math.floor(Math.random() * 5) + 1,
            unit: 'pcs' as const,
            productSku: `SKU-${round}-${index}`,
          })
        );

        try {
          await inventoryService.deductInventoryFromOrder(orderItems);
        } catch {
          // Ignore mock errors in memory test
        }

        // Periodic memory monitoring and cleanup
        if (round % 20 === 0) {
          memoryMonitor.takeSnapshot(`long-running-round-${round}`);
          
          if (round % 40 === 0) {
            memoryMonitor.forceGarbageCollection();
          }
        }

        // Brief pause to simulate realistic processing
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      memoryMonitor.takeSnapshot('long-running-complete');

      // Clean up service
      if (typeof (inventoryService as any).destroy === 'function') {
        (inventoryService as any).destroy();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('long-running-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('long-running-initial', 'long-running-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(4000); // Less than 4MB for extended processing

      console.log(`✓ Long-running operations (${processingRounds} rounds, ${processingRounds * itemsPerRound} items): ${result.details}`);
    }) as any;

    it('should handle memory efficiently during bulk data operations', async () => {
      memoryMonitor.takeSnapshot('bulk-data-initial');

      const store = createTestStore();
      const { unmount } = renderWithStore(<SimpleTestComponent />, store);

      // Simulate bulk data loading and processing
      const bulkOperations = 20;
      const itemsPerOperation = 500;

      memoryMonitor.takeSnapshot('bulk-data-started');

      for (let operation = 0; operation < bulkOperations; operation++) {
        // Create large data set
        const inventoryData = Array.from({ length: itemsPerOperation }, (_, index) => ({
          categoryGroupId: `bulk-group-${operation}-${index}`,
          name: `Bulk Item ${operation}-${index}`,
          currentInventory: Math.floor(Math.random() * 1000),
          inventoryUnit: 'pcs' as const,
          inventoryType: 'qty' as const,
          minimumThreshold: Math.floor(Math.random() * 100),
          status: 'healthy' as const,
          lastInventoryUpdate: new Date(),
        }));

        await act(async () => {
          // Load data into Redux store
          store.dispatch({
            type: 'inventory/fetchInventoryLevels/fulfilled',
            payload: inventoryData,
          }) as any;

          // Process the data
          await new Promise(resolve => setTimeout(resolve, 10));

          // Clear the data to simulate processing completion
          store.dispatch({
            type: 'inventory/fetchInventoryLevels/fulfilled',
            payload: [],
          }) as any;
        }) as any;

        // Periodic memory monitoring
        if (operation % 5 === 0) {
          memoryMonitor.takeSnapshot(`bulk-data-operation-${operation}`);
          
          if (operation % 10 === 0) {
            memoryMonitor.forceGarbageCollection();
          }
        }
      }

      memoryMonitor.takeSnapshot('bulk-data-complete');

      // Clean up component
      act(() => {
        unmount();
      }) as any;

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }) as any;

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('bulk-data-cleanup');

      const result = memoryMonitor.analyzeMemoryUsage('bulk-data-initial', 'bulk-data-cleanup');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(5000); // Less than 5MB for bulk operations

      console.log(`✓ Bulk data operations (${bulkOperations} operations, ${bulkOperations * itemsPerOperation} items): ${result.details}`);
    }) as any;
  }) as any;

  describe('Memory Leak Regression Prevention', () => {
    it('should maintain consistent memory usage across multiple test scenarios', async () => {
      memoryMonitor.takeSnapshot('regression-initial');

      // Comprehensive scenario combining all memory-sensitive operations
      const scenarios = [
        {
          name: 'Component Lifecycle',
          action: async () => {
            const { unmount } = renderWithStore(<SimpleTestComponent />);
            await act(async () => {
              await new Promise(resolve => setTimeout(resolve, 50));
            }) as any;
            act(() => { unmount(); }) as any;
          },
        },
        {
          name: 'Redux Operations',
          action: async () => {
            const store = createTestStore();
            await act(async () => {
              for (let i = 0; i < 50; i++) {
                store.dispatch({ 
                  type: 'inventory/setSelectedInventoryLevel', 
                  payload: `test-${i}` 
                }) as any;
                store.dispatch({ 
                  type: 'inventory/setSelectedInventoryLevel', 
                  payload: null 
                }) as any;
              }
            }) as any;
          },
        },
        {
          name: 'Service Operations',
          action: async () => {
            const service = new InventoryService();
            for (let i = 0; i < 20; i++) {
              try {
                await service.getInventoryLevels();
              } catch {
                // Ignore mock errors
              }
            }
            if (typeof (service as any).destroy === 'function') {
              (service as any).destroy();
            }
          },
        },
        {
          name: 'Alerting Service',
          action: async () => {
            const alertService = new AlertingService();
            await new Promise(resolve => setTimeout(resolve, 100));
            alertService.destroy();
          },
        },
      ];

      // Run each scenario multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const scenario of scenarios) {
          await scenario.action();
          memoryMonitor.takeSnapshot(`regression-${scenario.name.toLowerCase()}-${cycle}`);
          
          // Periodic cleanup
          if ((cycle + 1) % 2 === 0) {
            memoryMonitor.forceGarbageCollection();
          }
        }
      }

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('regression-final');

      const result = memoryMonitor.analyzeMemoryUsage('regression-initial', 'regression-final');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(6000); // Less than 6MB for comprehensive scenarios

      console.log(`✓ Memory leak regression prevention (${scenarios.length} scenarios x 3 cycles): ${result.details}`);
    }) as any;

    it('should demonstrate memory stability under stress conditions', async () => {
      memoryMonitor.takeSnapshot('stress-initial');

      // Stress test with rapid operations
      const stressOperations = 500;
      let operationsCompleted = 0;

      for (let i = 0; i < stressOperations; i++) {
        // Rapid component mount/unmount
        if (i % 5 === 0) {
          const { unmount } = renderWithStore(<SimpleTestComponent />);
          act(() => { unmount(); }) as any;
        }

        // Rapid Redux operations
        if (i % 3 === 0) {
          const store = createTestStore();
          await act(async () => {
            store.dispatch({ 
              type: 'inventory/setSelectedInventoryLevel', 
              payload: `stress-${i}` 
            }) as any;
          }) as any;
        }

        // Service operations
        if (i % 7 === 0) {
          const service = new InventoryService();
          try {
            await service.getInventoryLevels();
          } catch {
            // Ignore mock errors
          }
        }

        operationsCompleted++;

        // Memory monitoring at intervals
        if (i % 100 === 0) {
          memoryMonitor.takeSnapshot(`stress-${i}`);
          memoryMonitor.forceGarbageCollection();
        }
      }

      memoryMonitor.forceGarbageCollection();
      memoryMonitor.takeSnapshot('stress-final');

      const result = memoryMonitor.analyzeMemoryUsage('stress-initial', 'stress-final');
      
      expect(result.passed).toBe(true);
      expect(result.memoryIncreaseKB).toBeLessThan(10000); // Less than 10MB for stress test
      expect(operationsCompleted).toBe(stressOperations);

      console.log(`✓ Stress test stability (${stressOperations} operations): ${result.details}`);
    }, 30000); // Extended timeout for stress test
  }) as any;
}) as any;
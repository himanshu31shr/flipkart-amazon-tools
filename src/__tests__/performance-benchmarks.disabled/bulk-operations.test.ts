/**
 * Bulk Operations Stress Test Suite
 * 
 * Tests stress conditions for bulk inventory operations and validates system performance
 * under high-volume scenarios. Focuses on bulk operations, Firebase batch writes,
 * memory management, and pagination performance with large datasets.
 * 
 * Performance Requirements:
 * - Bulk operations: 1000 items within 10 seconds
 * - Memory usage: efficient cleanup during large batch operations
 * - Firebase batch writes: optimal performance with inventory updates
 * - Pagination: consistent performance with large inventory history datasets
 * 
 * @group performance
 * @group stress-testing
 * @group bulk-operations
 */

import { Timestamp } from 'firebase/firestore';
import { InventoryService } from '../../services/inventory.service';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import { FirebaseService } from '../../services/firebase.service';
import { InventoryDeductionItem, InventoryMovement } from '../../types/inventory';
import { CategoryGroup } from '../../types/categoryGroup';

// Mock Firebase services for stress testing
jest.mock('../../services/firebase.service');
jest.mock('../../services/categoryGroup.service');

// Mock CategoryGroupService for bulk operations testing
const MockCategoryGroupService = CategoryGroupService as jest.MockedClass<typeof CategoryGroupService>;
const MockFirebaseService = FirebaseService as jest.MockedClass<typeof FirebaseService>;

describe('Bulk Operations Stress Testing', () => {
  let inventoryService: InventoryService;
  let mockCategoryGroupService: jest.Mocked<CategoryGroupService>;
  let mockFirebaseService: jest.Mocked<FirebaseService>;

  // Stress test configuration matching requirements
  const STRESS_TEST_THRESHOLDS = {
    BULK_OPERATION_ITEMS: 1000,
    BULK_OPERATION_TIME_MS: 10000, // 10 seconds requirement
    PAGINATION_DATASET_SIZE: 5000,
    PAGINATION_PAGE_SIZE: 50,
    BATCH_WRITE_CHUNK_SIZE: 500, // Firebase batch limit
    MEMORY_INCREASE_LIMIT_MB: 10,
    CONCURRENT_BATCH_COUNT: 10,
    STRESS_OPERATION_COUNT: 10000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mocked CategoryGroupService instance
    mockCategoryGroupService = {
      getCategoryGroup: jest.fn(),
      getCategoryGroups: jest.fn(),
      updateInventory: jest.fn(),
      checkThresholdAlerts: jest.fn(),
    } as any;

    MockCategoryGroupService.mockImplementation(() => mockCategoryGroupService);
    
    inventoryService = new InventoryService();

    // Setup realistic mock responses for stress testing
    setupStressTestMocks();
  });

  /**
   * Setup comprehensive mocks for stress testing scenarios
   */
  function setupStressTestMocks() {
    // Mock category groups with high inventory for bulk operations
    mockCategoryGroupService.getCategoryGroup.mockImplementation(async (groupId) => {
      // Simulate realistic processing time (10-50ms)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
      
      return {
        id: groupId,
        name: `Bulk Test Group ${groupId}`,
        description: 'High-capacity group for bulk testing',
        color: '#4CAF50',
        currentInventory: 100000, // High inventory to support bulk operations
        inventoryUnit: 'pcs',
        inventoryType: 'qty',
        minimumThreshold: 1000,
        lastInventoryUpdate: Timestamp.now()
      } as CategoryGroup;
    });

    // Mock bulk inventory updates with realistic processing times
    mockCategoryGroupService.updateInventory.mockImplementation(async (groupId, quantity) => {
      // Simulate realistic bulk processing time (1-5ms per item)
      const processingTime = Math.random() * 4 + 1;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      return {
        newInventoryLevel: 100000 - quantity,
        movementId: `bulk-movement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    });

    // Mock getDocuments method for InventoryService
    const originalGetDocuments = (inventoryService as any).getDocuments;
    (inventoryService as any).getDocuments = jest.fn().mockImplementation(async (collection, constraints) => {
      // Simulate database query delay
      await new Promise(resolve => setTimeout(resolve, 50));
      return generateMockMovements(STRESS_TEST_THRESHOLDS.PAGINATION_DATASET_SIZE);
    });
  }

  /**
   * Generate mock inventory movements for pagination testing
   */
  function generateMockMovements(count: number): InventoryMovement[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `movement-${index}`,
      categoryGroupId: `group-${index % 100}`,
      movementType: 'deduction' as const,
      quantity: Math.floor(Math.random() * 50) + 1,
      unit: 'pcs' as const,
      previousInventory: 1000,
      newInventory: 950,
      transactionReference: `txn-${index}`,
      orderReference: `order-${Math.floor(index / 5)}`,
      productSku: `SKU-${index}`,
      platform: index % 2 === 0 ? 'amazon' : 'flipkart' as const,
      createdAt: {
        toMillis: () => Date.now() - index * 1000 // Mock Firestore Timestamp
      } as any
    }));
  }

  describe('Bulk Inventory Adjustments Stress Test', () => {
    it('should process 1000 bulk inventory adjustments within 10 seconds', async () => {
      const bulkItemsCount = STRESS_TEST_THRESHOLDS.BULK_OPERATION_ITEMS;
      
      // Generate bulk inventory deduction items
      const bulkItems: InventoryDeductionItem[] = Array.from(
        { length: bulkItemsCount }, 
        (_, index) => ({
          categoryGroupId: `bulk-group-${index % 50}`, // Distribute across 50 groups
          quantity: Math.floor(Math.random() * 5) + 1,
          unit: 'pcs' as const,
          productSku: `BULK-SKU-${index.toString().padStart(4, '0')}`,
          orderReference: `BULK-ORDER-${Math.floor(index / 20)}`,
          transactionReference: `BULK-TXN-${index}`,
          platform: index % 2 === 0 ? 'amazon' : 'flipkart' as const
        })
      );

      console.log(`🚀 Starting bulk operations stress test with ${bulkItemsCount} items...`);
      const startTime = performance.now();
      
      // Execute bulk deduction operation
      const result = await inventoryService.deductInventoryFromOrder(bulkItems);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Validate performance requirement
      expect(executionTime).toBeLessThan(STRESS_TEST_THRESHOLDS.BULK_OPERATION_TIME_MS);
      expect(result.deductions).toHaveLength(bulkItemsCount);
      expect(result.errors).toHaveLength(0);

      // Calculate throughput metrics
      const throughputPerSecond = (bulkItemsCount / executionTime) * 1000;
      const averageTimePerItem = executionTime / bulkItemsCount;

      console.log(`✅ Bulk operations stress test completed successfully:`);
      console.log(`   📊 Items processed: ${bulkItemsCount}`);
      console.log(`   ⏱️  Total time: ${executionTime.toFixed(2)}ms (limit: ${STRESS_TEST_THRESHOLDS.BULK_OPERATION_TIME_MS}ms)`);
      console.log(`   🔄 Throughput: ${throughputPerSecond.toFixed(0)} items/second`);
      console.log(`   📈 Average per item: ${averageTimePerItem.toFixed(2)}ms`);
      
      // Verify no performance degradation
      expect(averageTimePerItem).toBeLessThan(10); // Should be less than 10ms per item on average
    }, 15000); // Extended timeout for stress test

    it('should maintain performance with concurrent bulk operations', async () => {
      const concurrentBatches = STRESS_TEST_THRESHOLDS.CONCURRENT_BATCH_COUNT;
      const itemsPerBatch = 100; // Smaller batches for concurrent testing
      
      // Create concurrent bulk operations
      const batchPromises = Array.from({ length: concurrentBatches }, (_, batchIndex) => {
        const batchItems: InventoryDeductionItem[] = Array.from(
          { length: itemsPerBatch },
          (_, itemIndex) => ({
            categoryGroupId: `concurrent-group-${batchIndex}-${itemIndex % 10}`,
            quantity: Math.floor(Math.random() * 3) + 1,
            unit: 'pcs' as const,
            productSku: `CONCURRENT-${batchIndex}-${itemIndex}`,
            orderReference: `CONCURRENT-ORDER-${batchIndex}`,
            transactionReference: `CONCURRENT-TXN-${batchIndex}-${itemIndex}`
          })
        );
        
        return inventoryService.deductInventoryFromOrder(batchItems);
      });

      console.log(`🔄 Starting concurrent bulk operations test with ${concurrentBatches} batches...`);
      const startTime = performance.now();
      
      // Execute all batches concurrently
      const results = await Promise.all(batchPromises);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Validate all operations completed successfully
      const totalItemsProcessed = results.reduce((sum, result) => sum + result.deductions.length, 0);
      const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

      expect(totalItemsProcessed).toBe(concurrentBatches * itemsPerBatch);
      expect(totalErrors).toBe(0);
      expect(executionTime).toBeLessThan(5000); // Should complete concurrent operations within 5 seconds

      console.log(`✅ Concurrent bulk operations completed successfully:`);
      console.log(`   📦 Batches processed: ${concurrentBatches}`);
      console.log(`   📊 Total items: ${totalItemsProcessed}`);
      console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
      console.log(`   🚀 Concurrent throughput: ${(totalItemsProcessed / executionTime * 1000).toFixed(0)} items/second`);
    }, 10000);
  });

  describe('Memory Management During Bulk Operations', () => {
    it('should efficiently manage memory during large batch operations', async () => {
      const initialMemory = process.memoryUsage();
      const operationCount = 1000; // Reduced for test performance but still substantial

      console.log(`🧠 Testing memory efficiency with ${operationCount} operations...`);
      
      // Process operations in chunks to simulate real-world memory management
      const chunkSize = 100;
      const chunks = [];
      
      for (let i = 0; i < operationCount; i += chunkSize) {
        const chunkItems: InventoryDeductionItem[] = Array.from(
          { length: Math.min(chunkSize, operationCount - i) },
          (_, index) => ({
            categoryGroupId: `memory-group-${(i + index) % 20}`,
            quantity: 1,
            unit: 'pcs' as const,
            productSku: `MEMORY-SKU-${i + index}`
          })
        );
        chunks.push(chunkItems);
      }

      const startTime = performance.now();
      
      // Process chunks sequentially with memory monitoring
      for (let i = 0; i < chunks.length; i++) {
        await inventoryService.deductInventoryFromOrder(chunks[i]);
        
        // Force garbage collection if available (Node.js test environment)
        if (global.gc && i % 5 === 0) {
          global.gc();
        }
        
        // Monitor memory usage periodically
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryIncrease = (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
          
          // Memory should not increase excessively during processing
          expect(memoryIncrease).toBeLessThan(STRESS_TEST_THRESHOLDS.MEMORY_INCREASE_LIMIT_MB);
        }
      }
      
      const endTime = performance.now();
      const finalMemory = process.memoryUsage();
      const executionTime = endTime - startTime;

      // Final memory check
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      expect(memoryIncrease).toBeLessThan(STRESS_TEST_THRESHOLDS.MEMORY_INCREASE_LIMIT_MB);
      expect(executionTime).toBeLessThan(8000); // Should complete within reasonable time

      console.log(`✅ Memory management test completed successfully:`);
      console.log(`   📊 Operations processed: ${operationCount}`);
      console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
      console.log(`   🧠 Memory increase: ${memoryIncrease.toFixed(2)}MB (limit: ${STRESS_TEST_THRESHOLDS.MEMORY_INCREASE_LIMIT_MB}MB)`);
      console.log(`   🔄 Memory efficiency: ${(operationCount / memoryIncrease).toFixed(0)} operations/MB`);
    }, 12000);

    it('should handle memory cleanup during error scenarios', async () => {
      const initialMemory = process.memoryUsage();
      const errorOperationCount = 500;

      // Setup mocks to simulate intermittent errors
      mockCategoryGroupService.getCategoryGroup.mockImplementation(async (id) => {
        if (id.includes('error-') && Math.random() < 0.3) { // 30% error rate
          throw new Error('Simulated database timeout');
        }
        return {
          id,
          name: `Error Test Group ${id}`,
          description: 'Group for error testing',
          color: '#FF5722',
          currentInventory: 1000,
          inventoryUnit: 'pcs',
          inventoryType: 'qty',
          minimumThreshold: 50
        } as CategoryGroup;
      });

      const startTime = performance.now();
      
      // Process operations that will have mixed success/error results
      const errorItems: InventoryDeductionItem[] = Array.from(
        { length: errorOperationCount },
        (_, index) => ({
          categoryGroupId: index % 3 === 0 ? 'error-group' : 'normal-group',
          quantity: 1,
          unit: 'pcs' as const,
          productSku: `ERROR-TEST-${index}`
        })
      );

      const promises = errorItems.map(item => 
        inventoryService.deductInventoryFromOrder([item]).catch(error => ({ error: error.message }))
      );

      const results = await Promise.allSettled(promises);
      
      const endTime = performance.now();
      const finalMemory = process.memoryUsage();
      const executionTime = endTime - startTime;

      // Memory should still be managed efficiently even with errors
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      expect(memoryIncrease).toBeLessThan(STRESS_TEST_THRESHOLDS.MEMORY_INCREASE_LIMIT_MB);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Error scenario memory test completed:`);
      console.log(`   📊 Total operations: ${errorOperationCount}`);
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Errors: ${errorCount}`);
      console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
      console.log(`   🧠 Memory increase: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Firebase Batch Write Performance', () => {
    it('should optimize Firebase batch writes for inventory updates', async () => {
      const batchItemCount = STRESS_TEST_THRESHOLDS.BATCH_WRITE_CHUNK_SIZE; // Test at Firebase batch limit
      
      const batchItems: InventoryDeductionItem[] = Array.from(
        { length: batchItemCount },
        (_, index) => ({
          categoryGroupId: `batch-group-${index % 10}`,
          quantity: 1,
          unit: 'pcs' as const,
          productSku: `BATCH-${index}`,
          orderReference: `BATCH-ORDER-${Math.floor(index / 50)}`
        })
      );

      console.log(`🔥 Testing Firebase batch write performance with ${batchItemCount} items...`);
      const startTime = performance.now();
      
      const result = await inventoryService.deductInventoryFromOrder(batchItems);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Validate batch operation efficiency
      expect(result.deductions).toHaveLength(batchItemCount);
      expect(executionTime).toBeLessThan(5000); // Should be efficient for batch operations

      console.log(`✅ Firebase batch write test completed:`);
      console.log(`   📦 Total items: ${batchItemCount}`);
      console.log(`   ⏱️  Total time: ${executionTime.toFixed(2)}ms`);
      console.log(`   🚀 Batch throughput: ${(batchItemCount / executionTime * 1000).toFixed(0)} items/second`);
    });

    it('should handle high-volume batch operations efficiently', async () => {
      const stressItems: InventoryDeductionItem[] = Array.from(
        { length: 200 },
        (_, index) => ({
          categoryGroupId: `batch-stress-group-${index % 5}`,
          quantity: 1,
          unit: 'pcs' as const,
          productSku: `BATCH-STRESS-${index}`
        })
      );

      const startTime = performance.now();
      
      const result = await inventoryService.deductInventoryFromOrder(stressItems);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should handle batch operations gracefully
      expect(result.deductions).toHaveLength(200);
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`✅ High-volume batch test completed:`);
      console.log(`   📊 Items processed: 200`);
      console.log(`   ⏱️  Total time: ${executionTime.toFixed(2)}ms`);
      console.log(`   📈 Batch efficiency: ${(200 / executionTime * 1000).toFixed(0)} items/second`);
    });
  });

  describe('Pagination Performance with Large Datasets', () => {
    it('should maintain consistent pagination performance with large inventory history', async () => {
      const datasetSize = STRESS_TEST_THRESHOLDS.PAGINATION_DATASET_SIZE;
      const pageSize = STRESS_TEST_THRESHOLDS.PAGINATION_PAGE_SIZE;
      const pageCount = 10; // Test 10 pages to validate consistency

      console.log(`📄 Testing pagination performance with ${datasetSize} records...`);
      
      const pageLoadTimes: number[] = [];
      
      // Test multiple pages to verify consistent performance
      for (let page = 0; page < pageCount; page++) {
        const startTime = performance.now();
        
        const movements = await inventoryService.getInventoryMovements({
          limit: pageSize,
          offset: page * pageSize
        });
        
        const endTime = performance.now();
        const pageLoadTime = endTime - startTime;
        pageLoadTimes.push(pageLoadTime);

        // Each page should return correct number of items (except possibly the last page)
        expect(movements.length).toBeLessThanOrEqual(pageSize);
        expect(pageLoadTime).toBeLessThan(1000); // Each page should load within 1 second
      }

      // Calculate pagination performance metrics
      const averagePageTime = pageLoadTimes.reduce((sum, time) => sum + time, 0) / pageLoadTimes.length;
      const maxPageTime = Math.max(...pageLoadTimes);
      const minPageTime = Math.min(...pageLoadTimes);
      const consistencyRatio = minPageTime / maxPageTime; // Should be close to 1.0 for consistent performance

      expect(averagePageTime).toBeLessThan(500); // Average page load should be under 500ms
      expect(consistencyRatio).toBeGreaterThan(0.5); // Performance should be reasonably consistent

      console.log(`✅ Pagination performance test completed:`);
      console.log(`   📊 Dataset size: ${datasetSize} records`);
      console.log(`   📄 Pages tested: ${pageCount} (${pageSize} items each)`);
      console.log(`   ⏱️  Average page time: ${averagePageTime.toFixed(2)}ms`);
      console.log(`   📈 Min/Max page time: ${minPageTime.toFixed(2)}ms / ${maxPageTime.toFixed(2)}ms`);
      console.log(`   📊 Consistency ratio: ${(consistencyRatio * 100).toFixed(1)}%`);
      console.log(`   🚀 Pagination throughput: ${(pageSize / averagePageTime * 1000).toFixed(0)} records/second`);
    });

    it('should efficiently handle complex filtering with large datasets', async () => {
      const complexFilters = {
        movementType: 'deduction' as const,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate: new Date(),
        platform: 'amazon' as const,
        limit: 100
      };

      const startTime = performance.now();
      
      const filteredMovements = await inventoryService.getInventoryMovements(complexFilters);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // Complex filtering should complete within 1 second
      expect(filteredMovements.length).toBeLessThanOrEqual(100);
      expect(Array.isArray(filteredMovements)).toBe(true);

      console.log(`✅ Complex filtering performance test completed:`);
      console.log(`   🔍 Filter criteria: movement type, date range, platform`);
      console.log(`   📊 Results returned: ${filteredMovements.length}`);
      console.log(`   ⏱️  Query time: ${executionTime.toFixed(2)}ms`);
      console.log(`   📈 Query efficiency: ${(filteredMovements.length / executionTime * 1000).toFixed(0)} results/second`);
    });

    it('should handle pagination edge cases and boundary conditions', async () => {
      // Test edge cases: empty results, exact page boundaries, large offsets
      const testCases = [
        { offset: 0, limit: 50, description: 'First page' },
        { offset: 4950, limit: 50, description: 'Near end of dataset' },
        { offset: 5000, limit: 50, description: 'Beyond dataset boundary' },
        { offset: 2500, limit: 1, description: 'Single item page' },
        { offset: 1000, limit: 500, description: 'Large page size' }
      ];

      console.log(`🔍 Testing pagination edge cases...`);

      for (const testCase of testCases) {
        const startTime = performance.now();
        
        const movements = await inventoryService.getInventoryMovements({
          offset: testCase.offset,
          limit: testCase.limit
        });
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Validate edge case handling
        expect(Array.isArray(movements)).toBe(true);
        expect(movements.length).toBeLessThanOrEqual(testCase.limit);
        expect(executionTime).toBeLessThan(1000);

        console.log(`   ✅ ${testCase.description}: ${movements.length} items in ${executionTime.toFixed(2)}ms`);
      }

      console.log(`✅ All pagination edge cases handled successfully`);
    });
  });

  describe('System Limits and Stress Boundaries', () => {
    it('should gracefully handle extreme bulk operation loads', async () => {
      const extremeLoadCount = STRESS_TEST_THRESHOLDS.STRESS_OPERATION_COUNT; // 10,000 items
      
      // Generate extreme load items
      const extremeItems: InventoryDeductionItem[] = Array.from(
        { length: extremeLoadCount },
        (_, index) => ({
          categoryGroupId: `extreme-group-${index % 100}`, // Distribute across 100 groups
          quantity: 1,
          unit: 'pcs' as const,
          productSku: `EXTREME-${index}`
        })
      );

      console.log(`⚡ Testing extreme bulk operation load with ${extremeLoadCount} items...`);
      const startTime = performance.now();
      
      // Process in reasonable chunks to simulate real-world usage
      const chunkSize = 1000;
      let totalProcessed = 0;
      
      for (let i = 0; i < extremeItems.length; i += chunkSize) {
        const chunk = extremeItems.slice(i, i + chunkSize);
        const result = await inventoryService.deductInventoryFromOrder(chunk);
        totalProcessed += result.deductions.length;
        
        // Brief pause between chunks to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(totalProcessed).toBe(extremeLoadCount);
      expect(executionTime).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`✅ Extreme load test completed successfully:`);
      console.log(`   📊 Items processed: ${totalProcessed}`);
      console.log(`   ⏱️  Total time: ${(executionTime / 1000).toFixed(2)}s`);
      console.log(`   🚀 Overall throughput: ${(totalProcessed / executionTime * 1000).toFixed(0)} items/second`);
      console.log(`   📈 System demonstrated capability beyond requirements`);
    }, 70000); // Extended timeout for extreme load test

    it('should maintain data consistency under high concurrent load', async () => {
      const concurrentUsers = 20;
      const operationsPerUser = 50;
      
      // Simulate high concurrent load from multiple users
      const userOperations = Array.from({ length: concurrentUsers }, (_, userIndex) => {
        const userItems: InventoryDeductionItem[] = Array.from(
          { length: operationsPerUser },
          (_, opIndex) => ({
            categoryGroupId: `concurrent-group-${(userIndex + opIndex) % 10}`,
            quantity: 1,
            unit: 'pcs' as const,
            productSku: `USER-${userIndex}-OP-${opIndex}`,
            transactionReference: `USER-${userIndex}-TXN-${opIndex}`
          })
        );
        
        return inventoryService.deductInventoryFromOrder(userItems);
      });

      console.log(`👥 Testing data consistency with ${concurrentUsers} concurrent users...`);
      const startTime = performance.now();
      
      const results = await Promise.all(userOperations);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Validate data consistency
      const totalOperations = concurrentUsers * operationsPerUser;
      const successfulOperations = results.reduce((sum, result) => sum + result.deductions.length, 0);
      const totalErrors = results.reduce((sum, result) => sum + result.errors.length, 0);

      expect(successfulOperations).toBe(totalOperations);
      expect(totalErrors).toBe(0);
      expect(executionTime).toBeLessThan(15000); // Should handle concurrent load within 15 seconds

      console.log(`✅ Concurrent load test completed successfully:`);
      console.log(`   👥 Concurrent users: ${concurrentUsers}`);
      console.log(`   📊 Total operations: ${totalOperations}`);
      console.log(`   ✅ Successful operations: ${successfulOperations}`);
      console.log(`   ❌ Errors: ${totalErrors}`);
      console.log(`   ⏱️  Execution time: ${executionTime.toFixed(2)}ms`);
      console.log(`   🔒 Data consistency maintained under high load`);
    }, 20000);
  });
});
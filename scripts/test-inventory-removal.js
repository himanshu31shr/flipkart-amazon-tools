#!/usr/bin/env node

/**
 * Inventory Removal Testing Suite
 * 
 * This script creates test data and validates system functionality
 * before, during, and after inventory system removal.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (for emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-project',
  });
}

const db = admin.firestore();

// Test data configurations
const TEST_DATA = {
  categories: [
    {
      id: 'electronics',
      name: 'Electronics',
      description: 'Electronic gadgets and accessories',
      costPrice: 100,
      tag: 'ELEC',
      // Inventory data that will be removed
      inventory: {
        totalQuantity: 50,
        lowStockThreshold: 10,
        lastUpdated: admin.firestore.Timestamp.now(),
        productCount: 5,
        reservedQuantity: 5
      }
    },
    {
      id: 'clothing',
      name: 'Clothing',
      description: 'Apparel and fashion items',
      costPrice: 50,
      tag: 'CLOTH',
      // Inventory data that will be removed
      inventory: {
        totalQuantity: 25,
        lowStockThreshold: 5,
        lastUpdated: admin.firestore.Timestamp.now(),
        productCount: 3,
        reservedQuantity: 2
      }
    }
  ],
  
  products: [
    {
      sku: 'ELEC001',
      name: 'Smartphone Case',
      description: 'Protective case for smartphones',
      categoryId: 'electronics',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 199,
      customCostPrice: null,
      // Inventory data that will be removed
      inventory: {
        quantity: 15,
        lowStockThreshold: 5,
        lastUpdated: admin.firestore.Timestamp.now()
      },
      metadata: {
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lastImportedFrom: 'amazon',
        listingStatus: 'active'
      }
    },
    {
      sku: 'ELEC002',
      name: 'USB Cable',
      description: 'High-speed USB charging cable',
      categoryId: 'electronics',
      platform: 'flipkart',
      visibility: 'visible',
      sellingPrice: 99,
      customCostPrice: 25,
      // Inventory data that will be removed
      inventory: {
        quantity: 35,
        lowStockThreshold: 10,
        lastUpdated: admin.firestore.Timestamp.now()
      },
      metadata: {
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lastImportedFrom: 'flipkart'
      }
    },
    {
      sku: 'CLOTH001',
      name: 'Cotton T-Shirt',
      description: 'Comfortable cotton t-shirt',
      categoryId: 'clothing',
      platform: 'amazon',
      visibility: 'visible',
      sellingPrice: 499,
      customCostPrice: null,
      // Inventory data that will be removed (LOW STOCK)
      inventory: {
        quantity: 3,
        lowStockThreshold: 5,
        lastUpdated: admin.firestore.Timestamp.now()
      },
      metadata: {
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    }
  ],
  
  inventoryOperations: [
    {
      id: 'op001',
      categoryId: 'electronics',
      type: 'add',
      quantity: 10,
      previousQuantity: 40,
      newQuantity: 50,
      reason: 'Stock replenishment',
      performedBy: 'system',
      timestamp: admin.firestore.Timestamp.now(),
      metadata: { source: 'purchase_order' }
    },
    {
      id: 'op002',
      categoryId: 'clothing',
      type: 'remove',
      quantity: 5,
      previousQuantity: 30,
      newQuantity: 25,
      reason: 'Order fulfillment',
      performedBy: 'system',
      timestamp: admin.firestore.Timestamp.now(),
      metadata: { orderId: 'order123' }
    }
  ],
  
  // Test orders to ensure order processing works without inventory
  transactions: [
    {
      transactionId: 'TXN001',
      platform: 'amazon',
      orderDate: admin.firestore.Timestamp.now(),
      sku: 'ELEC001',
      quantity: 2,
      sellingPrice: 199,
      expenses: {
        amazonFees: 25,
        shippingCost: 10,
        packagingCost: 5
      },
      product: {
        name: 'Smartphone Case',
        category: 'Electronics'
      },
      metadata: {
        createdBy: 'system',
        orderId: 'AMZ123456'
      },
      hash: 'test-hash-001'
    }
  ]
};

/**
 * Seed test data for inventory removal validation
 */
async function seedTestData() {
  console.log('🌱 Seeding test data for inventory removal...');
  
  try {
    // Seed categories
    for (const category of TEST_DATA.categories) {
      await db.collection('categories').doc(category.id).set({
        ...category,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
    }
    console.log('✅ Categories seeded');
    
    // Seed products
    for (const product of TEST_DATA.products) {
      await db.collection('products').doc(product.sku).set(product);
    }
    console.log('✅ Products seeded');
    
    // Seed inventory operations
    for (const operation of TEST_DATA.inventoryOperations) {
      await db.collection('inventoryOperations').doc(operation.id).set(operation);
    }
    console.log('✅ Inventory operations seeded');
    
    // Seed transactions
    for (const transaction of TEST_DATA.transactions) {
      await db.collection('transactions').doc(transaction.transactionId).set(transaction);
    }
    console.log('✅ Transactions seeded');
    
    console.log('🎉 Test data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

/**
 * Validate system functionality before inventory removal
 */
async function validatePreRemoval() {
  console.log('🔍 Running pre-removal validation tests...');
  
  const results = {
    categories: { success: false, details: null },
    products: { success: false, details: null },
    inventoryOperations: { success: false, details: null },
    lowStockDetection: { success: false, details: null }
  };
  
  try {
    // Test category retrieval with inventory
    const categoriesSnapshot = await db.collection('categories').get();
    const categoriesWithInventory = categoriesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(cat => cat.inventory);
    
    results.categories.success = categoriesWithInventory.length === 2;
    results.categories.details = `Found ${categoriesWithInventory.length} categories with inventory`;
    
    // Test product retrieval with inventory
    const productsSnapshot = await db.collection('products').get();
    const productsWithInventory = productsSnapshot.docs
      .map(doc => ({ sku: doc.id, ...doc.data() }))
      .filter(product => product.inventory);
    
    results.products.success = productsWithInventory.length === 3;
    results.products.details = `Found ${productsWithInventory.length} products with inventory`;
    
    // Test inventory operations
    const operationsSnapshot = await db.collection('inventoryOperations').get();
    results.inventoryOperations.success = operationsSnapshot.size === 2;
    results.inventoryOperations.details = `Found ${operationsSnapshot.size} inventory operations`;
    
    // Test low stock detection
    const lowStockProducts = productsWithInventory.filter(product => 
      product.inventory.quantity <= product.inventory.lowStockThreshold
    );
    results.lowStockDetection.success = lowStockProducts.length === 1; // CLOTH001
    results.lowStockDetection.details = `Detected ${lowStockProducts.length} low stock products`;
    
    console.log('📊 Pre-removal validation results:');
    Object.entries(results).forEach(([test, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${test}: ${result.details}`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Pre-removal validation failed:', error);
    throw error;
  }
}

/**
 * Validate system functionality after inventory removal
 */
async function validatePostRemoval() {
  console.log('🔍 Running post-removal validation tests...');
  
  const results = {
    categoriesClean: { success: false, details: null },
    productsClean: { success: false, details: null },
    inventoryOperationsRemoved: { success: false, details: null },
    coreWorkflowsIntact: { success: false, details: null }
  };
  
  try {
    // Test that categories no longer have inventory fields
    const categoriesSnapshot = await db.collection('categories').get();
    const categoriesWithInventory = categoriesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(cat => cat.inventory);
    
    results.categoriesClean.success = categoriesWithInventory.length === 0;
    results.categoriesClean.details = `${categoriesWithInventory.length} categories still have inventory data`;
    
    // Test that products no longer have inventory fields
    const productsSnapshot = await db.collection('products').get();
    const productsWithInventory = productsSnapshot.docs
      .map(doc => ({ sku: doc.id, ...doc.data() }))
      .filter(product => product.inventory);
    
    results.productsClean.success = productsWithInventory.length === 0;
    results.productsClean.details = `${productsWithInventory.length} products still have inventory data`;
    
    // Test that inventory operations collection is removed
    try {
      const operationsSnapshot = await db.collection('inventoryOperations').get();
      results.inventoryOperationsRemoved.success = operationsSnapshot.size === 0;
      results.inventoryOperationsRemoved.details = `Collection still has ${operationsSnapshot.size} documents`;
    } catch (error) {
      // Collection might not exist, which is expected
      results.inventoryOperationsRemoved.success = true;
      results.inventoryOperationsRemoved.details = 'Collection successfully removed';
    }
    
    // Test that core workflows still work (categories and products exist)
    const categoriesExist = categoriesSnapshot.size > 0;
    const productsExist = productsSnapshot.size > 0;
    const transactionsSnapshot = await db.collection('transactions').get();
    const transactionsExist = transactionsSnapshot.size > 0;
    
    results.coreWorkflowsIntact.success = categoriesExist && productsExist && transactionsExist;
    results.coreWorkflowsIntact.details = `Categories: ${categoriesExist}, Products: ${productsExist}, Transactions: ${transactionsExist}`;
    
    console.log('📊 Post-removal validation results:');
    Object.entries(results).forEach(([test, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${test}: ${result.details}`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Post-removal validation failed:', error);
    throw error;
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    const batch = db.batch();
    
    // Delete test categories
    for (const category of TEST_DATA.categories) {
      batch.delete(db.collection('categories').doc(category.id));
    }
    
    // Delete test products
    for (const product of TEST_DATA.products) {
      batch.delete(db.collection('products').doc(product.sku));
    }
    
    // Delete test inventory operations
    for (const operation of TEST_DATA.inventoryOperations) {
      batch.delete(db.collection('inventoryOperations').doc(operation.id));
    }
    
    // Delete test transactions
    for (const transaction of TEST_DATA.transactions) {
      batch.delete(db.collection('transactions').doc(transaction.transactionId));
    }
    
    await batch.commit();
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}

/**
 * Generate test report
 */
async function generateReport(preResults, postResults = null) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(__dirname, `../docs/inventory-removal-test-report-${timestamp.split('T')[0]}.md`);
  
  let report = `# Inventory Removal Test Report
  
**Generated**: ${timestamp}
**Test Environment**: Emulator

## Pre-Removal Validation Results

| Test | Status | Details |
|------|--------|---------|
`;

  Object.entries(preResults).forEach(([test, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    report += `| ${test} | ${status} | ${result.details} |\n`;
  });

  if (postResults) {
    report += `
## Post-Removal Validation Results

| Test | Status | Details |
|------|--------|---------|
`;

    Object.entries(postResults).forEach(([test, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      report += `| ${test} | ${status} | ${result.details} |\n`;
    });

    const allPostTestsPassed = Object.values(postResults).every(result => result.success);
    
    report += `
## Summary

**Inventory Removal Status**: ${allPostTestsPassed ? '✅ SUCCESS' : '❌ FAILED'}

### Key Findings
- Categories cleaned: ${postResults.categoriesClean.success ? 'Yes' : 'No'}
- Products cleaned: ${postResults.productsClean.success ? 'Yes' : 'No'}
- Inventory operations removed: ${postResults.inventoryOperationsRemoved.success ? 'Yes' : 'No'}
- Core workflows intact: ${postResults.coreWorkflowsIntact.success ? 'Yes' : 'No'}

### Recommendations
${allPostTestsPassed ? 
  '- ✅ System is ready for production deployment' : 
  '- ❌ Address failing tests before proceeding'
}
`;
  }

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report generated: ${reportPath}`);
  return reportPath;
}

// Main execution functions
async function runPreRemovalTests() {
  console.log('🚀 Starting pre-removal testing phase...');
  
  await seedTestData();
  const preResults = await validatePreRemoval();
  await generateReport(preResults);
  
  console.log('✅ Pre-removal tests completed!');
  return preResults;
}

async function runPostRemovalTests() {
  console.log('🚀 Starting post-removal testing phase...');
  
  const postResults = await validatePostRemoval();
  // For post-removal, we don't have pre-results, so pass empty object
  await generateReport({}, postResults);
  
  console.log('✅ Post-removal tests completed!');
  return postResults;
}

// CLI interface
const command = process.argv[2];

if (command) {
  switch (command) {
    case 'pre-removal':
      runPreRemovalTests().catch(console.error);
      break;
    case 'post-removal':
      runPostRemovalTests().catch(console.error);
      break;
    case 'seed':
      seedTestData().catch(console.error);
      break;
    case 'cleanup':
      cleanupTestData().catch(console.error);
      break;
    default:
      console.log(`
Usage: node test-inventory-removal.js <command>

Commands:
  pre-removal    Run tests before inventory removal
  post-removal   Run tests after inventory removal
  seed           Seed test data only
  cleanup        Clean up test data only

Examples:
  npm run test:inventory:pre
  npm run test:inventory:post
      `);
  }
}

export {
  seedTestData,
  validatePreRemoval,
  validatePostRemoval,
  cleanupTestData,
  generateReport,
  runPreRemovalTests,
  runPostRemovalTests
};
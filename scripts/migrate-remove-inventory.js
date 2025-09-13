#!/usr/bin/env node

/**
 * Database Migration Script: Remove Inventory Fields
 * 
 * This script safely removes inventory-related fields from Firestore collections
 * while preserving all other data integrity.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  });
}

const db = admin.firestore();

/**
 * Migration configuration
 */
const MIGRATION_CONFIG = {
  batchSize: 100, // Process documents in batches to avoid memory issues
  collections: {
    products: {
      fieldsToRemove: ['inventory'],
      preserveFields: ['sku', 'name', 'description', 'categoryId', 'platform', 'visibility', 'sellingPrice', 'customCostPrice', 'metadata']
    },
    categories: {
      fieldsToRemove: ['inventory'],
      preserveFields: ['name', 'description', 'costPrice', 'tag', 'createdAt', 'updatedAt']
    }
  },
  collectionsToDelete: ['inventoryOperations']
};

/**
 * Create backup of data before migration
 */
async function createBackup() {
  console.log('📦 Creating backup of inventory data...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backup = {
    timestamp,
    collections: {}
  };

  try {
    // Backup products with inventory
    console.log('  Backing up products...');
    const productsSnapshot = await db.collection('products').get();
    backup.collections.products = productsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(product => product.inventory);
    
    console.log(`    Found ${backup.collections.products.length} products with inventory`);

    // Backup categories with inventory
    console.log('  Backing up categories...');
    const categoriesSnapshot = await db.collection('categories').get();
    backup.collections.categories = categoriesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(category => category.inventory);
    
    console.log(`    Found ${backup.collections.categories.length} categories with inventory`);

    // Backup inventory operations
    console.log('  Backing up inventory operations...');
    const operationsSnapshot = await db.collection('inventoryOperations').get();
    backup.collections.inventoryOperations = operationsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`    Found ${backup.collections.inventoryOperations.length} inventory operations`);

    // Save backup to file
    const backupPath = path.join(backupDir, `inventory-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup created: ${backupPath}`);
    return backupPath;

  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    throw error;
  }
}

/**
 * Remove fields from a document while preserving others
 */
function sanitizeDocument(docData, fieldsToRemove, preserveFields) {
  const sanitized = {};
  
  // Only include fields that are not in the removal list
  Object.keys(docData).forEach(field => {
    if (!fieldsToRemove.includes(field)) {
      sanitized[field] = docData[field];
    }
  });

  // Verify all preserve fields are included (if they existed)
  preserveFields.forEach(field => {
    if (docData[field] !== undefined && !fieldsToRemove.includes(field)) {
      sanitized[field] = docData[field];
    }
  });

  return sanitized;
}

/**
 * Migrate a single collection by removing specified fields
 */
async function migrateCollection(collectionName, config) {
  console.log(`🔄 Migrating collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  No documents found in ${collectionName}`);
    return { processed: 0, migrated: 0 };
  }

  let processed = 0;
  let migrated = 0;
  const batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const docData = doc.data();
    const hasFieldsToRemove = config.fieldsToRemove.some(field => docData[field] !== undefined);
    
    if (hasFieldsToRemove) {
      const sanitizedData = sanitizeDocument(docData, config.fieldsToRemove, config.preserveFields);
      batch.set(doc.ref, sanitizedData);
      migrated++;
      batchCount++;
      
      // Commit batch if it reaches the limit
      if (batchCount >= MIGRATION_CONFIG.batchSize) {
        await batch.commit();
        console.log(`    Committed batch of ${batchCount} updates`);
        batchCount = 0;
      }
    }
    
    processed++;
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
    console.log(`    Committed final batch of ${batchCount} updates`);
  }

  console.log(`✅ ${collectionName}: Processed ${processed} docs, migrated ${migrated} docs`);
  return { processed, migrated };
}

/**
 * Delete entire collections
 */
async function deleteCollection(collectionName) {
  console.log(`🗑️  Deleting collection: ${collectionName}`);
  
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`  Collection ${collectionName} is already empty`);
    return 0;
  }

  let deleted = 0;
  const batch = db.batch();
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    deleted++;
  });
  
  await batch.commit();
  console.log(`✅ Deleted ${deleted} documents from ${collectionName}`);
  return deleted;
}

/**
 * Validate migration results
 */
async function validateMigration() {
  console.log('🔍 Validating migration results...');
  
  const results = {
    productsWithInventory: 0,
    categoriesWithInventory: 0,
    inventoryOperationsRemaining: 0,
    coreDataIntact: true
  };

  try {
    // Check products no longer have inventory fields
    const productsSnapshot = await db.collection('products').get();
    results.productsWithInventory = productsSnapshot.docs
      .filter(doc => doc.data().inventory !== undefined).length;
    
    // Check categories no longer have inventory fields
    const categoriesSnapshot = await db.collection('categories').get();
    results.categoriesWithInventory = categoriesSnapshot.docs
      .filter(doc => doc.data().inventory !== undefined).length;
    
    // Check inventory operations collection is empty/deleted
    try {
      const operationsSnapshot = await db.collection('inventoryOperations').get();
      results.inventoryOperationsRemaining = operationsSnapshot.size;
    } catch (error) {
      // Collection might not exist, which is good
      results.inventoryOperationsRemaining = 0;
    }

    // Verify core data is intact
    const productCount = productsSnapshot.size;
    const categoryCount = categoriesSnapshot.size;
    results.coreDataIntact = productCount > 0 && categoryCount > 0;

    console.log('📊 Validation Results:');
    console.log(`  Products with inventory: ${results.productsWithInventory}`);
    console.log(`  Categories with inventory: ${results.categoriesWithInventory}`);
    console.log(`  Inventory operations remaining: ${results.inventoryOperationsRemaining}`);
    console.log(`  Core data intact: ${results.coreDataIntact ? 'Yes' : 'No'}`);

    const migrationSuccessful = 
      results.productsWithInventory === 0 && 
      results.categoriesWithInventory === 0 && 
      results.inventoryOperationsRemaining === 0 && 
      results.coreDataIntact;

    return { success: migrationSuccessful, results };

  } catch (error) {
    console.error('❌ Migration validation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate migration report
 */
async function generateMigrationReport(backupPath, migrationResults, validationResults) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(__dirname, `../docs/inventory-migration-report-${timestamp.split('T')[0]}.md`);
  
  const report = `# Inventory Migration Report

**Date**: ${timestamp}
**Status**: ${validationResults.success ? '✅ SUCCESS' : '❌ FAILED'}
**Backup Location**: ${backupPath}

## Migration Summary

### Collections Migrated
${Object.entries(migrationResults.collections || {}).map(([collection, result]) => 
  `- **${collection}**: ${result.migrated}/${result.processed} documents updated`
).join('\n')}

### Collections Deleted
${migrationResults.deleted ? Object.entries(migrationResults.deleted).map(([collection, count]) => 
  `- **${collection}**: ${count} documents deleted`
).join('\n') : 'None'}

## Validation Results

| Check | Status | Details |
|-------|--------|---------|
| Products Cleaned | ${validationResults.results?.productsWithInventory === 0 ? '✅' : '❌'} | ${validationResults.results?.productsWithInventory || 0} products still have inventory |
| Categories Cleaned | ${validationResults.results?.categoriesWithInventory === 0 ? '✅' : '❌'} | ${validationResults.results?.categoriesWithInventory || 0} categories still have inventory |
| Inventory Ops Removed | ${validationResults.results?.inventoryOperationsRemaining === 0 ? '✅' : '❌'} | ${validationResults.results?.inventoryOperationsRemaining || 0} operations remaining |
| Core Data Intact | ${validationResults.results?.coreDataIntact ? '✅' : '❌'} | Products and categories exist |

## Migration Status

${validationResults.success ? `
✅ **Migration Completed Successfully**

All inventory-related data has been successfully removed from the database while preserving core business data.

### Next Steps
1. Deploy updated application code without inventory components
2. Monitor application performance and functionality
3. Archive backup files after verification period

` : `
❌ **Migration Failed**

${validationResults.error ? `**Error**: ${validationResults.error}` : 'See validation results above for details.'}

### Recovery Steps
1. Stop any deployment processes
2. Restore from backup if necessary: \`${backupPath}\`
3. Review migration logs and fix issues
4. Re-run migration after fixes

`}

## Backup Information

**Backup File**: \`${backupPath}\`
**Contents**: Complete inventory data from products, categories, and inventory operations

To restore from backup:
\`\`\`bash
node scripts/restore-inventory-backup.js ${path.basename(backupPath)}
\`\`\`

---
*Generated automatically by inventory migration script*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Migration report generated: ${reportPath}`);
  return reportPath;
}

/**
 * Main migration execution
 */
async function runMigration() {
  console.log('🚀 Starting inventory removal migration...');
  
  try {
    // Step 1: Create backup
    const backupPath = await createBackup();
    
    // Step 2: Migrate collections
    const migrationResults = {
      collections: {},
      deleted: {}
    };
    
    for (const [collectionName, config] of Object.entries(MIGRATION_CONFIG.collections)) {
      migrationResults.collections[collectionName] = await migrateCollection(collectionName, config);
    }
    
    // Step 3: Delete collections
    for (const collectionName of MIGRATION_CONFIG.collectionsToDelete) {
      migrationResults.deleted[collectionName] = await deleteCollection(collectionName);
    }
    
    // Step 4: Validate results
    const validationResults = await validateMigration();
    
    // Step 5: Generate report
    await generateMigrationReport(backupPath, migrationResults, validationResults);
    
    if (validationResults.success) {
      console.log('🎉 Migration completed successfully!');
      console.log('📋 Key achievements:');
      console.log('  ✅ All inventory fields removed from products and categories');
      console.log('  ✅ Inventory operations collection deleted');
      console.log('  ✅ Core business data preserved');
      console.log(`  📦 Backup available at: ${backupPath}`);
    } else {
      console.log('❌ Migration failed validation. Check the report for details.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Migration failed with error:', error);
    console.log('🔄 Please check logs and restore from backup if necessary');
    process.exit(1);
  }
}

/**
 * Dry run mode - show what would be migrated without making changes
 */
async function runDryRun() {
  console.log('🧪 Running migration in DRY RUN mode...');
  console.log('ℹ️  No changes will be made to the database');
  
  try {
    for (const [collectionName, config] of Object.entries(MIGRATION_CONFIG.collections)) {
      console.log(`\n🔍 Analyzing collection: ${collectionName}`);
      
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (snapshot.empty) {
        console.log(`  No documents found`);
        continue;
      }

      let documentsWithInventory = 0;
      let fieldsToRemoveCount = 0;
      
      snapshot.docs.forEach(doc => {
        const docData = doc.data();
        const hasFieldsToRemove = config.fieldsToRemove.some(field => docData[field] !== undefined);
        
        if (hasFieldsToRemove) {
          documentsWithInventory++;
          config.fieldsToRemove.forEach(field => {
            if (docData[field] !== undefined) fieldsToRemoveCount++;
          });
        }
      });
      
      console.log(`  Total documents: ${snapshot.size}`);
      console.log(`  Documents to migrate: ${documentsWithInventory}`);
      console.log(`  Fields to remove: ${fieldsToRemoveCount}`);
    }
    
    // Analyze collections to delete
    console.log('\n🗑️  Collections to delete:');
    for (const collectionName of MIGRATION_CONFIG.collectionsToDelete) {
      const snapshot = await db.collection(collectionName).get();
      console.log(`  ${collectionName}: ${snapshot.size} documents`);
    }
    
    console.log('\n✅ Dry run completed - review results above');
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
  }
}

// CLI interface
const command = process.argv[2];

if (command) {
  switch (command) {
    case 'run':
      runMigration().catch(console.error);
      break;
    case 'dry-run':
      runDryRun().catch(console.error);
      break;
    case 'backup':
      createBackup().catch(console.error);
      break;
    case 'validate':
      validateMigration().then(results => {
        console.log('Validation results:', results);
      }).catch(console.error);
      break;
    default:
      console.log(`
Usage: node migrate-remove-inventory.js <command>

Commands:
  run        Execute the migration (removes inventory data)
  dry-run    Show what would be migrated without making changes
  backup     Create backup only
  validate   Validate current state

Examples:
  node migrate-remove-inventory.js dry-run
  node migrate-remove-inventory.js run
      `);
  }
}

export {
  runMigration,
  runDryRun,
  createBackup,
  validateMigration,
  generateMigrationReport
};
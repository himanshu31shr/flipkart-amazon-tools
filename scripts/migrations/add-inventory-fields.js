#!/usr/bin/env node
/* eslint-disable no-undef */
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  collection,
  doc,
  getDocs,
  updateDoc,
  setDoc,
  getFirestore,
  Timestamp,
} from "firebase/firestore";

dotenv.config({
  path: ".env.local",
});

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulators if running locally
try {
  if (process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST) {
    connectFirestoreEmulator(
      db,
      process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST,
      process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT
    );
    console.log("🔥 Connected to Firestore emulator");
  }
} catch (error) {
  console.warn("⚠️  Emulator connection failed or already connected:", error.message);
}

// Migration configuration
const MIGRATION_CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  rollback: process.argv.includes('--rollback'),
  force: process.argv.includes('--force'),
};

// Default values for inventory fields
const DEFAULT_INVENTORY_VALUES = {
  currentInventory: 0,
  inventoryType: 'qty',
  inventoryUnit: 'pcs',
  minimumThreshold: 10,
  lastInventoryUpdate: Timestamp.now(),
};

const DEFAULT_CATEGORY_INVENTORY_VALUES = {
  inventoryType: 'qty',
  inventoryUnit: 'pcs',
  unitConversionRate: 1,
};

/**
 * Migrate categoryGroups collection to add inventory fields
 */
async function migrateCategoryGroups() {
  console.log("📦 Migrating categoryGroups collection...");
  
  try {
    const categoryGroupsRef = collection(db, "categoryGroups");
    const snapshot = await getDocs(categoryGroupsRef);
    
    if (snapshot.empty) {
      console.log("ℹ️  No categoryGroups found to migrate");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();
      
      try {
        // Check if document already has inventory fields
        const hasInventoryFields = 
          Object.prototype.hasOwnProperty.call(data, 'currentInventory') &&
          Object.prototype.hasOwnProperty.call(data, 'inventoryType') &&
          Object.prototype.hasOwnProperty.call(data, 'inventoryUnit');

        if (hasInventoryFields && !MIGRATION_CONFIG.force) {
          console.log(`⏭️  Skipping ${docId} - already has inventory fields`);
          skippedCount++;
          continue;
        }

        const updates = {};
        
        // Add missing inventory fields with default values
        if (!Object.prototype.hasOwnProperty.call(data, 'currentInventory')) {
          updates.currentInventory = DEFAULT_INVENTORY_VALUES.currentInventory;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'inventoryType')) {
          updates.inventoryType = DEFAULT_INVENTORY_VALUES.inventoryType;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'inventoryUnit')) {
          updates.inventoryUnit = DEFAULT_INVENTORY_VALUES.inventoryUnit;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'minimumThreshold')) {
          updates.minimumThreshold = DEFAULT_INVENTORY_VALUES.minimumThreshold;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'lastInventoryUpdate')) {
          updates.lastInventoryUpdate = DEFAULT_INVENTORY_VALUES.lastInventoryUpdate;
        }

        if (Object.keys(updates).length === 0) {
          console.log(`✅ ${docId} - no updates needed`);
          skippedCount++;
          continue;
        }

        if (MIGRATION_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would update ${docId}:`, updates);
          successCount++;
        } else {
          await updateDoc(doc(db, "categoryGroups", docId), updates);
          console.log(`✅ Updated categoryGroup ${docId}`, updates);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating categoryGroup ${docId}:`, error);
        errorCount++;
      }
    }

    return { success: successCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("❌ Error migrating categoryGroups:", error);
    throw error;
  }
}

/**
 * Migrate categories collection to add inventory fields
 */
async function migrateCategories() {
  console.log("🏷️  Migrating categories collection...");
  
  try {
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);
    
    if (snapshot.empty) {
      console.log("ℹ️  No categories found to migrate");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();
      
      try {
        // Check if document already has inventory fields
        const hasInventoryFields = 
          Object.prototype.hasOwnProperty.call(data, 'inventoryType') &&
          Object.prototype.hasOwnProperty.call(data, 'inventoryUnit');

        if (hasInventoryFields && !MIGRATION_CONFIG.force) {
          console.log(`⏭️  Skipping category ${docId} - already has inventory fields`);
          skippedCount++;
          continue;
        }

        const updates = {};
        
        // Add missing inventory fields with default values
        if (!Object.prototype.hasOwnProperty.call(data, 'inventoryType')) {
          updates.inventoryType = DEFAULT_CATEGORY_INVENTORY_VALUES.inventoryType;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'inventoryUnit')) {
          updates.inventoryUnit = DEFAULT_CATEGORY_INVENTORY_VALUES.inventoryUnit;
        }
        if (!Object.prototype.hasOwnProperty.call(data, 'unitConversionRate')) {
          updates.unitConversionRate = DEFAULT_CATEGORY_INVENTORY_VALUES.unitConversionRate;
        }

        if (Object.keys(updates).length === 0) {
          console.log(`✅ Category ${docId} - no updates needed`);
          skippedCount++;
          continue;
        }

        if (MIGRATION_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would update category ${docId}:`, updates);
          successCount++;
        } else {
          await updateDoc(doc(db, "categories", docId), updates);
          console.log(`✅ Updated category ${docId}`, updates);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating category ${docId}:`, error);
        errorCount++;
      }
    }

    return { success: successCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("❌ Error migrating categories:", error);
    throw error;
  }
}

/**
 * Create inventoryMovements collection with indexes
 */
async function createInventoryMovementsCollection() {
  console.log("📊 Creating inventoryMovements collection...");
  
  try {
    // Create a sample document to establish the collection
    const sampleDocRef = doc(db, "inventoryMovements", "_sample");
    const sampleData = {
      categoryGroupId: "sample",
      movementType: "sample",
      quantity: 0,
      previousInventory: 0,
      newInventory: 0,
      reason: "Collection initialization sample",
      timestamp: Timestamp.now(),
      createdBy: "migration-script",
      _isSample: true,
    };

    if (MIGRATION_CONFIG.dryRun) {
      console.log("🔍 DRY RUN - Would create inventoryMovements collection with sample doc");
    } else {
      await setDoc(sampleDocRef, sampleData);
      console.log("✅ Created inventoryMovements collection with sample document");
    }

    return { success: 1, skipped: 0, errors: 0 };
  } catch (error) {
    console.error("❌ Error creating inventoryMovements collection:", error);
    return { success: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Create inventoryAlerts collection with indexes
 */
async function createInventoryAlertsCollection() {
  console.log("🚨 Creating inventoryAlerts collection...");
  
  try {
    // Create a sample document to establish the collection
    const sampleDocRef = doc(db, "inventoryAlerts", "_sample");
    const sampleData = {
      categoryGroupId: "sample",
      alertType: "low_stock",
      currentInventory: 0,
      threshold: 10,
      message: "Collection initialization sample",
      isActive: false,
      createdAt: Timestamp.now(),
      resolvedAt: null,
      _isSample: true,
    };

    if (MIGRATION_CONFIG.dryRun) {
      console.log("🔍 DRY RUN - Would create inventoryAlerts collection with sample doc");
    } else {
      await setDoc(sampleDocRef, sampleData);
      console.log("✅ Created inventoryAlerts collection with sample document");
    }

    return { success: 1, skipped: 0, errors: 0 };
  } catch (error) {
    console.error("❌ Error creating inventoryAlerts collection:", error);
    return { success: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Rollback migration by removing inventory fields
 */
async function rollbackMigration() {
  console.log("🔄 Rolling back inventory fields migration...");
  
  const inventoryFields = [
    'currentInventory',
    'inventoryType', 
    'inventoryUnit',
    'minimumThreshold',
    'lastInventoryUpdate'
  ];

  const categoryInventoryFields = [
    'inventoryType',
    'inventoryUnit', 
    'unitConversionRate'
  ];

  try {
    // Rollback categoryGroups
    const categoryGroupsRef = collection(db, "categoryGroups");
    const cgSnapshot = await getDocs(categoryGroupsRef);
    
    let cgRollbackCount = 0;
    for (const docSnapshot of cgSnapshot.docs) {
      const data = docSnapshot.data();
      const updates = {};
      
      // Create updates object to remove inventory fields
      inventoryFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          updates[field] = null; // Firestore removes null fields
        }
      });

      if (Object.keys(updates).length > 0) {
        if (MIGRATION_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would remove fields from categoryGroup ${docSnapshot.id}:`, Object.keys(updates));
        } else {
          await updateDoc(doc(db, "categoryGroups", docSnapshot.id), updates);
          console.log(`✅ Removed inventory fields from categoryGroup ${docSnapshot.id}`);
        }
        cgRollbackCount++;
      }
    }

    // Rollback categories
    const categoriesRef = collection(db, "categories");
    const catSnapshot = await getDocs(categoriesRef);
    
    let catRollbackCount = 0;
    for (const docSnapshot of catSnapshot.docs) {
      const data = docSnapshot.data();
      const updates = {};
      
      // Create updates object to remove inventory fields
      categoryInventoryFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          updates[field] = null; // Firestore removes null fields
        }
      });

      if (Object.keys(updates).length > 0) {
        if (MIGRATION_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would remove fields from category ${docSnapshot.id}:`, Object.keys(updates));
        } else {
          await updateDoc(doc(db, "categories", docSnapshot.id), updates);
          console.log(`✅ Removed inventory fields from category ${docSnapshot.id}`);
        }
        catRollbackCount++;
      }
    }

    console.log(`🔄 Rollback completed: ${cgRollbackCount} categoryGroups, ${catRollbackCount} categories updated`);
    return { cgRollbackCount, catRollbackCount };
  } catch (error) {
    console.error("❌ Error during rollback:", error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log("🚀 Starting inventory fields migration...");
  console.log(`📋 Configuration:`, MIGRATION_CONFIG);
  
  if (MIGRATION_CONFIG.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
  }

  try {
    if (MIGRATION_CONFIG.rollback) {
      await rollbackMigration();
    } else {
      // Run forward migration
      const cgResults = await migrateCategoryGroups();
      const catResults = await migrateCategories();
      const movementsResults = await createInventoryMovementsCollection();
      const alertsResults = await createInventoryAlertsCollection();

      // Summary
      console.log("\n📊 Migration Summary:");
      console.log(`CategoryGroups: ${cgResults.success} updated, ${cgResults.skipped} skipped, ${cgResults.errors} errors`);
      console.log(`Categories: ${catResults.success} updated, ${catResults.skipped} skipped, ${catResults.errors} errors`);
      console.log(`Collections created: ${movementsResults.success + alertsResults.success}`);
      
      const totalErrors = cgResults.errors + catResults.errors + movementsResults.errors + alertsResults.errors;
      
      if (totalErrors > 0) {
        console.log(`⚠️  Migration completed with ${totalErrors} errors`);
        process.exit(1);
      } else {
        console.log("✅ Migration completed successfully!");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Command line help
function showHelp() {
  console.log(`
📦 Inventory Fields Migration Script

Usage:
  node scripts/migrations/add-inventory-fields.js [options]

Options:
  --dry-run    Preview changes without applying them
  --rollback   Remove inventory fields (reverse migration)
  --force      Force update even if fields already exist
  --help       Show this help message

Examples:
  # Preview migration
  node scripts/migrations/add-inventory-fields.js --dry-run
  
  # Run migration
  node scripts/migrations/add-inventory-fields.js
  
  # Rollback migration
  node scripts/migrations/add-inventory-fields.js --rollback
  
  # Force update all documents
  node scripts/migrations/add-inventory-fields.js --force

Collections affected:
  - categoryGroups: adds currentInventory, inventoryType, inventoryUnit, minimumThreshold, lastInventoryUpdate
  - categories: adds inventoryType, inventoryUnit, unitConversionRate
  - inventoryMovements: creates new collection
  - inventoryAlerts: creates new collection
`);
}

// Run migration when script is executed directly
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (process.argv[1].includes("add-inventory-fields.js")) {
  runMigration();
}

export { runMigration, migrateCategoryGroups, migrateCategories };
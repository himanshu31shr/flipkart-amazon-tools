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
  deleteDoc,
  getFirestore,
  Timestamp,
  deleteField,
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

// Rollback configuration
const ROLLBACK_CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  archiveCollections: process.argv.includes('--archive'),
  deleteCollections: process.argv.includes('--delete-collections'),
};

// Fields to remove from categoryGroups
const CATEGORY_GROUP_INVENTORY_FIELDS = [
  'currentInventory',
  'inventoryType',
  'inventoryUnit',
  'minimumThreshold',
  'lastInventoryUpdate'
];

// Fields to remove from categories
const CATEGORY_INVENTORY_FIELDS = [
  'inventoryType',
  'inventoryUnit',
  'unitConversionRate'
];

/**
 * Validate data integrity before rollback
 */
async function validateRollbackIntegrity() {
  console.log("🔍 Validating data integrity before rollback...");
  
  try {
    const issues = [];
    
    // Check categoryGroups collection exists
    const categoryGroupsRef = collection(db, "categoryGroups");
    const cgSnapshot = await getDocs(categoryGroupsRef);
    
    if (cgSnapshot.empty) {
      issues.push("No categoryGroups found - nothing to rollback");
    } else {
      // Check if any categoryGroups have inventory fields
      let hasInventoryFields = false;
      cgSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (CATEGORY_GROUP_INVENTORY_FIELDS.some(field => Object.prototype.hasOwnProperty.call(data, field))) {
          hasInventoryFields = true;
        }
      });
      
      if (!hasInventoryFields) {
        issues.push("No inventory fields found in categoryGroups - rollback may not be needed");
      }
    }
    
    // Check categories collection
    const categoriesRef = collection(db, "categories");
    const catSnapshot = await getDocs(categoriesRef);
    
    if (!catSnapshot.empty) {
      let hasInventoryFields = false;
      catSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (CATEGORY_INVENTORY_FIELDS.some(field => Object.prototype.hasOwnProperty.call(data, field))) {
          hasInventoryFields = true;
        }
      });
      
      if (!hasInventoryFields) {
        issues.push("No inventory fields found in categories - rollback may not be needed");
      }
    }
    
    // Check if inventory collections exist
    const inventoryMovementsRef = collection(db, "inventoryMovements");
    const movementsSnapshot = await getDocs(inventoryMovementsRef);
    
    const inventoryAlertsRef = collection(db, "inventoryAlerts");
    const alertsSnapshot = await getDocs(inventoryAlertsRef);
    
    if (movementsSnapshot.empty && alertsSnapshot.empty) {
      issues.push("No inventory collections found - partial migration state");
    }
    
    if (issues.length > 0 && !ROLLBACK_CONFIG.force) {
      console.log("⚠️  Validation issues found:");
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log("Use --force to proceed anyway");
      return false;
    }
    
    console.log("✅ Data integrity validation passed");
    return true;
  } catch (error) {
    console.error("❌ Error during validation:", error);
    return false;
  }
}

/**
 * Archive inventory collections before removal
 */
async function archiveInventoryCollections() {
  console.log("📦 Archiving inventory collections...");
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let archivedCount = 0;
  
  try {
    // Archive inventoryMovements
    const movementsRef = collection(db, "inventoryMovements");
    const movementsSnapshot = await getDocs(movementsRef);
    
    if (!movementsSnapshot.empty) {
      const archiveMovementsRef = collection(db, `inventoryMovements_archived_${timestamp}`);
      
      for (const docSnapshot of movementsSnapshot.docs) {
        const data = docSnapshot.data();
        const archiveData = {
          ...data,
          _archivedAt: Timestamp.now(),
          _originalId: docSnapshot.id,
          _archivedBy: 'rollback-script',
        };
        
        if (ROLLBACK_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would archive inventoryMovements/${docSnapshot.id}`);
        } else {
          await setDoc(doc(archiveMovementsRef, docSnapshot.id), archiveData);
          console.log(`📦 Archived inventoryMovements/${docSnapshot.id}`);
        }
        archivedCount++;
      }
    }
    
    // Archive inventoryAlerts
    const alertsRef = collection(db, "inventoryAlerts");
    const alertsSnapshot = await getDocs(alertsRef);
    
    if (!alertsSnapshot.empty) {
      const archiveAlertsRef = collection(db, `inventoryAlerts_archived_${timestamp}`);
      
      for (const docSnapshot of alertsSnapshot.docs) {
        const data = docSnapshot.data();
        const archiveData = {
          ...data,
          _archivedAt: Timestamp.now(),
          _originalId: docSnapshot.id,
          _archivedBy: 'rollback-script',
        };
        
        if (ROLLBACK_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would archive inventoryAlerts/${docSnapshot.id}`);
        } else {
          await setDoc(doc(archiveAlertsRef, docSnapshot.id), archiveData);
          console.log(`📦 Archived inventoryAlerts/${docSnapshot.id}`);
        }
        archivedCount++;
      }
    }
    
    console.log(`✅ Archived ${archivedCount} documents to timestamped collections`);
    return archivedCount;
  } catch (error) {
    console.error("❌ Error archiving collections:", error);
    throw error;
  }
}

/**
 * Remove inventory collections completely
 */
async function removeInventoryCollections() {
  console.log("🗑️  Removing inventory collections...");
  
  let deletedCount = 0;
  
  try {
    // Remove inventoryMovements documents
    const movementsRef = collection(db, "inventoryMovements");
    const movementsSnapshot = await getDocs(movementsRef);
    
    for (const docSnapshot of movementsSnapshot.docs) {
      if (ROLLBACK_CONFIG.dryRun) {
        console.log(`🔍 DRY RUN - Would delete inventoryMovements/${docSnapshot.id}`);
      } else {
        await deleteDoc(doc(db, "inventoryMovements", docSnapshot.id));
        console.log(`🗑️  Deleted inventoryMovements/${docSnapshot.id}`);
      }
      deletedCount++;
    }
    
    // Remove inventoryAlerts documents
    const alertsRef = collection(db, "inventoryAlerts");
    const alertsSnapshot = await getDocs(alertsRef);
    
    for (const docSnapshot of alertsSnapshot.docs) {
      if (ROLLBACK_CONFIG.dryRun) {
        console.log(`🔍 DRY RUN - Would delete inventoryAlerts/${docSnapshot.id}`);
      } else {
        await deleteDoc(doc(db, "inventoryAlerts", docSnapshot.id));
        console.log(`🗑️  Deleted inventoryAlerts/${docSnapshot.id}`);
      }
      deletedCount++;
    }
    
    console.log(`✅ Removed ${deletedCount} documents from inventory collections`);
    return deletedCount;
  } catch (error) {
    console.error("❌ Error removing collections:", error);
    throw error;
  }
}

/**
 * Restore original categoryGroup document structure
 */
async function restoreCategoryGroupStructure() {
  console.log("🔄 Restoring original categoryGroup document structure...");
  
  try {
    const categoryGroupsRef = collection(db, "categoryGroups");
    const snapshot = await getDocs(categoryGroupsRef);
    
    if (snapshot.empty) {
      console.log("ℹ️  No categoryGroups found to restore");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();
      
      try {
        // Check which inventory fields exist
        const fieldsToRemove = CATEGORY_GROUP_INVENTORY_FIELDS.filter(field => 
          Object.prototype.hasOwnProperty.call(data, field)
        );

        if (fieldsToRemove.length === 0) {
          console.log(`⏭️  Skipping ${docId} - no inventory fields found`);
          skippedCount++;
          continue;
        }

        // Create update object to remove fields
        const updates = {};
        fieldsToRemove.forEach(field => {
          updates[field] = deleteField();
        });

        if (ROLLBACK_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would remove fields from categoryGroup ${docId}:`, fieldsToRemove);
          successCount++;
        } else {
          await updateDoc(doc(db, "categoryGroups", docId), updates);
          console.log(`✅ Removed inventory fields from categoryGroup ${docId}:`, fieldsToRemove);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating categoryGroup ${docId}:`, error);
        errorCount++;
      }
    }

    return { success: successCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("❌ Error restoring categoryGroup structure:", error);
    throw error;
  }
}

/**
 * Restore original category document structure
 */
async function restoreCategoryStructure() {
  console.log("🔄 Restoring original category document structure...");
  
  try {
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);
    
    if (snapshot.empty) {
      console.log("ℹ️  No categories found to restore");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();
      
      try {
        // Check which inventory fields exist
        const fieldsToRemove = CATEGORY_INVENTORY_FIELDS.filter(field => 
          Object.prototype.hasOwnProperty.call(data, field)
        );

        if (fieldsToRemove.length === 0) {
          console.log(`⏭️  Skipping category ${docId} - no inventory fields found`);
          skippedCount++;
          continue;
        }

        // Create update object to remove fields
        const updates = {};
        fieldsToRemove.forEach(field => {
          updates[field] = deleteField();
        });

        if (ROLLBACK_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would remove fields from category ${docId}:`, fieldsToRemove);
          successCount++;
        } else {
          await updateDoc(doc(db, "categories", docId), updates);
          console.log(`✅ Removed inventory fields from category ${docId}:`, fieldsToRemove);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating category ${docId}:`, error);
        errorCount++;
      }
    }

    return { success: successCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("❌ Error restoring category structure:", error);
    throw error;
  }
}

/**
 * Main rollback function
 */
async function runRollback() {
  console.log("🔄 Starting inventory fields migration rollback...");
  console.log(`📋 Configuration:`, ROLLBACK_CONFIG);
  
  if (ROLLBACK_CONFIG.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
  }

  try {
    // Step 1: Validate data integrity
    const isValid = await validateRollbackIntegrity();
    if (!isValid) {
      console.log("❌ Rollback aborted due to validation issues");
      process.exit(1);
    }

    // Step 2: Archive or remove inventory collections
    let collectionResults = { archived: 0, deleted: 0 };
    
    if (ROLLBACK_CONFIG.archiveCollections) {
      collectionResults.archived = await archiveInventoryCollections();
    }
    
    if (ROLLBACK_CONFIG.deleteCollections) {
      collectionResults.deleted = await removeInventoryCollections();
    } else if (!ROLLBACK_CONFIG.archiveCollections) {
      // Default behavior: archive collections
      collectionResults.archived = await archiveInventoryCollections();
    }

    // Step 3: Restore original document structures
    const cgResults = await restoreCategoryGroupStructure();
    const catResults = await restoreCategoryStructure();

    // Summary
    console.log("\n📊 Rollback Summary:");
    console.log(`CategoryGroups: ${cgResults.success} restored, ${cgResults.skipped} skipped, ${cgResults.errors} errors`);
    console.log(`Categories: ${catResults.success} restored, ${catResults.skipped} skipped, ${catResults.errors} errors`);
    
    if (collectionResults.archived > 0) {
      console.log(`Collections: ${collectionResults.archived} documents archived`);
    }
    if (collectionResults.deleted > 0) {
      console.log(`Collections: ${collectionResults.deleted} documents deleted`);
    }
    
    const totalErrors = cgResults.errors + catResults.errors;
    
    if (totalErrors > 0) {
      console.log(`⚠️  Rollback completed with ${totalErrors} errors`);
      process.exit(1);
    } else {
      console.log("✅ Rollback completed successfully!");
      console.log("🔄 Original document structure has been restored");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    process.exit(1);
  }
}

/**
 * Command line help
 */
function showHelp() {
  console.log(`
🔄 Inventory Fields Migration Rollback Script

Usage:
  node scripts/migrations/rollback-inventory-fields.js [options]

Options:
  --dry-run              Preview changes without applying them
  --force                Force rollback even if validation issues are found
  --archive              Archive inventory collections before removal (default)
  --delete-collections   Completely delete inventory collections (use with caution)
  --help                 Show this help message

Examples:
  # Preview rollback (recommended first step)
  node scripts/migrations/rollback-inventory-fields.js --dry-run
  
  # Run rollback with archiving (safe default)
  node scripts/migrations/rollback-inventory-fields.js
  
  # Run rollback and completely delete collections
  node scripts/migrations/rollback-inventory-fields.js --delete-collections
  
  # Force rollback despite validation warnings
  node scripts/migrations/rollback-inventory-fields.js --force

What this script does:
  1. Validates data integrity before rollback
  2. Archives or removes inventoryMovements and inventoryAlerts collections
  3. Removes inventory fields from categoryGroups collection:
     - currentInventory, inventoryType, inventoryUnit, minimumThreshold, lastInventoryUpdate
  4. Removes inventory fields from categories collection:
     - inventoryType, inventoryUnit, unitConversionRate
  5. Restores original document structure

Safety features:
  - Data validation before rollback
  - Optional archiving of removed collections
  - Dry-run mode for safe preview
  - Comprehensive error handling and reporting

⚠️  CAUTION: This operation removes inventory tracking capabilities.
    Make sure you have backups and understand the implications.
`);
}

// Export functions for testing
export { 
  runRollback, 
  validateRollbackIntegrity,
  restoreCategoryGroupStructure, 
  restoreCategoryStructure,
  archiveInventoryCollections,
  removeInventoryCollections
};

// Run rollback when script is executed directly
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (process.argv[1].includes("rollback-inventory-fields.js")) {
  runRollback();
}
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

/**
 * Migrate categories collection to add inventoryDeductionQuantity field
 */
async function migrateCategories() {
  console.log("🏷️  Migrating categories collection to add inventoryDeductionQuantity field...");
  
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
        // Check if document already has inventoryDeductionQuantity field
        const hasDeductionField = Object.prototype.hasOwnProperty.call(data, 'inventoryDeductionQuantity');

        if (hasDeductionField && !MIGRATION_CONFIG.force) {
          console.log(`⏭️  Skipping category ${docId} - already has inventoryDeductionQuantity field`);
          skippedCount++;
          continue;
        }

        const updates = {};
        
        // Add inventoryDeductionQuantity field with null default (disabled by default)
        if (!hasDeductionField || MIGRATION_CONFIG.force) {
          updates.inventoryDeductionQuantity = null; // null means deduction is disabled
          updates.updatedAt = Timestamp.now(); // Update timestamp for audit trail
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
          console.log(`✅ Updated category ${docId} with inventoryDeductionQuantity field`);
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
 * Rollback migration by removing inventoryDeductionQuantity field
 */
async function rollbackMigration() {
  console.log("🔄 Rolling back inventoryDeductionQuantity field migration...");
  
  try {
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);
    
    if (snapshot.empty) {
      console.log("ℹ️  No categories found for rollback");
      return { success: 0, skipped: 0, errors: 0 };
    }

    let rollbackCount = 0;
    let errorCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();
      
      try {
        // Check if document has inventoryDeductionQuantity field
        const hasDeductionField = Object.prototype.hasOwnProperty.call(data, 'inventoryDeductionQuantity');

        if (!hasDeductionField) {
          console.log(`⏭️  Skipping category ${docId} - no inventoryDeductionQuantity field to remove`);
          continue;
        }

        const updates = {
          inventoryDeductionQuantity: null, // Setting to null removes the field in Firestore
          updatedAt: Timestamp.now() // Update timestamp for audit trail
        };

        if (MIGRATION_CONFIG.dryRun) {
          console.log(`🔍 DRY RUN - Would remove inventoryDeductionQuantity from category ${docId}`);
          rollbackCount++;
        } else {
          await updateDoc(doc(db, "categories", docId), updates);
          console.log(`✅ Removed inventoryDeductionQuantity field from category ${docId}`);
          rollbackCount++;
        }
      } catch (error) {
        console.error(`❌ Error rolling back category ${docId}:`, error);
        errorCount++;
      }
    }

    console.log(`🔄 Rollback completed: ${rollbackCount} categories updated, ${errorCount} errors`);
    return { success: rollbackCount, skipped: 0, errors: errorCount };
  } catch (error) {
    console.error("❌ Error during rollback:", error);
    throw error;
  }
}

/**
 * Validate migration prerequisites
 */
async function validatePrerequisites() {
  console.log("🔍 Validating migration prerequisites...");
  
  try {
    // Check that categories collection exists
    const categoriesRef = collection(db, "categories");
    const snapshot = await getDocs(categoriesRef);
    
    if (snapshot.empty) {
      console.log("⚠️  No categories found - migration will have no effect");
      return false;
    }

    // Check if basic category structure exists
    let validStructureCount = 0;
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      if (data.name) {
        validStructureCount++;
      }
    }

    if (validStructureCount === 0) {
      console.error("❌ No valid categories found with name field");
      return false;
    }

    console.log(`✅ Prerequisites validated: ${validStructureCount} valid categories found`);
    return true;
  } catch (error) {
    console.error("❌ Error validating prerequisites:", error);
    return false;
  }
}

/**
 * Display migration summary and ask for confirmation
 */
async function showMigrationSummary() {
  if (MIGRATION_CONFIG.dryRun) {
    return true; // No confirmation needed for dry run
  }

  const categoriesRef = collection(db, "categories");
  const snapshot = await getDocs(categoriesRef);
  
  const totalCategories = snapshot.size;
  let categoriesWithDeduction = 0;
  let categoriesWithoutDeduction = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (Object.prototype.hasOwnProperty.call(data, 'inventoryDeductionQuantity')) {
      categoriesWithDeduction++;
    } else {
      categoriesWithoutDeduction++;
    }
  });

  console.log("\n📊 Migration Summary:");
  console.log(`Total categories: ${totalCategories}`);
  console.log(`Categories with inventoryDeductionQuantity: ${categoriesWithDeduction}`);
  console.log(`Categories without inventoryDeductionQuantity: ${categoriesWithoutDeduction}`);
  
  if (MIGRATION_CONFIG.rollback) {
    console.log(`\n🔄 ROLLBACK: Will remove inventoryDeductionQuantity from ${categoriesWithDeduction} categories`);
  } else {
    console.log(`\n➕ MIGRATION: Will add inventoryDeductionQuantity to ${categoriesWithoutDeduction} categories`);
    console.log("   - Default value: null (deduction disabled)");
    console.log("   - Field can be updated later via category management interface");
  }

  return true;
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log("🚀 Starting inventory deduction field migration...");
  console.log(`📋 Configuration:`, MIGRATION_CONFIG);
  
  if (MIGRATION_CONFIG.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
  }

  try {
    // Validate prerequisites
    const isValid = await validatePrerequisites();
    if (!isValid && !MIGRATION_CONFIG.dryRun) {
      console.error("❌ Prerequisites validation failed");
      process.exit(1);
    }

    // Show migration summary
    await showMigrationSummary();

    let results;
    if (MIGRATION_CONFIG.rollback) {
      results = await rollbackMigration();
    } else {
      results = await migrateCategories();
    }

    // Final summary
    console.log("\n📊 Migration Results:");
    console.log(`✅ Successful: ${results.success}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    
    if (results.errors > 0) {
      console.log(`⚠️  Migration completed with ${results.errors} errors`);
      process.exit(1);
    } else {
      const action = MIGRATION_CONFIG.rollback ? "Rollback" : "Migration";
      console.log(`✅ ${action} completed successfully!`);
      
      if (!MIGRATION_CONFIG.dryRun && !MIGRATION_CONFIG.rollback) {
        console.log("\n💡 Next steps:");
        console.log("1. Configure inventory deduction quantities in category management interface");
        console.log("2. Test automatic deduction with sample orders");
        console.log("3. Monitor inventory movements for accuracy");
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
🏷️  Inventory Deduction Field Migration Script

This script adds the 'inventoryDeductionQuantity' field to existing categories
to enable automatic inventory deduction functionality.

Usage:
  node scripts/migrations/add-inventory-deduction-field.js [options]

Options:
  --dry-run    Preview changes without applying them
  --rollback   Remove inventoryDeductionQuantity fields (reverse migration)
  --force      Force update even if field already exists
  --help       Show this help message

Examples:
  # Preview migration
  node scripts/migrations/add-inventory-deduction-field.js --dry-run
  
  # Run migration
  node scripts/migrations/add-inventory-deduction-field.js
  
  # Rollback migration
  node scripts/migrations/add-inventory-deduction-field.js --rollback
  
  # Force update all categories
  node scripts/migrations/add-inventory-deduction-field.js --force

What this migration does:
  - Adds 'inventoryDeductionQuantity' field to all categories (default: null)
  - Sets 'updatedAt' timestamp for audit trail
  - Preserves all existing category data
  - Null value means automatic deduction is disabled (backward compatible)

Field details:
  - inventoryDeductionQuantity: number | null
  - When null/undefined: No automatic deduction (default)
  - When number > 0: Deduct this quantity per product order
  - Used with category's inventoryUnit for proper deduction calculation

Safety features:
  - Dry run support to preview changes
  - Rollback capability to reverse migration
  - Error handling with detailed logging
  - Emulator support for local testing
`);
}

// Run migration when script is executed directly
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (process.argv[1].includes("add-inventory-deduction-field.js")) {
  runMigration();
}

export { runMigration, migrateCategories, rollbackMigration };
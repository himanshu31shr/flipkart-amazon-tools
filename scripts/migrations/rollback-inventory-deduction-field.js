#!/usr/bin/env node
/* eslint-disable no-undef */

// Rollback script for inventory deduction field migration
// This is a convenience wrapper that calls the main migration script with rollback flag

// import { rollbackMigration } from './add-inventory-deduction-field.js';

console.log("🔄 Inventory Deduction Field Rollback Script");
console.log("This script removes the inventoryDeductionQuantity field from all categories");
console.log("Use --dry-run to preview changes before applying\n");

// Add rollback flag to arguments if not already present
if (!process.argv.includes('--rollback')) {
  process.argv.push('--rollback');
}

// Re-import and run the main migration with rollback flag
import('./add-inventory-deduction-field.js');
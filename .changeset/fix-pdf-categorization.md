---
"sacred-sutra-tools": patch
---

Fix PDF merge categorization by ensuring products and categories are loaded before processing

This change ensures that both products and categories are fetched from the store before PDF merge operations begin, preventing race conditions that could cause products to not be categorized properly during the merge process.
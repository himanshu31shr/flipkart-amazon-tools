---
"material-ui-vite-ts": patch
---

Fix Amazon PDF page duplication issue in invoice processing

Resolved critical issue where Amazon PDF transformation could create duplicate pages in the merged output. The fix includes:

- Added unique page tracking with Set to prevent processing the same page twice
- Simplified sorting logic to eliminate race conditions causing duplicates
- Enhanced validation pipeline to catch and remove any remaining duplicates
- Improved error handling throughout the transformation process

This ensures each Amazon invoice page appears exactly once in the final merged PDF, improving reliability for e-commerce order processing.
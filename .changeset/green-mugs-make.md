---
"material-ui-vite-ts": patch
---

Fix PDF display showing incorrect date when date selection changes

Resolved issue where the TodaysFilesWidget was hardcoded to show current date files instead of respecting the selected date. PDF files now display consistently with the selected date in the Today's Orders page.

This fix ensures users see the correct PDF files when they select different dates, eliminating confusion between order data and file display.

# PDF Barcode Integration Tests

This directory contains comprehensive integration tests for the PDF barcode embedding functionality, validating end-to-end workflows from PDF processing through barcode generation and embedding.

## Test Coverage

### Core Integration Tests (`merge.service.integration.test.ts`)

**End-to-End PDF Processing with Barcodes**
- ✅ PDF processing with successful barcode generation
- ✅ Graceful handling of barcode generation failures
- ✅ Flipkart PDF processing with barcode generation

**Barcode Embedding Validation**
- ✅ PDF structure integrity after barcode embedding
- ✅ Ultra-compact barcode format validation (6-10 digit format)

**Performance and Memory Tests**
- ✅ Large PDF processing efficiency (10-page documents)
- ✅ Memory-efficient processing (< 50MB increase)

**Error Handling and Edge Cases**
- ✅ Corrupted PDF input handling
- ✅ Empty PDF processing
- ✅ Network failure recovery during barcode generation

**Barcode Format Validation**
- ✅ Ultra-compact format validation (`^[0-9]{6,10}$`)
- ✅ Julian date format validation for compact encoding

## Test Architecture

### Mocking Strategy

**Firebase Services**: All Firebase dependencies (Auth, Firestore, Batch service) are mocked to avoid requiring actual Firebase connections during testing.

**PDF Transformers**: Amazon and Flipkart transformers are mocked to return valid PDFDocument instances and BarcodeGenerationResult objects, bypassing PDF.js worker complexities while maintaining interface compliance.

**Barcode Service**: BarcodeService is fully mocked to simulate various success/failure scenarios without actual QR code generation.

### Key Test Features

**Comprehensive Type Safety**: All test mocks properly implement TypeScript interfaces including `BarcodeGenerationResult` with required fields:
- `barcodeId`: Unique identifier matching ultra-compact format
- `qrCodeDataUrl`: Base64 PNG data URL for PDF embedding
- `qrCodeContent`: Raw barcode content for validation
- `generatedAt`: ISO timestamp of generation

**Performance Validation**: Tests verify processing time limits (< 10 seconds for large PDFs) and memory usage constraints (< 50MB increase).

**Error Resilience**: Tests confirm that barcode generation failures don't block PDF processing, ensuring graceful degradation.

## Running Tests

```bash
# Run integration tests only
npm test -- --testPathPattern="merge.service.integration.test.ts"

# Run with verbose output
npm test -- --testPathPattern="merge.service.integration.test.ts" --verbose

# Run with coverage
npm run test:coverage -- --testPathPattern="merge.service.integration.test.ts"
```

## Test Environments

**Development**: Tests run against mocked services for fast feedback
**CI/CD**: Automated test execution validates all PRs and deployments
**Local**: Full test suite available for comprehensive validation

## Integration with Existing Tests

These integration tests complement the existing unit test suite:
- **Unit Tests**: Individual service and component testing
- **Integration Tests**: End-to-end workflow validation
- **Component Tests**: UI component behavior testing

## Maintenance Notes

**Mock Updates**: When updating interfaces or service methods, ensure mocks are updated to maintain test validity.

**Performance Thresholds**: Performance test thresholds may need adjustment as system grows or hardware changes.

**Format Validation**: Barcode format tests should be updated if the ultra-compact format specification changes.
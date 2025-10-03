import React, { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { InventoryOrderProcessor, ProductSummary } from '../services/inventoryOrderProcessor.service';
import { InventoryDeductionResult } from '../types/inventory';

interface TestResult {
  success: boolean;
  orderItems: ProductSummary[];
  inventoryResult: InventoryDeductionResult;
  error?: string;
}

export const TestInventoryDeductionPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Starting inventory deduction test...');
      
      // Create test order items based on our seed data
      const testOrderItems = [
        {
          name: "Smartphone Pro Max",
          quantity: "1",
          SKU: "SPM-001",
          type: "amazon" as const,
          orderId: "test-order-001"
        },
        {
          name: "The Great Adventure", 
          quantity: "2",
          SKU: "NOV-001",
          type: "amazon" as const,
          orderId: "test-order-002"
        },
        {
          name: "Premium Cotton T-Shirt",
          quantity: "1", 
          SKU: "TSHIRT-001",
          type: "flipkart" as const,
          orderId: "test-order-003"
        }
      ];

      console.log('📦 Test order items:', testOrderItems);

      const processor = new InventoryOrderProcessor();
      const processingResult = await processor.processOrderWithCategoryDeduction(
        testOrderItems, 
        'test-batch-001'
      );

      console.log('✅ Processing completed:', processingResult);

      setResult({
        success: true,
        orderItems: processingResult.orderItems,
        inventoryResult: processingResult.inventoryResult
      });

    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({
        success: false,
        orderItems: [],
        inventoryResult: { deductions: [], warnings: [], errors: [] },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Deduction Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This page tests the category-based inventory deduction system.
        Check the browser console for detailed debugging logs.
      </Typography>

      <Button 
        variant="contained" 
        onClick={runTest}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : null}
        sx={{ mb: 3 }}
      >
        {isLoading ? 'Running Test...' : 'Run Inventory Deduction Test'}
      </Button>

      {result && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Test Results
          </Typography>
          
          {result.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Error: {result.error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Order Items Processed: {result.orderItems.length}
            </Typography>
            {result.orderItems.map((item, index) => (
              <Box key={index} sx={{ ml: 2, mb: 1 }}>
                <Typography variant="body2">
                  {item.quantity}x {item.name} ({item.SKU}) - 
                  Category: {item.category || 'None'} - 
                  Deduction Required: {item.inventoryDeductionRequired ? 'Yes' : 'No'}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Inventory Results:
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ Successful Deductions: {result.inventoryResult.deductions.length}
            </Typography>
            {result.inventoryResult.deductions.map((deduction, index: number) => (
              <Box key={index} sx={{ ml: 2 }}>
                <Typography variant="body2">
                  - Deducted {deduction.deductedQuantity} from group {deduction.categoryGroupId}
                  (New level: {deduction.newInventoryLevel})
                </Typography>
              </Box>
            ))}
            
            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              ⚠️ Warnings: {result.inventoryResult.warnings.length}
            </Typography>
            {result.inventoryResult.warnings.map((warning, index: number) => (
              <Box key={index} sx={{ ml: 2 }}>
                <Typography variant="body2">
                  - {warning.warning}
                </Typography>
              </Box>
            ))}
            
            <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
              ❌ Errors: {result.inventoryResult.errors.length}
            </Typography>
            {result.inventoryResult.errors.map((error, index: number) => (
              <Box key={index} sx={{ ml: 2 }}>
                <Typography variant="body2">
                  - {error.error} ({error.reason})
                </Typography>
              </Box>
            ))}
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              Check the browser console for detailed debugging information about the deduction process.
            </Typography>
          </Alert>
        </Paper>
      )}
    </Box>
  );
};
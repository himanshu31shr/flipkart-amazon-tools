import AnalyticsIcon from "@mui/icons-material/Analytics";
import DateRangeIcon from "@mui/icons-material/DateRange";
import PriceChangeIcon from "@mui/icons-material/PriceChange";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TransactionAnalysisService } from "../../services/transactionAnalysis.service";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchProducts } from "../../store/slices/productsSlice";
import { fetchTransactions, saveTransactions } from "../../store/slices/transactionsSlice";
import { TransactionSummary } from "../../types/transaction.type";
import OrderList from "./components/order-list.component";
import ProductList from "./components/product-list.component";
import SummaryTiles from "./components/summary-tiles.component";
import ReportExtractionFactory from "./services/ReportExtractionFactory";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

export const TransactionAnalytics: React.FC = () => {
  const dispatch = useAppDispatch();
  const { items: transactions, loading, error } = useAppSelector(state => state.transactions);
  const { items: products } = useAppSelector(state => state.products);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState<{
    minDate: Date | null;
    maxDate: Date | null;
  }>({
    minDate: null,
    maxDate: null,
  });
  const [analyzingPrices, setAnalyzingPrices] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Load existing transactions and product prices on mount
    const loadData = async () => {
      try {
        await Promise.all([
          dispatch(fetchTransactions()),
          dispatch(fetchProducts({}))
        ]);
      } catch {
        // Error handling - could show toast notification
      }
    };

    loadData();
  }, [dispatch]);

  useEffect(() => {
    const analyzeTransactions = async () => {
      if (transactions.length > 0 && products.length > 0) {
        try {
          setAnalyzingPrices(true);
          
          // Convert products to ProductPrice format and store in Map
          const priceMap = new Map(
            products.map(product => [product.sku.toLowerCase(), product])
          );

          const transactionsWithPrices = transactions.map(
            (transaction) => ({
              ...transaction,
              product: {
                ...transaction.product,
                ...priceMap.get(transaction.sku.toLowerCase()),
              },
            })
          );

          const dates = transactionsWithPrices.map(
            (transaction) => new Date(transaction.orderDate)
          );

          setDateRange({
            minDate: new Date(Math.min(...dates.map((date) => date.getTime()))),
            maxDate: new Date(Math.max(...dates.map((date) => date.getTime()))),
          });

          // Create services (cost price service removed)
          const transactionService = new TransactionAnalysisService(
            transactionsWithPrices,
            priceMap
          );
          
          // Wait for async analyze to complete
          const results = await transactionService.analyze();
          setSummary(results);
        } catch (error) {
          console.error("Error analyzing transactions:", error);
        } finally {
          setAnalyzingPrices(false);
        }
      }
    };

    analyzeTransactions();
  }, [transactions, products]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const availableProducts = useMemo(() => {
    if (!transactions.length) return [];
    const uniqueProducts = new Map<
      string,
      { sku: string; description: string }
    >();
    transactions.forEach((transaction) => {
      if (transaction.sku) {
        if (!uniqueProducts.has(transaction.sku)) {
          uniqueProducts.set(transaction.sku, {
            sku: transaction.sku,
            description: transaction.description || transaction.sku,
          });
        }
      }
    });
    return Array.from(uniqueProducts.values());
  }, [transactions]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = event.target.files?.[0];
      if (!file) throw new Error("No file selected");

      const newTransactions = await new ReportExtractionFactory(file).extract();
      await dispatch(saveTransactions(newTransactions)).unwrap();

      // Reset file input
      event.target.value = "";
    } catch {
      // Error handling - could show toast notification
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AnalyticsIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            Transaction Analytics
          </Typography>
          {transactions.length > 0 && (
            <Chip 
              label={`${transactions.length} Transactions`} 
              color="primary" 
              size="medium" 
              sx={{ ml: 2 }}
            />
          )}
          <Box sx={{ flexGrow: 1 }} />
          {(loading || analyzingPrices) && (
            <Box sx={{ display: "flex", alignItems: "center", mr: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} color="primary" />
              <Typography color="primary.main">
                {loading ? "Processing..." : "Analyzing prices..."}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />
        
        <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: dateRange.minDate ? 'info.light' : 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DateRangeIcon sx={{ color: 'info.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
                {dateRange.minDate ? (
                  <>Transaction Period</>
                ) : (
                  <>No Transactions Available</>
                )}
              </Typography>
            </Box>
            
            {dateRange.minDate ? (
              <Typography variant="body1">
                Analyzing transactions from <strong>{dateRange.minDate?.toDateString()}</strong> to <strong>{dateRange.maxDate?.toDateString()}</strong>
              </Typography>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Upload a transaction file to begin analysis
              </Typography>
            )}
          </CardContent>
        </Card>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Button 
              variant="contained" 
              component="label" 
              disabled={loading}
              startIcon={<UploadFileIcon />}
              fullWidth
              sx={{ py: 1.5, fontWeight: 'medium' }}
            >
              Upload Transaction File
              <input
                type="file"
                hidden
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
              />
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate("/flipkart-amazon-tools/products")}
              disabled={!availableProducts.length}
              startIcon={<PriceChangeIcon />}
              fullWidth
              sx={{ py: 1.5, fontWeight: 'medium' }}
            >
              Manage Product Prices
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}
        
        {summary && (
          <>
            <SummaryTiles summary={summary} />
            
            <Box sx={{ mt: 4, mb: 2 }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTab-root': { fontWeight: 'bold' },
                    '& .Mui-selected': { color: 'primary.main' },
                    '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
                  }}
                >
                  <Tab label="Orders" />
                  <Tab label="Product Details" />
                </Tabs>
              </Box>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <OrderList transactions={summary?.analyzedTransactions || []} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <ProductList transactions={transactions} summary={summary} />
            </TabPanel>
          </>
        )}
        
        {!summary && !loading && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No transaction data available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload a transaction file to view analytics
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

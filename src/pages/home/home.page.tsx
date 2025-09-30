import {
  HomeOutlined,
  MergeOutlined,
  PictureAsPdf,
  CloudUpload,
  CalendarToday,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Typography,
  Alert,
  Collapse,
  useTheme,
  useMediaQuery,
  Snackbar,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  mergePDFs,
  addAmazonFile,
  addFlipkartFile,
  removeAmazonFile,
  removeFlipkartFile,
  clearAmazonFiles,
  clearFlipkartFiles,
  setSelectedDate,
  setEnableBarcodes,
} from "../../store/slices/pdfMergerSlice";
import { DownloadButtons } from "./components/DownloadButtons";

import { PDFViewer } from "./components/PDFViewer";

import {
  fetchCategories,
  fetchProducts,
} from "../../store/slices/productsSlice";
import { StorageConfirmationDialog } from "./components/StorageConfirmationDialog";
import { DownloadLinkDisplay } from "./components/DownloadLinkDisplay";
import { defaultSortConfig } from "../../utils/pdfSorting";
import {
  StorageConfig,
  UploadResult,
  pdfStorageService,
  defaultStorageConfig,
} from "../../services/pdfStorageService";
import { selectIsAuthenticated } from "../../store/slices/authSlice";
import { FileUploadSection } from "./components/FileUploadSection";
import { BarcodeToggle } from "./components/BarcodeToggle";

export const HomePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const dispatch = useAppDispatch();
  const {
    amazonFiles,
    flipkartFiles,
    finalPdf,
    summary,
    loading,
    error,
    selectedDate,
    enableBarcodes,
  } = useAppSelector((state) => state.pdfMerger);
  const { categories, items: products } = useAppSelector(
    (state) => state.products
  );
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Storage dialog state
  const [storageDialogOpen, setStorageDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showDownloadLink, setShowDownloadLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  // Track the PDF that has been processed to prevent infinite uploads
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null);

  // Fetch products and categories on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (products.length === 0) {
        await dispatch(fetchProducts({})).unwrap();
      }
      if (categories.length === 0) {
        await dispatch(fetchCategories()).unwrap();
      }
    };

    loadInitialData().catch(console.error);
  }, [dispatch, products.length, categories.length]);

  // Auto-save PDF when it's generated
  useEffect(() => {
    // Skip if no PDF, already uploading, already have a result, not authenticated, or already processed this PDF
    if (
      !finalPdf ||
      isUploading ||
      uploadResult ||
      !isAuthenticated ||
      finalPdf === processedPdfUrl
    ) {
      return;
    }

    // Mark this PDF as being processed
    setProcessedPdfUrl(finalPdf);

    // Auto-save the PDF
    const autoSavePdf = async () => {
      try {
        // Create a Blob from the PDF URL
        if (!finalPdf) return; // Safety check
        const response = await fetch(finalPdf);
        const pdfBlob = await response.blob();

        // Generate a meaningful filename
        const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
        const filename = `sorted_labels_${timestamp}.pdf`;

        // Use default storage config for auto-save
        const autoSaveConfig = {
          ...defaultStorageConfig,
          expiryDays: 7, // Set a default expiry of 7 days
          description: `Auto-saved PDF with ${summary.length} products across ${
            categories.filter((c) => !!c.name).length
          } categories`,
        };

        // Upload to Firebase Storage using selected date
        const result = await pdfStorageService.uploadPdfForDate(
          pdfBlob,
          filename,
          selectedDate,
          {
            categoryCount: categories.length,
            productCount: summary.length,
            sortConfig: defaultSortConfig,
            description: `Auto-saved PDF with ${
              summary.length
            } products across ${
              categories.filter((c) => !!c.name).length
            } categories`,
          },
          autoSaveConfig
        );

        if (result.success) {
          setUploadResult(result);
          setShowDownloadLink(true);
        } else {
          console.error("Error auto-uploading PDF:", result.error);
          setErrorMessage(result.error || "Failed to auto-save PDF");

          // If there's an authentication error, don't show it to the user
          if (result.error?.includes("authenticated")) {
            setErrorMessage(undefined);
          }
        }
      } catch (error) {
        console.error("Error auto-uploading PDF:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to auto-save PDF"
        );

        // If there's an authentication error, don't show it to the user
        if (error instanceof Error && error.message.includes("authenticated")) {
          setErrorMessage(undefined);
        }
      }
    };

    // Start auto-save process
    setIsUploading(true);
    autoSavePdf().finally(() => {
      setIsUploading(false);
    });
  }, [
    finalPdf,
    isUploading,
    uploadResult,
    summary.length,
    categories,
    isAuthenticated,
    processedPdfUrl,
    selectedDate,
  ]);

  const handleSubmit = async () => {
    if (amazonFiles.length === 0 && flipkartFiles.length === 0) return;

    // Reset upload result and processed PDF when generating a new PDF
    setUploadResult(null);
    setShowDownloadLink(false);
    setProcessedPdfUrl(null);

    try {
      // Apply sort configuration to the merge process
      await dispatch(
        mergePDFs({
          amazonFiles,
          flipkartFiles,
          sortConfig: defaultSortConfig,
          selectedDate,
          enableBarcodes,
        })
      ).unwrap();

      // Clear input files after successful merge to ensure separate batches for subsequent uploads
      // Don't clear finalPdf and summary as they're needed for auto-save
      dispatch(clearAmazonFiles());
      dispatch(clearFlipkartFiles());

      // Auto-save is handled by the useEffect
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAmazonFile = (file: File) => {
    dispatch(addAmazonFile(file));
    // Reset download link when files change
    resetDownloadState();
  };

  const handleAddFlipkartFile = (file: File) => {
    dispatch(addFlipkartFile(file));
    // Reset download link when files change
    resetDownloadState();
  };

  const handleRemoveAmazonFile = (index: number) => {
    dispatch(removeAmazonFile(index));
    resetDownloadState();
  };

  const handleRemoveFlipkartFile = (index: number) => {
    dispatch(removeFlipkartFile(index));
    resetDownloadState();
  };

  const handleClearAmazonFiles = () => {
    dispatch(clearAmazonFiles());
    resetDownloadState();
  };

  const handleClearFlipkartFiles = () => {
    dispatch(clearFlipkartFiles());
    resetDownloadState();
  };

  const resetDownloadState = () => {
    setShowDownloadLink(false);
    setUploadResult(null);
    setProcessedPdfUrl(null);
  };

  const handleSaveToCloud = () => {
    if (finalPdf) {
      setStorageDialogOpen(true);
    }
  };

  const handleStorageConfirm = async (storageConfig: StorageConfig) => {
    if (!finalPdf) return;

    setIsUploading(true);
    try {
      // Create a Blob from the PDF URL
      const response = await fetch(finalPdf);
      const pdfBlob = await response.blob();

      // Generate a meaningful filename
      const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
      const filename = `sorted_labels_${timestamp}.pdf`;

      // Upload to Firebase Storage using selected date
      const result = await pdfStorageService.uploadPdfForDate(
        pdfBlob,
        filename,
        selectedDate,
        {
          categoryCount: categories.length,
          productCount: summary.length,
          sortConfig: defaultSortConfig,
          description: `Sorted PDF with ${summary.length} products across ${
            categories.filter((c) => !!c.name).length
          } categories`,
        },
        storageConfig
      );

      if (result.success) {
        setUploadResult(result);
        setShowDownloadLink(true);
        setStorageDialogOpen(false);
      } else {
        setErrorMessage(result.error || "Failed to save PDF to cloud");
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save PDF to cloud"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePdf = async (fileId: string) => {
    try {
      await pdfStorageService.deletePdf(fileId);
      setShowDownloadLink(false);
      setUploadResult(null);
    } catch (error) {
      console.error("Error deleting PDF:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete PDF"
      );
    }
  };

  const handleCloseError = () => {
    setErrorMessage(undefined);
  };

  const handleBarcodeToggle = (enabled: boolean) => {
    dispatch(setEnableBarcodes(enabled));
  };

  return (
    <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 3 }}>
      <Paper
        sx={{
          p: isMobile ? 2 : 3,
          mb: 4,
          borderRadius: 2,
          boxShadow: theme.shadows[3],
        }}
        elevation={3}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 3,
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 1 : 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: isMobile ? "center" : "flex-start",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <HomeOutlined
              sx={{
                fontSize: isMobile ? 28 : 32,
                mr: 2,
                color: "primary.main",
              }}
            />
            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              sx={{ fontWeight: "bold", color: "primary.dark" }}
            >
              PDF Merger
            </Typography>
          </Box>

          {isMobile && <Divider flexItem sx={{ my: 1 }} />}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Date Selection Section */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "secondary.light",
            overflow: "visible",
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
              <CalendarToday sx={{ mr: 1, verticalAlign: "middle" }} />
              Select Processing Date
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Choose the date for which you want to process the PDF files.
              Orders will be saved to this date.
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Processing Date"
                value={selectedDate}
                onChange={(date) => {
                  if (date) {
                    dispatch(setSelectedDate(date));
                  }
                }}
                minDate={new Date()}
                sx={{ width: "100%", maxWidth: 300 }}
              />
            </LocalizationProvider>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Orders will be saved to {format(selectedDate, "MMMM dd, yyyy")}
            </Typography>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card
          sx={{
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "primary.light",
            overflow: "visible",
            boxShadow: theme.shadows[2],
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
              <PictureAsPdf sx={{ mr: 1, verticalAlign: "middle" }} />
              Upload PDF Files
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload PDF files from Amazon and/or Flipkart. The tool will merge
              them into a unified PDF document sorted by product categories.
            </Typography>

            {/* Render enhanced FileUploadSection component */}
            <FileUploadSection
              amazonFiles={amazonFiles}
              flipkartFiles={flipkartFiles}
              onAmazonAdd={handleAddAmazonFile}
              onFlipkartAdd={handleAddFlipkartFile}
              onAmazonRemove={handleRemoveAmazonFile}
              onFlipkartRemove={handleRemoveFlipkartFile}
              onAmazonClear={handleClearAmazonFiles}
              onFlipkartClear={handleClearFlipkartFiles}
            />

            {/* Barcode Toggle Section */}
            <Box sx={{ mt: 3 }}>
              <BarcodeToggle
                enabled={enableBarcodes}
                onChange={handleBarcodeToggle}
                disabled={loading}
              />
            </Box>

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={
                  (amazonFiles.length === 0 && flipkartFiles.length === 0) ||
                  loading
                }
                onClick={handleSubmit}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <MergeOutlined />
                }
                sx={{
                  minWidth: 200,
                  py: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {loading ? "Processing..." : "Generate PDF"}
              </Button>

              <Collapse in={Boolean(error)}>
                <Alert
                  severity="error"
                  sx={{ mt: 2, mx: "auto", maxWidth: 600 }}
                >
                  {error}
                </Alert>
              </Collapse>
            </Box>
          </CardContent>
        </Card>

        {/* Success section */}
        {finalPdf && (
          <Card
            sx={{
              mb: 3,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "success.light",
              backgroundColor: "success.lightest",
              boxShadow: theme.shadows[2],
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <Typography
                  variant="h6"
                  component="h3"
                  color="success.main"
                  sx={{ fontWeight: 600 }}
                >
                  PDF Generated Successfully!
                </Typography>
                <Chip
                  label={`${summary.length} Products`}
                  color="success"
                  size="small"
                  sx={{ ml: 2 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  onClick={handleSaveToCloud}
                  disabled={isUploading || showDownloadLink}
                  startIcon={<CloudUpload />}
                  sx={{ ml: "auto", borderRadius: 4 }}
                >
                  {isUploading ? "Saving..." : "Save to Cloud"}
                </Button>
              </Box>

              <DownloadButtons pdfUrl={finalPdf} />

              {showDownloadLink && uploadResult && uploadResult.fileId && (
                <DownloadLinkDisplay
                  uploadResult={uploadResult}
                  onDelete={() => handleDeletePdf(uploadResult.fileId!)}
                  onClose={() => setShowDownloadLink(false)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* PDF preview */}
        {finalPdf && (
          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "primary.light",
              overflow: "hidden",
              boxShadow: theme.shadows[2],
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <PDFViewer pdfUrl={finalPdf} />
            </CardContent>
          </Card>
        )}

        {/* Storage confirmation dialog */}
        <StorageConfirmationDialog
          open={storageDialogOpen}
          onClose={() => setStorageDialogOpen(false)}
          onConfirm={handleStorageConfirm}
          fileName={`sorted_labels_${new Date()
            .toISOString()
            .slice(0, 10)}.pdf`}
          products={products}
          categories={categories}
          isUploading={isUploading}
        />

        {/* Error snackbar */}
        <Snackbar
          open={Boolean(errorMessage)}
          autoHideDuration={6000}
          onClose={handleCloseError}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseError}
            severity="error"
            sx={{ width: "100%" }}
          >
            {errorMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

import { Box, MenuItem, TextField, Button, Autocomplete, CircularProgress, IconButton, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { createFilterOptions, FilterOptionsState } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useAppDispatch } from '../../../store/hooks';
import { addCategory, fetchCategories } from '../../../store/slices/productsSlice';
import { Category } from '../../../services/category.service';
import { Product, ProductFilter } from '../../../services/product.service';
import { exportProductsToCSV } from '../../../utils/csvExport';

// Define interface for the new category suggestion object
interface CategorySuggestion {
  id: string;
  name: string;
  inputValue: string;
}

interface Props {
  platform: ProductFilter['platform'];
  search: ProductFilter['search'];
  selectedProducts: string[];
  categories: Category[];
  allProducts: Product[]; // All products for CSV export
  onFilterChange: (filter: ProductFilter) => void;
  onBulkCategoryUpdate: (skus: string[], categoryId: string) => void;
}

const filter = createFilterOptions<Category>();

export const ProductTableToolbar: React.FC<Props> = ({
  platform,
  search,
  selectedProducts,
  categories,
  allProducts,
  onFilterChange,
  onBulkCategoryUpdate,
}) => {
  const dispatch = useAppDispatch();
  const [selectedCategoryForAssign, setSelectedCategoryForAssign] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const handlePlatformChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as "" | "amazon" | "flipkart";
    onFilterChange({
      platform: value === "" ? undefined : value,
      search,
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    onFilterChange({
      platform,
      search: value,
    });
  };

  const handleCSVExport = () => {
    exportProductsToCSV(allProducts, categories);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;

    setAddingCategory(true);
    try {
      // Dispatch addCategory thunk and await its result
      const resultAction = await dispatch(addCategory({
        name: newCategoryName
      }));

      // Check if the action was fulfilled and contains the new category ID (string payload)
      if (addCategory.fulfilled.match(resultAction) && typeof resultAction.payload === 'string') {
        const newCategoryId = resultAction.payload; // The payload is the new category ID

        // Now, assign the newly created category to selected products
        if (selectedProducts.length > 0) {
          await onBulkCategoryUpdate(selectedProducts, newCategoryId);
        }

        // Refetch categories to update the list in the Autocomplete
        dispatch(fetchCategories());

        // Clear states after successful add and assign
        setNewCategoryName('');
        setSelectedCategoryForAssign(null); // Clear selected category as assignment is done
      } else {
        // Handle potential errors or unfruitful action if needed
      }
    } catch {
      // Error handling - could show toast notification
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAssignCategory = async () => {
    if (selectedProducts.length > 0 && selectedCategoryForAssign) {
      try {
        await onBulkCategoryUpdate(selectedProducts, selectedCategoryForAssign);
        
        // Clear states after successful assignment
        setSelectedCategoryForAssign(null);
      } catch {
        // Error handling - could show toast notification
      }
    }
  };

  return (
    <Box sx={{
      mb: 2,
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      gap: 2,
      alignItems: 'center'
    }}>
      <TextField
        select
        label="Platform"
        value={platform ?? ""}
        onChange={handlePlatformChange}
        sx={{
          minWidth: { xs: "100%", sm: 200 },
          flexGrow: { xs: 1, sm: 0 }
        }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="amazon">Amazon</MenuItem>
        <MenuItem value="flipkart">Flipkart</MenuItem>
      </TextField>

      <TextField
        label="Search"
        value={search}
        onChange={handleSearchChange}
        sx={{
          minWidth: { xs: "100%", sm: 200 },
          flexGrow: 1
        }}
      />

      {/* CSV Export Button */}
      <Tooltip title="Export all products to CSV">
        <IconButton
          onClick={handleCSVExport}
          color="primary"
          disabled={allProducts.length === 0}
          sx={{
            border: '1px solid',
            borderColor: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'white'
            }
          }}
        >
          <DownloadIcon />
        </IconButton>
      </Tooltip>

      {selectedProducts.length > 0 && (
        <>
          <Autocomplete<Category | CategorySuggestion, boolean, boolean, boolean>
            options={categories as (Category | CategorySuggestion)[]}
            getOptionLabel={(option) => {
              if (typeof option === 'string') {
                return option;
              }
              return option.name;
            }}
            value={categories.find((cat) => cat.id === selectedCategoryForAssign) || null}
            onChange={(event, newValue) => {
              if (newValue && typeof newValue === 'object' && 'inputValue' in newValue) {
                // User selected the "Add New Category" suggestion
                setNewCategoryName(newValue.inputValue);
                setSelectedCategoryForAssign(null);
              } else if (newValue && typeof newValue === 'object') {
                // User selected an existing category
                setSelectedCategoryForAssign((newValue as Category).id || null);
                setNewCategoryName('');
              } else if (newValue === null) {
                 // User cleared the selection
                 setSelectedCategoryForAssign(null);
                 setNewCategoryName('');
              } else if (typeof newValue === 'string') {
                 // User typed a new category name but didn't select suggestion (freeSolo)
                 setNewCategoryName(newValue);
                 setSelectedCategoryForAssign(null);
              }
            }}
            filterOptions={(options, params: FilterOptionsState<Category>) => {
              // Filter existing categories using createFilterOptions
              const filteredCategories = filter(categories as Category[], params) as Category[];

              // Prepare the final list of options, starting with filtered existing categories
              const filteredOptions: (Category | CategorySuggestion)[] = [...filteredCategories];

              // Add the "Add New Category" suggestion if the input value doesn't match an existing category
              const existingCategoryNames = categories.map(cat => cat.name.toLowerCase());
              if (params.inputValue !== '' && !existingCategoryNames.includes(params.inputValue.toLowerCase())) {
                filteredOptions.push({
                  id: `add-${params.inputValue}`,
                  name: `Add "${params.inputValue}"`,
                  inputValue: params.inputValue,
                });
              }

              return filteredOptions;
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            renderOption={(props, option: Category | CategorySuggestion) => <li {...props}>{typeof option === 'string' ? option : option.name}</li>}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assign Category"
                variant="outlined"
                sx={{
                  minWidth: { xs: "100%", sm: 200 },
                  flexGrow: { xs: 1, sm: 0.5 }
                }}
              />
            )}
          />
          <Button
            variant="contained"
            onClick={() => {
              if (newCategoryName) {
                handleAddCategory(); // This now handles both add and assign
              } else if (selectedCategoryForAssign) {
                handleAssignCategory(); // This is for assigning an existing category
              }
            }}
            disabled={Boolean(!selectedCategoryForAssign && !newCategoryName) || addingCategory}
            startIcon={addingCategory ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              minWidth: { xs: "100%", sm: 150 },
              flexGrow: { xs: 1, sm: 0 }
            }}
          >
            {addingCategory ? "Adding..." : newCategoryName ? "Add & Assign" : "Assign"} ({selectedProducts.length})
          </Button>
        </>
      )}
    </Box>
  );
}; 
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CategoryGroupService } from '../../services/categoryGroup.service';
import { 
  CategoryGroupWithStats, 
  CategoryGroupFormData 
} from '../../types/categoryGroup';

interface CategoryGroupsState {
  groups: CategoryGroupWithStats[];
  loading: boolean;
  error: string | null;
  selectedGroupId: string | null;
  lastUpdated: string | null;
}

const initialState: CategoryGroupsState = {
  groups: [],
  loading: false,
  error: null,
  selectedGroupId: null,
  lastUpdated: null,
};

const categoryGroupService = new CategoryGroupService();

// Async thunks
export const fetchCategoryGroups = createAsyncThunk(
  'categoryGroups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const groups = await categoryGroupService.getCategoryGroupsWithStats();
      return groups;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch category groups'
      );
    }
  }
);

export const createCategoryGroup = createAsyncThunk(
  'categoryGroups/create',
  async (groupData: CategoryGroupFormData, { rejectWithValue, dispatch }) => {
    try {
      const groupId = await categoryGroupService.createCategoryGroup(groupData);
      
      // Fetch updated list to get the created group with stats
      dispatch(fetchCategoryGroups());
      
      return groupId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to create category group'
      );
    }
  }
);

export const updateCategoryGroup = createAsyncThunk(
  'categoryGroups/update',
  async (
    { id, groupData }: { id: string; groupData: Partial<CategoryGroupFormData> },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await categoryGroupService.updateCategoryGroup(id, groupData);
      
      // Fetch updated list to reflect changes
      dispatch(fetchCategoryGroups());
      
      return { id, groupData };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update category group'
      );
    }
  }
);

export const deleteCategoryGroup = createAsyncThunk(
  'categoryGroups/delete',
  async (groupId: string, { rejectWithValue, dispatch }) => {
    try {
      await categoryGroupService.deleteCategoryGroup(groupId);
      
      // Fetch updated list to remove deleted group
      dispatch(fetchCategoryGroups());
      
      return groupId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete category group'
      );
    }
  }
);

export const assignCategoriesToGroup = createAsyncThunk(
  'categoryGroups/assignCategories',
  async (
    { categoryIds, groupId }: { categoryIds: string[]; groupId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await categoryGroupService.assignMultipleCategoriesToGroup(categoryIds, groupId);
      
      // Fetch updated list to reflect new category counts
      dispatch(fetchCategoryGroups());
      
      return { categoryIds, groupId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to assign categories to group'
      );
    }
  }
);

export const removeCategoryFromGroup = createAsyncThunk(
  'categoryGroups/removeCategoryFromGroup',
  async (categoryId: string, { rejectWithValue, dispatch }) => {
    try {
      await categoryGroupService.removeCategoryFromGroup(categoryId);
      
      // Fetch updated list to reflect new category counts
      dispatch(fetchCategoryGroups());
      
      return categoryId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to remove category from group'
      );
    }
  }
);

// Slice
const categoryGroupsSlice = createSlice({
  name: 'categoryGroups',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedGroup: (state, action: PayloadAction<string | null>) => {
      state.selectedGroupId = action.payload;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch category groups
    builder
      .addCase(fetchCategoryGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchCategoryGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create category group
    builder
      .addCase(createCategoryGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategoryGroup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createCategoryGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update category group
    builder
      .addCase(updateCategoryGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategoryGroup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCategoryGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete category group
    builder
      .addCase(deleteCategoryGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategoryGroup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Clear selection if deleted group was selected
        if (state.selectedGroupId === (state.selectedGroupId)) {
          state.selectedGroupId = null;
        }
      })
      .addCase(deleteCategoryGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Assign categories to group
    builder
      .addCase(assignCategoriesToGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignCategoriesToGroup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(assignCategoriesToGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Remove category from group
    builder
      .addCase(removeCategoryFromGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCategoryFromGroup.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(removeCategoryFromGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Action creators
export const { clearError, setSelectedGroup, resetState } = categoryGroupsSlice.actions;

// Selectors
export const selectCategoryGroups = (state: { categoryGroups: CategoryGroupsState }) => 
  state.categoryGroups.groups;

export const selectCategoryGroupsLoading = (state: { categoryGroups: CategoryGroupsState }) => 
  state.categoryGroups.loading;

export const selectCategoryGroupsError = (state: { categoryGroups: CategoryGroupsState }) => 
  state.categoryGroups.error;

export const selectSelectedGroupId = (state: { categoryGroups: CategoryGroupsState }) => 
  state.categoryGroups.selectedGroupId;

export const selectCategoryGroupById = (groupId: string) => 
  (state: { categoryGroups: CategoryGroupsState }) =>
    state.categoryGroups.groups.find(group => group.id === groupId);

export const selectCategoryGroupsLastUpdated = (state: { categoryGroups: CategoryGroupsState }) => 
  state.categoryGroups.lastUpdated;

// Export reducer
export default categoryGroupsSlice.reducer;
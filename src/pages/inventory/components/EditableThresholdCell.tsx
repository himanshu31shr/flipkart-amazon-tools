import React, { useState, useEffect } from 'react';
import {
  Typography,
  TextField,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../../store/hooks';
import { updateCategoryGroup } from '../../../store/slices/categoryGroupsSlice';
import { fetchInventoryLevels } from '../../../store/slices/inventorySlice';
import { InventoryLevel } from '../../../types/inventory';

interface EditableThresholdCellProps {
  inventoryLevel: InventoryLevel;
  onUpdateSuccess?: (categoryGroupId: string, newThreshold: number) => void;
  onUpdateError?: (categoryGroupId: string, error: string) => void;
}

const EditableThresholdCell: React.FC<EditableThresholdCellProps> = ({
  inventoryLevel,
  onUpdateSuccess,
  onUpdateError,
}) => {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(inventoryLevel.minimumThreshold.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update editValue when inventoryLevel changes (from external updates)
  useEffect(() => {
    setEditValue(inventoryLevel.minimumThreshold.toString());
  }, [inventoryLevel.minimumThreshold]);

  const formatInventoryValue = (value: number, unit: string): string => {
    if (unit === 'g' && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kg`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditValue(inventoryLevel.minimumThreshold.toString());
    setError(null);
  };

  const handleSaveClick = async () => {
    const newThreshold = parseFloat(editValue);
    
    // Validation
    if (isNaN(newThreshold) || newThreshold < 0) {
      setError('Please enter a valid non-negative number');
      return;
    }

    // Check for excessive values
    if (newThreshold > 10000) {
      setError('Threshold seems unreasonably high. Please verify.');
      return;
    }

    if (newThreshold === inventoryLevel.minimumThreshold) {
      // No change, just exit edit mode
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Update the category group with new threshold
      await dispatch(updateCategoryGroup({
        id: inventoryLevel.categoryGroupId,
        groupData: { minimumThreshold: newThreshold },
      })).unwrap();

      // Refresh inventory levels to reflect changes
      dispatch(fetchInventoryLevels());

      setIsEditing(false);
      onUpdateSuccess?.(inventoryLevel.categoryGroupId, newThreshold);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update threshold';
      setError(errorMessage);
      onUpdateError?.(inventoryLevel.categoryGroupId, errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSaveClick();
    } else if (event.key === 'Escape') {
      handleCancelClick();
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          size="small"
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          error={!!error}
          helperText={error}
          placeholder={`0 ${inventoryLevel.inventoryUnit}`}
          inputProps={{ 
            min: 0, 
            step: 'any',
            style: { textAlign: 'right' },
          }}
          InputProps={{
            endAdornment: (
              <Typography variant="caption" color="text.secondary">
                {inventoryLevel.inventoryUnit}
              </Typography>
            ),
          }}
          sx={{ 
            width: 100,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.875rem',
            },
          }}
          autoFocus
          disabled={isUpdating}
        />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Save changes">
            <span>
              <IconButton
                size="small"
                onClick={handleSaveClick}
                disabled={isUpdating}
                sx={{ color: 'success.main' }}
              >
                {isUpdating ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Cancel editing">
            <span>
              <IconButton
                size="small"
                onClick={handleCancelClick}
                disabled={isUpdating}
                sx={{ color: 'error.main' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderRadius: 1,
        px: 1,
        py: 0.5,
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: 'action.hover',
          '& .edit-button': {
            opacity: 1,
          },
        },
      }}
      onClick={handleEditClick}
    >
      <Typography variant="body2">
        {formatInventoryValue(inventoryLevel.minimumThreshold, inventoryLevel.inventoryUnit)}
      </Typography>
      <Tooltip title="Click to edit threshold">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick();
          }}
          className="edit-button"
          sx={{ 
            opacity: 0,
            transition: 'opacity 0.2s',
            ml: 1,
            p: 0.25,
            color: 'primary.main',
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default EditableThresholdCell;
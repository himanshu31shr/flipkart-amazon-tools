import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Grid,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { InventoryLevel } from '../../../types/inventory';

export interface MobileInventoryCardsProps {
  inventoryLevels: InventoryLevel[];
  loading?: boolean;
  onEdit?: (inventoryLevel: InventoryLevel) => void;
  onManualAdjustment?: (inventoryLevel: InventoryLevel) => void;
}

const MobileInventoryCards: React.FC<MobileInventoryCardsProps> = ({
  inventoryLevels,
  loading = false,
  onEdit,
  onManualAdjustment,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'low_stock':
        return theme.palette.warning.main;
      case 'zero_stock':
        return theme.palette.error.main;
      case 'negative_stock':
        return theme.palette.error.dark;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon />;
      case 'low_stock':
        return <WarningIcon />;
      case 'zero_stock':
        return <ErrorIcon />;
      case 'negative_stock':
        return <TrendingDownIcon />;
      default:
        return <InventoryIcon />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'low_stock':
        return 'Low Stock';
      case 'zero_stock':
        return 'Zero Stock';
      case 'negative_stock':
        return 'Negative Stock';
      default:
        return 'Unknown';
    }
  };

  const calculateProgress = (current: number, threshold: number) => {
    if (threshold === 0) return current > 0 ? 100 : 0;
    if (current <= 0) return 0;
    return Math.min((current / threshold) * 100, 100);
  };

  const formatInventoryValue = (value: number, unit: string) => {
    if (unit === 'pcs') {
      return `${Math.floor(value)} ${unit}`;
    }
    return `${value.toFixed(2)} ${unit}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Loading inventory data...
        </Typography>
      </Box>
    );
  }

  if (inventoryLevels.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No inventory data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create category groups with inventory tracking to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {inventoryLevels.map((level) => {
        const statusColor = getStatusColor(level.status);
        const statusIcon = getStatusIcon(level.status);
        const progress = calculateProgress(level.currentInventory, level.minimumThreshold);
        
        return (
          <Grid item xs={12} key={level.categoryGroupId}>
            <Card
              elevation={2}
              sx={{
                borderLeft: `4px solid ${statusColor}`,
                '&:hover': {
                  elevation: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out',
                },
              }}
            >
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" component="span" noWrap>
                      {level.name}
                    </Typography>
                    <Chip
                      icon={statusIcon}
                      label={getStatusLabel(level.status)}
                      size="small"
                      sx={{
                        backgroundColor: statusColor,
                        color: theme.palette.getContrastText(statusColor),
                      }}
                    />
                  </Box>
                }
                subheader={
                  <Typography variant="body2" color="text.secondary">
                    {level.inventoryType === 'weight' ? 'Weight-based' : 'Quantity-based'} • {level.inventoryUnit}
                  </Typography>
                }
                action={
                  <IconButton
                    size="small"
                    onClick={() => onEdit?.(level)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ pb: 1 }}
              />

              <CardContent sx={{ pt: 0, pb: 1 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current Inventory
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatInventoryValue(level.currentInventory, level.inventoryUnit)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Minimum Threshold
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatInventoryValue(level.minimumThreshold, level.inventoryUnit)}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Inventory Level
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {progress.toFixed(0)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(progress, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.palette.grey[200],
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 
                            progress < 25 ? theme.palette.error.main :
                            progress < 50 ? theme.palette.warning.main :
                            theme.palette.success.main,
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                </Box>

                {level.status !== 'healthy' && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: theme.palette.grey[50],
                      border: `1px solid ${theme.palette.grey[200]}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block">
                      Status Alert
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {level.status === 'low_stock' && 'Inventory is below minimum threshold'}
                      {level.status === 'zero_stock' && 'Inventory is completely depleted'}
                      {level.status === 'negative_stock' && 'Inventory shows negative balance - immediate attention required'}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => onManualAdjustment?.(level)}
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    py: 1,
                  }}
                >
                  Adjust Inventory
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default MobileInventoryCards;
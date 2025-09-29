import React from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  Tooltip,
  Chip,
} from '@mui/material';
import { QrCode2, QrCodeScanner } from '@mui/icons-material';

interface BarcodeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export const BarcodeToggle: React.FC<BarcodeToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: disabled 
          ? 'grey.200' 
          : enabled 
            ? 'primary.light' 
            : 'grey.200',
        backgroundColor: disabled 
          ? 'warning.dark' 
          : enabled 
            ? 'primary.lightest' 
            : 'warning.dark',
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: disabled 
            ? 'grey.200' 
            : enabled 
              ? 'primary.main' 
              : 'grey.200',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {enabled ? (
          <QrCode2 sx={{ 
            color: disabled ? 'grey.600' : 'primary.main', 
            fontSize: 24 
          }} />
        ) : (
          <QrCodeScanner sx={{ 
            color: disabled ? 'grey.600' : 'grey.700', 
            fontSize: 24 
          }} />
        )}
        <Box>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600,
              color: disabled ? 'grey.700' : 'text.primary'
            }}
          >
            Barcode Generation
          </Typography>
          <Typography 
            variant="body2" 
            sx={{
              color: disabled ? 'grey.600' : 'text.secondary'
            }}
          >
            {enabled 
              ? 'Add barcodes to each page for tracking'
              : 'Generate PDF without barcodes'
            }
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={enabled ? 'Enabled' : 'Disabled'}
          color={enabled ? 'primary' : 'default'}
          size="small"
          variant={enabled ? 'filled' : 'outlined'}
          sx={{
            ...(disabled && {
              backgroundColor: 'grey.200',
              color: 'grey.700',
              borderColor: 'grey.400',
              '& .MuiChip-label': {
                color: 'grey.700'
              }
            })
          }}
        />
        
        <Tooltip 
          title={
            enabled 
              ? 'Disable to generate PDFs without barcodes for faster processing'
              : 'Enable to add tracking barcodes to each page of the merged PDF'
          }
        >
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                color="primary"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        </Tooltip>
      </Box>
    </Box>
  );
};
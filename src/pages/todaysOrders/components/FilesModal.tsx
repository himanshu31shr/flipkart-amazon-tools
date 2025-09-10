import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TodaysFilesWidget } from '../../storage-management/components/TodaysFilesWidget';

interface FilesModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
}

export const FilesModal: React.FC<FilesModalProps> = ({
  open,
  onClose,
  selectedDate
}) => {
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const title = isToday ? "Today's Files" : `Files for ${selectedDate.toLocaleDateString()}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, pt: 0 }}>
          <TodaysFilesWidget selectedDate={selectedDate} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
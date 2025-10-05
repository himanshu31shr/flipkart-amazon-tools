import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Example icon
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        p: 2,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
      <Typography variant="h1" component="h1" gutterBottom>
        404 - Not Found
      </Typography>
      <Typography variant="h6" component="p" sx={{ mb: 4 }}>
        The page you are looking for does not exist.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button variant="outlined" component={Link} to="/">
          Go Home
        </Button>
      </Box>
    </Box>
  );
};

export default NotFound; 
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Card,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, resetPassword } from '../../store/slices/authSlice';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isResetMode) {
        await dispatch(resetPassword(email)).unwrap();
        setIsResetMode(false);
      } else {
        await dispatch(login({ email, password, rememberMe })).unwrap();
        navigate('/');
      }
    } catch {
      // Error is handled by Redux, no need to set local error
    }
  };

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100vh - 60px)', sm: '100vh' }, // Account for mobile browser chrome
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, sm: 0 }, // Add padding on small screens
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'background.paper' : 'primary.light',
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
      }}
    >
      <Card
        elevation={5}
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: { xs: 350, sm: 450 },
          mx: { xs: 2, sm: 0 }, // Add horizontal margin on small screens
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          borderRadius: 2,
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 24px rgba(0,0,0,0.4)' 
            : '0 8px 24px rgba(21,101,192,0.2)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            width: 56, 
            height: 56, 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 2
          }}>
            <LockOutlinedIcon fontSize="large" />
          </Box>
          <Typography variant="h4" component="h1" align="center" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
            {isResetMode ? 'Reset Password' : 'Sign In'}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            {isResetMode 
              ? 'Enter your email to receive a password reset link' 
              : 'Sign in to access your account'}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 2 }} />

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon color="primary" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {!isResetMode && (
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 1 }}
            />
          )}

          {!isResetMode && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember me"
            />
          )}

          {error && (
            <Alert severity={error.includes('sent') ? 'success' : 'error'} sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3, 
              mb: 2, 
              py: 1.5, 
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: (theme) => theme.palette.mode === 'dark' 
                ? '0 4px 12px rgba(0,0,0,0.2)' 
                : '0 4px 12px rgba(21,101,192,0.2)'
            }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isResetMode ? (
              'Send Reset Link'
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isResetMode ? 'Remember your password?' : 'Having trouble?'}
          </Typography>
        </Divider>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="text"
            color="primary"
            onClick={() => setIsResetMode(!isResetMode)}
            sx={{ fontWeight: 'medium' }}
          >
            {isResetMode ? 'Back to Sign In' : 'Forgot Password?'}
          </Button>
        </Box>
      </Card>
    </Box>
  );
};
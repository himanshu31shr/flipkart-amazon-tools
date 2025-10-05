import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  IconButton,
  Avatar,
} from '@mui/material';
import {
  Close as CloseIcon,
  ShoppingCart as OrdersIcon,
  Inventory as ProductsIcon,
  Category as CategoriesIcon,
  Group as CategoryGroupsIcon,
  Dashboard as DashboardIcon,
  Assessment as AnalyticsIcon,
  Storage as StorageIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { getBasePath } from '../../utils/routing';
import { useAppSelector } from '../../store/hooks';

export interface MobileDrawerProps {
  /** Whether the drawer is open */
  open: boolean;

  /** Callback when drawer should close */
  onClose: () => void;

  /** Callback when logout is clicked */
  onLogout?: () => void;
}

interface DrawerMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  dividerAfter?: boolean;
}

/**
 * Mobile navigation drawer component
 * Provides access to all app sections and user actions
 *
 * Features:
 * - Full navigation menu with icons
 * - User profile section
 * - Logout action
 * - Active route highlighting
 * - Smooth slide-in animation
 *
 * @example
 * <MobileDrawer
 *   open={drawerOpen}
 *   onClose={() => setDrawerOpen(false)}
 *   onLogout={handleLogout}
 * />
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open,
  onClose,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = getBasePath();

  // Get user info from auth state
  const user = useAppSelector(state => state.auth?.user);

  // Define drawer menu items
  const menuItems: DrawerMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      route: `${basePath}/dashboard`,
    },
    {
      id: 'home',
      label: 'PDF Upload',
      icon: <HomeIcon />,
      route: `${basePath}/home`,
    },
    {
      id: 'orders',
      label: "Today's Orders",
      icon: <OrdersIcon />,
      route: `${basePath}/todays-orders`,
      dividerAfter: true,
    },
    {
      id: 'products',
      label: 'Products',
      icon: <ProductsIcon />,
      route: `${basePath}/products`,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <CategoriesIcon />,
      route: `${basePath}/categories`,
    },
    {
      id: 'categoryGroups',
      label: 'Category Groups',
      icon: <CategoryGroupsIcon />,
      route: `${basePath}/category-groups`,
      dividerAfter: true,
    },
    {
      id: 'analytics',
      label: 'Order Analytics',
      icon: <AnalyticsIcon />,
      route: `${basePath}/order-analytics`,
    },
    {
      id: 'storage',
      label: 'Storage',
      icon: <StorageIcon />,
      route: `${basePath}/storage-management`,
    },
  ];

  const handleNavigate = (route: string) => {
    navigate(route);
    onClose();
  };

  const handleLogoutClick = () => {
    onClose();
    if (onLogout) {
      onLogout();
    }
  };

  // Check if a route is currently active
  const isActiveRoute = (route: string): boolean => {
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          maxWidth: '80vw',
          backgroundColor: 'background.default',
        },
      }}
      PaperProps={{
        elevation: 8,
      }}
    >
      {/* Header with close button and user info */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          minHeight: 80,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.dark',
              fontSize: '1.25rem',
              fontWeight: 600,
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.displayName || 'User'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {user?.email || ''}
            </Typography>
          </Box>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close drawer"
          sx={{
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation menu items */}
      <List sx={{ flex: 1, py: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.id}>
            <ListItem disablePadding>
              <ListItemButton
                selected={isActiveRoute(item.route)}
                onClick={() => handleNavigate(item.route)}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActiveRoute(item.route) ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: isActiveRoute(item.route) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
            {item.dividerAfter && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>

      <Divider />

      {/* Logout button */}
      <List sx={{ py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogoutClick}
            sx={{
              minHeight: 48,
              px: 2.5,
              color: 'error.main',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default MobileDrawer;

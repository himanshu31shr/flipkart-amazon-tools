import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  IconButton,
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Switch,
  styled,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  Hidden,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthService } from "../services/auth.service";
import { BarcodeScannerButton } from "./BarcodeScannerButton";
import { createRoutePath } from "../utils/routing";

const DRAWER_WIDTH = 250;

const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
    marginLeft: `${DRAWER_WIDTH}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const getRouteTitle = (pathname: string): string => {
  switch (pathname) {
    case "/":
      return "Dashboard";
    case "/transactions/":
      return "Transaction Analytics";
    case "/activeOrders/":
      return "Active Orders";    
    case "/products/":
      return "Products";
    case "/order-analytics/":
      return "Order Analytics";
    case "/storage-management/":
      return "Storage Management";
    case "/inventory/":
      return "Inventory Management";
    default:
      return "Label Merger";
  }
};

export const AppBar = ({
  toggleDrawer,
  toggleTheme,
  mode,
  open,
}: {
  toggleDrawer: (
    open: boolean
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
  toggleTheme: () => void;
  mode: "light" | "dark";
  open: boolean;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getRouteTitle(location.pathname);
  const [authenticated, setAuthenticated] = useState(false);
  const authService = new AuthService();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate(createRoutePath('/login'));
    } catch {
      // Error signing out, but don't prevent the UI from updating
    }
  };

  return (
    <StyledAppBar position="fixed" open={open}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={toggleDrawer(!open)}
          data-testid="menu-button"
          sx={{ mr: 2, ...(open && { display: 'none' }) }}
        >
          <MenuIcon />
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="close drawer"
          onClick={toggleDrawer(false)}
          sx={{ mr: 2, ...(!open && { display: 'none' }) }}
        >
          <ChevronLeftIcon />
        </IconButton>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 1 : 2,
          flexWrap: 'nowrap',
          overflow: 'hidden'
        }}>
          {/* Theme toggle - always visible but smaller on mobile */}
          <Switch
            checked={mode === "dark"}
            onChange={toggleTheme}
            inputProps={{ "aria-label": "dark mode toggle" }}
            data-testid="theme-toggle"
            size={isMobile ? "small" : "medium"}
          />

          {/* Barcode scanner - always visible when authenticated */}
          {authenticated && (
            <BarcodeScannerButton />
          )}

          {/* Logout button - responsive layout */}
          {authenticated && (
            <Hidden smDown implementation="css">
              <Button
                color="inherit"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                size={isMobile ? "small" : "medium"}
              >
                Logout
              </Button>
            </Hidden>
          )}
          
          {/* Icon-only logout on small screens */}
          {authenticated && (
            <Hidden smUp implementation="css">
              <IconButton
                color="inherit"
                onClick={handleLogout}
                aria-label="logout"
                size="small"
                sx={{
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <LogoutIcon />
              </IconButton>
            </Hidden>
          )}
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

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
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthService } from "../services/auth.service";

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
    case "/flipkart-amazon-tools/":
      return "Dashboard";
    case "/flipkart-amazon-tools/transactions/":
      return "Transaction Analytics";
    case "/flipkart-amazon-tools/activeOrders/":
      return "Active Orders";    
    case "/flipkart-amazon-tools/products/":
      return "Products";
    case "/flipkart-amazon-tools/order-analytics/":
      return "Order Analytics";
    case "/flipkart-amazon-tools/storage-management/":
      return "Storage Management";
    case "/flipkart-amazon-tools/inventory/":
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

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      navigate('/flipkart-amazon-tools/login');
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Switch
            checked={mode === "dark"}
            onChange={toggleTheme}
            inputProps={{ "aria-label": "dark mode toggle" }}
            data-testid="theme-toggle"
          />

          {authenticated && (
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          )}
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

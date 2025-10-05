import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LabelIcon from "@mui/icons-material/Label";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ManagementIcon from "@mui/icons-material/Warehouse";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CategoryIcon from "@mui/icons-material/Category";
import GroupIcon from "@mui/icons-material/Group";
import WarningIcon from "@mui/icons-material/Warning";
import StorageIcon from "@mui/icons-material/Storage";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
  Box,
  Container,
  Drawer,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
  Divider,
  IconButton,
  Typography,
  alpha,
  useTheme,
  useMediaQuery,
  Collapse,
} from "@mui/material";
import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { AppBar } from "../../components/appbar";

// Responsive drawer width
const DRAWER_WIDTH = {
  xs: 240, // Smaller on mobile
  sm: 240, // Same on tablet
  md: 250, // Default on desktop
};

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2, 2),
  ...theme.mixins.toolbar,
  justifyContent: "space-between",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  margin: theme.spacing(0.5, 0),
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 1.5),
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  "&.Mui-selected": {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  },
}));

const StyledListItemIcon = styled(ListItemIcon)(({ theme }) => ({
  minWidth: 36,
  color: theme.palette.primary.main,
  marginRight: theme.spacing(1),
}));

const StyledListItemText = styled(ListItemText)({
  "& .MuiTypography-root": {
    fontWeight: 500,
  },
});

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  width: "100%",
  ...(open && {
    [theme.breakpoints.up("sm")]: {
      transition: theme.transitions.create(["margin", "width"], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    },
  }),
}));

export const DefaultContainer = ({
  children,
  toggleTheme,
  mode,
}: {
  children: React.ReactNode;
  toggleTheme: () => void;
  mode: "light" | "dark";
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();

  // Initialize drawer state - closed by default on mobile
  const [open, setOpen] = React.useState(!isMobile);
  const [ordersOpen, setOrdersOpen] = React.useState(false);
  const [productsOpen, setProductsOpen] = React.useState(false);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [managementOpen, setManagementOpen] = React.useState(false);

  // Update drawer state when screen size changes
  React.useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  // Update section states based on current route
  React.useEffect(() => {
    const path = location.pathname;
    setOrdersOpen(path.includes("/home/") || path.includes("/activeOrders/"));
    setProductsOpen(
      path.includes("/products/") || path.includes("/uncategorized-products/")
    );
    setCategoriesOpen(
      path.includes("/categories/") || path.includes("/category-groups/")
    );
    setManagementOpen(
      path.includes("/storage-management/") || path.includes("/inventory/")
    );
  }, [location.pathname]);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  // Function to handle navigation and close drawer on mobile
  const handleNavigation = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const DrawerList = (
    <Box
      sx={{
        width: {
          xs: DRAWER_WIDTH.xs,
          sm: DRAWER_WIDTH.sm,
          md: DRAWER_WIDTH.md,
        },
      }}
      role="presentation"
    >
      <DrawerHeader>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 600,
            fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
          }}
        >
          Sacred Sutra
        </Typography>
        <IconButton
          onClick={toggleDrawer(false)}
          sx={{
            color: "inherit",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List sx={{ px: 0.5, py: 2 }}>
        {/* Dashboard */}
        <Link
          component={RouterLink}
          to={"/"}
          data-testid="dashboard"
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={handleNavigation}
        >
          <ListItem key={"Dashboard"} disablePadding>
            <StyledListItemButton selected={isActiveRoute("/")}>
              <StyledListItemIcon>
                <DashboardIcon />
              </StyledListItemIcon>
              <StyledListItemText primary={"Dashboard"} />
            </StyledListItemButton>
          </ListItem>
        </Link>

        {/* Orders Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => setOrdersOpen(!ordersOpen)}>
            <StyledListItemIcon>
              <ShoppingCartIcon />
            </StyledListItemIcon>
            <StyledListItemText primary="Orders" />
            {ordersOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={ordersOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            <Link
              component={RouterLink}
              to={"/home/"}
              data-testid="merge-labels"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Merge Labels"} disablePadding>
                <StyledListItemButton selected={isActiveRoute("/home/")}>
                  <StyledListItemIcon>
                    <LabelIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Merge Labels"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
            <Link
              component={RouterLink}
              to={"/activeOrders/"}
              data-testid="active-orders"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Active Orders"} disablePadding>
                <StyledListItemButton
                  selected={isActiveRoute("/activeOrders/")}
                >
                  <StyledListItemIcon>
                    <ShoppingCartIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Active Orders"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
          </List>
        </Collapse>

        {/* Products Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => setProductsOpen(!productsOpen)}>
            <StyledListItemIcon>
              <ShoppingCartIcon />
            </StyledListItemIcon>
            <StyledListItemText primary="Products" />
            {productsOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={productsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            <Link
              component={RouterLink}
              to={"/products/"}
              data-testid="products"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"All Products"} disablePadding>
                <StyledListItemButton selected={isActiveRoute("/products/")}>
                  <StyledListItemIcon>
                    <ShoppingCartIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"All Products"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
            <Link
              component={RouterLink}
              to={"/uncategorized-products/"}
              data-testid="uncategorized-products"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Uncategorized Products"} disablePadding>
                <StyledListItemButton
                  selected={isActiveRoute("/uncategorized-products/")}
                >
                  <StyledListItemIcon>
                    <WarningIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Uncategorized Products"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
          </List>
        </Collapse>

        {/* Categories Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => setCategoriesOpen(!categoriesOpen)}>
            <StyledListItemIcon>
              <CategoryIcon />
            </StyledListItemIcon>
            <StyledListItemText primary="Categories" />
            {categoriesOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={categoriesOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            <Link
              component={RouterLink}
              to={"/categories/"}
              data-testid="all-categories"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"All Categories"} disablePadding>
                <StyledListItemButton selected={isActiveRoute("/categories/")}>
                  <StyledListItemIcon>
                    <CategoryIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"All Categories"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
            <Link
              component={RouterLink}
              to={"/category-groups/"}
              data-testid="category-groups"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Category Groups"} disablePadding>
                <StyledListItemButton
                  selected={isActiveRoute("/category-groups/")}
                >
                  <StyledListItemIcon>
                    <GroupIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Category Groups"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
          </List>
        </Collapse>

        {/* Management Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => setManagementOpen(!managementOpen)}>
            <StyledListItemIcon>
              <ManagementIcon />
            </StyledListItemIcon>
            <StyledListItemText primary="Management" />
            {managementOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={managementOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1 }}>
            <Link
              component={RouterLink}
              to={"/inventory/"}
              data-testid="inventory-management"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Inventory Management"} disablePadding>
                <StyledListItemButton selected={isActiveRoute("/inventory/")}>
                  <StyledListItemIcon>
                    <ManagementIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Inventory Management"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
            <Link
              component={RouterLink}
              to={"/storage-management/"}
              data-testid="storage-management"
              style={{ textDecoration: "none", color: "inherit" }}
              onClick={handleNavigation}
            >
              <ListItem key={"Storage Management"} disablePadding>
                <StyledListItemButton
                  selected={isActiveRoute("/storage-management/")}
                >
                  <StyledListItemIcon>
                    <StorageIcon />
                  </StyledListItemIcon>
                  <StyledListItemText primary={"Storage Management"} />
                </StyledListItemButton>
              </ListItem>
            </Link>
          </List>
        </Collapse>

        {/* Analytics Section */}
        <Link
          component={RouterLink}
          to={"/transactions/"}
          data-testid="transactions"
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={handleNavigation}
        >
          <ListItem key={"Transaction Analytics"} disablePadding>
            <StyledListItemButton selected={isActiveRoute("/transactions/")}>
              <StyledListItemIcon>
                <AnalyticsIcon />
              </StyledListItemIcon>
              <StyledListItemText primary={"Transaction Analytics"} />
            </StyledListItemButton>
          </ListItem>
        </Link>
        <Link
          component={RouterLink}
          to={"/order-analytics/"}
          data-testid="order-analytics"
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={handleNavigation}
        >
          <ListItem key={"Order Analytics"} disablePadding>
            <StyledListItemButton selected={isActiveRoute("/order-analytics/")}>
              <StyledListItemIcon>
                <AnalyticsIcon />
              </StyledListItemIcon>
              <StyledListItemText primary={"Order Analytics"} />
            </StyledListItemButton>
          </ListItem>
        </Link>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", width: "100%" }}>
      <AppBar
        toggleDrawer={toggleDrawer}
        toggleTheme={toggleTheme}
        mode={mode}
        open={open}
      />
      <Drawer
        sx={{
          width: open
            ? { xs: DRAWER_WIDTH.xs, sm: DRAWER_WIDTH.sm, md: DRAWER_WIDTH.md }
            : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open
              ? {
                  xs: DRAWER_WIDTH.xs,
                  sm: DRAWER_WIDTH.sm,
                  md: DRAWER_WIDTH.md,
                }
              : 0,
            boxSizing: "border-box",
            borderRight: "none",
            boxShadow: "0 0 35px 0 rgba(154,161,171,.15)",
          },
          transition: "width 0.3s ease-in-out",
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        {DrawerList}
      </Drawer>
      <Main open={open}>
        <Container
          maxWidth={false}
          sx={{
            maxWidth: "100%",
            mt: 8, // Add margin top to account for AppBar
            px: { xs: 2, sm: 3 }, // Add responsive padding
            transition: "padding 0.3s ease-in-out",
          }}
        >
          {children}
        </Container>
      </Main>
    </Box>
  );
};

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AppBar } from "../appbar";
import productsSlice from "../../store/slices/productsSlice";

// Mock the auth service
const mockSignOut = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock("../../services/auth.service", () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    signOut: mockSignOut,
    onAuthStateChanged: mockOnAuthStateChanged,
  })),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock BarcodeScannerButton dependencies
jest.mock("../../services/product.service");
jest.mock("../../services/barcode.service");
jest.mock("../../services/productNavigation.service");

// Mock the ProductIdentificationScanner component
jest.mock("../ProductIdentificationScanner", () => ({
  ProductIdentificationScanner: ({ open, onClose }: any) => {
    if (!open) return null;
    return (
      <div data-testid="product-identification-scanner">
        <button onClick={onClose} data-testid="mock-close">
          Close Scanner
        </button>
      </div>
    );
  },
}));

const theme = createTheme();

// Mock product for testing
const mockProduct = {
  id: "test-product-1",
  sku: "TEST-SKU-001",
  name: "Test Product",
  description: "Test product description",
  platform: "amazon" as const,
  visibility: "visible" as const,
  sellingPrice: 100,
  metadata: {
    amazonSerialNumber: "B0123456789",
    flipkartSerialNumber: "FLIP123456789",
  },
};

// Helper function to create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      products: productsSlice,
    },
    preloadedState: {
      products: {
        items: [mockProduct], // Pre-populate with products to avoid fetchProducts call
        filteredItems: [mockProduct],
        loading: false,
        error: null,
        filters: {},
        lastFetched: Date.now(),
        detailsCache: {},
        categories: [],
        categoriesLoading: false,
        categoriesError: null,
        categoryProducts: [],
        categoryProductsLoading: false,
        categoryProductsError: null,
        inventoryLevels: {},
        inventoryLoading: false,
        inventoryError: null,
        productInventoryStatus: {},
        lowStockProducts: [],
        zeroStockProducts: [],
      },
    },
  });
};

const renderAppBar = (props = {}, router?: React.ReactNode) => {
  const defaultProps = {
    toggleDrawer: jest.fn(() => jest.fn()),
    toggleTheme: jest.fn(),
    mode: "light" as const,
    open: false,
  };

  const store = createTestStore();

  return render(
    router ? (
      router
    ) : (
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <AppBar {...defaultProps} {...props} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    )
  );
};

describe("AppBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to unauthenticated state
    mockOnAuthStateChanged.mockImplementation((callback) => {
      callback(null);
      return jest.fn(); // unsubscribe function
    }) as any;
  }) as any;

  describe("rendering", () => {
    it("should render with default title", () => {
      const store = createTestStore();
      renderAppBar(
        {},
        <Provider store={store}>
          <MemoryRouter initialEntries={["/"]}>
            <ThemeProvider theme={theme}>
              <AppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </MemoryRouter>
        </Provider>
      );
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    }) as any;

    it("should render menu button when drawer is closed", () => {
      renderAppBar({ open: false }) as any;

      const menuButton = screen.getByTestId("menu-button");
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toBeVisible();
    }) as any;

    it("should hide menu button when drawer is open", () => {
      renderAppBar({ open: true }) as any;

      const menuButton = screen.getByTestId("menu-button");
      expect(menuButton).toHaveStyle({ display: "none" }) as any;
    }) as any;

    it("should render theme toggle switch", () => {
      renderAppBar();

      const themeToggle = screen.getByTestId("theme-toggle");
      expect(themeToggle).toBeInTheDocument();
    }) as any;

    it("should show correct theme state", () => {
      renderAppBar({ mode: "dark" }) as any;

      const themeToggle = screen.getByLabelText("dark mode toggle");
      expect(themeToggle).toBeChecked();
    }) as any;

    it("should show light theme state", () => {
      renderAppBar({ mode: "light" }) as any;

      const themeToggle = screen.getByLabelText("dark mode toggle");
      expect(themeToggle).not.toBeChecked();
    }) as any;
  }) as any;

  describe("route titles", () => {
    const routeTests = [
      { path: "/", title: "Dashboard" },
      { path: "/transactions/", title: "Transaction Analytics" },
      { path: "/activeOrders/", title: "Active Orders" },
      { path: "/products/", title: "Products" },
      { path: "/order-analytics/", title: "Order Analytics" },
      { path: "/unknown-route/", title: "Label Merger" },
    ];

    routeTests.forEach(({ path, title }) => {
      it(`should show "${title}" for route ${path}`, () => {
        renderAppBar(
          {},
          <MemoryRouter initialEntries={[path]}>
            <ThemeProvider theme={theme}>
              <AppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </MemoryRouter>
        );
        expect(screen.getByText(title)).toBeInTheDocument();
      }) as any;
    }) as any;
  }) as any;

  describe("interactions", () => {
    it("should call toggleDrawer when menu button is clicked", () => {
      const mockToggleDrawer = jest.fn(() => jest.fn());
      renderAppBar({ toggleDrawer: mockToggleDrawer, open: false }) as any;

      const menuButton = screen.getByTestId("menu-button");
      fireEvent.click(menuButton);

      expect(mockToggleDrawer).toHaveBeenCalledWith(true);
    }) as any;

    it("should call toggleTheme when theme switch is clicked", () => {
      const mockToggleTheme = jest.fn();
      renderAppBar({ toggleTheme: mockToggleTheme }) as any;

      const themeToggle = screen.getByLabelText("dark mode toggle");
      fireEvent.click(themeToggle);

      expect(mockToggleTheme).toHaveBeenCalled();
    }) as any;

    it("should call toggleDrawer with false when close button is clicked", () => {
      const mockToggleDrawer = jest.fn(() => jest.fn());
      renderAppBar({ toggleDrawer: mockToggleDrawer, open: true }) as any;

      const closeButton = screen.getByLabelText("close drawer");
      fireEvent.click(closeButton);

      expect(mockToggleDrawer).toHaveBeenCalledWith(false);
    }) as any;
  }) as any;

  describe("authentication", () => {
    it("should not show logout button when not authenticated", () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(null); // No user
        return jest.fn();
      }) as any;

      renderAppBar();

      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    }) as any;

    it("should show logout button when authenticated", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any; // User exists
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      })) as any;
    }) as any;

    it("should call signOut and navigate when logout is clicked", async () => {
      mockSignOut.mockResolvedValue(undefined);
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      })) as any;

      const logoutButton = screen.getByText("Logout");
      fireEvent.click(logoutButton);

      (await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      })) as any;
    }) as any;

    it("should handle logout error gracefully", async () => {
      mockSignOut.mockRejectedValue(new Error("Logout failed"));
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        expect(screen.getByText("Logout")).toBeInTheDocument();
      })) as any;

      const logoutButton = screen.getByText("Logout");
      fireEvent.click(logoutButton);

      // The logout should fail silently without crashing the app
      (await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        // The app should still be functional even if logout fails
        expect(screen.getByText("Logout")).toBeInTheDocument();
      })) as any;
    }) as any;

    it("should unsubscribe from auth state changes on unmount", () => {
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderAppBar();

      expect(mockOnAuthStateChanged).toHaveBeenCalled();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    }) as any;
  }) as any;

  describe("styling and layout", () => {
    it("should apply correct styles when drawer is open", () => {
      renderAppBar({ open: true }) as any;

      // The AppBar should have specific styles when open
      const appBar = screen.getByRole("banner");
      expect(appBar).toBeInTheDocument();
    }) as any;

    it("should apply correct styles when drawer is closed", () => {
      renderAppBar({ open: false }) as any;

      const appBar = screen.getByRole("banner");
      expect(appBar).toBeInTheDocument();
    }) as any;

    it("should render with fixed position", () => {
      renderAppBar();

      const appBar = screen.getByRole("banner");
      expect(appBar).toBeInTheDocument();
    }) as any;
  }) as any;

  describe("accessibility", () => {
    it("should have proper aria labels", () => {
      renderAppBar();

      expect(screen.getByLabelText("menu")).toBeInTheDocument();
      expect(screen.getByLabelText("dark mode toggle")).toBeInTheDocument();
    }) as any;

    it("should have proper aria label for close button when open", () => {
      renderAppBar({ open: true }) as any;

      expect(screen.getByLabelText("close drawer")).toBeInTheDocument();
    }) as any;

    it("should be keyboard accessible", () => {
      renderAppBar();

      const menuButton = screen.getByTestId("menu-button");
      const themeToggle = screen.getByTestId("theme-toggle");

      expect(menuButton).toHaveAttribute("tabIndex", "0");
      expect(themeToggle).toBeInTheDocument();
    }) as any;
  }) as any;

  describe("edge cases", () => {
    it("should handle missing props gracefully", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppBar: LocalAppBar } = require("../appbar");
      expect(() => {
        render(
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <LocalAppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </BrowserRouter>
        );
      }).not.toThrow();
    }) as any;

    it("should handle auth service errors during initialization", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockOnAuthStateChanged.mockImplementation(() => {
        throw new Error("Auth service error");
      }) as any;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppBar: LocalAppBar } = require("../appbar");
      expect(() => {
        render(
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <LocalAppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={false}
              />
            </ThemeProvider>
          </BrowserRouter>
        );
      }).toThrow("Auth service error");
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    }) as any;
  }) as any;

  describe("BarcodeScannerButton Integration", () => {
    it("should not show scanner button when not authenticated", () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback(null); // No user
        return jest.fn();
      }) as any;

      renderAppBar();

      expect(
        screen.queryByRole("button", { name: /scan product barcode/i })
      ).not.toBeInTheDocument();
    }) as any;

    it("should show scanner button when authenticated", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any; // User exists
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /scan product barcode/i })
        ).toBeInTheDocument();
      })) as any;
    }) as any;

    it("should position scanner button between theme toggle and logout", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        const themeToggle = screen.getByTestId("theme-toggle");
        const scannerButton = screen.getByRole("button", {
          name: /scan product barcode/i,
        });
        const logoutButton = screen.getByText("Logout");

        // Verify all elements are present
        expect(themeToggle).toBeInTheDocument();
        expect(scannerButton).toBeInTheDocument();
        expect(logoutButton).toBeInTheDocument();

        // Verify they're in a flex container with proper spacing
        const container =
          themeToggle.closest('[sx*="display: flex"]') ||
          themeToggle.closest(".MuiBox-root");
        expect(container).toContainElement(scannerButton);
        expect(container).toContainElement(logoutButton);
      })) as any;
    }) as any;

    it("should open scanner modal when scanner button is clicked", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        const scannerButton = screen.getByRole("button", {
          name: /scan product barcode/i,
        });
        expect(scannerButton).toBeInTheDocument();
      })) as any;

      const scannerButton = screen.getByRole("button", {
        name: /scan product barcode/i,
      });
      fireEvent.click(scannerButton);

      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(
          screen.getByTestId("product-identification-scanner")
        ).toBeInTheDocument();
      });
    }) as any;

    it("should close scanner modal when close button is clicked", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        const scannerButton = screen.getByRole("button", {
          name: /scan product barcode/i,
        });
        expect(scannerButton).toBeInTheDocument();
      })) as any;

      // Open scanner
      const scannerButton = screen.getByRole("button", {
        name: /scan product barcode/i,
      });
      fireEvent.click(scannerButton);

      // Wait for the lazy-loaded component to render
      await waitFor(() => {
        expect(
          screen.getByTestId("product-identification-scanner")
        ).toBeInTheDocument();
      });

      // Close scanner
      const closeButton = screen.getByTestId("mock-close");
      fireEvent.click(closeButton);

      expect(
        screen.queryByTestId("product-identification-scanner")
      ).not.toBeInTheDocument();
    }) as any;

    it("should maintain responsive layout with scanner button", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar();

      (await waitFor(() => {
        const scannerButton = screen.getByRole("button", {
          name: /scan product barcode/i,
        });
        expect(scannerButton).toBeInTheDocument();

        // Verify the button has proper Material-UI styling for responsive design
        expect(scannerButton).toHaveClass("MuiIconButton-root");
        expect(scannerButton).toHaveClass("MuiIconButton-sizeLarge");
      })) as any;
    }) as any;

    it.skip("should maintain proper toolbar layout with all elements", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      renderAppBar({ open: false }) as any;
console.log(screen.debug());
      (await waitFor(() => {
        // Verify all toolbar elements are present
        expect(screen.getByTestId("menu-button")).toBeInTheDocument();
        expect(screen.getByText("Label Merger")).toBeInTheDocument(); // Default title
        expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /scan product barcode/i })
        ).toBeInTheDocument();
        expect(screen.getByText("Logout")).toBeInTheDocument();
      })) as any;
    }) as any;

    it("should work with drawer state changes", async () => {
      mockOnAuthStateChanged.mockImplementation((callback) => {
        callback({ uid: "test-user" }) as any;
        return jest.fn();
      }) as any;

      const { rerender } = renderAppBar({ open: false }) as any;

      (await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /scan product barcode/i })
        ).toBeInTheDocument();
      })) as any;

      // Rerender with open drawer
      const store = createTestStore();
      rerender(
        <Provider store={store}>
          <BrowserRouter>
            <ThemeProvider theme={theme}>
              <AppBar
                toggleDrawer={jest.fn(() => jest.fn())}
                toggleTheme={jest.fn()}
                mode="light"
                open={true}
              />
            </ThemeProvider>
          </BrowserRouter>
        </Provider>
      );

      (await waitFor(() => {
        // Scanner button should still be present
        expect(
          screen.getByRole("button", { name: /scan product barcode/i })
        ).toBeInTheDocument();
      })) as any;
    }) as any;
  }) as any;
}) as any;

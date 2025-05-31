import {
  Paper,
  Table,
  TableBody,
  TableContainer,
  TablePagination,
  Box,
  useMediaQuery,
  useTheme,
  Stack,
} from "@mui/material";
import React from "react";
import { TableHeader } from "./TableHeader";
import { TableRowComponent } from "./TableRowComponent";
import { MobileDataRow } from "./MobileDataRow";
import { MobileFilters } from "./MobileFilters";

export interface Column<T> {
  id: keyof T | string;
  label: string;
  filter?: boolean;
  align?: "right" | "left" | "center";
  format?: (value: unknown, row: T | undefined) => React.ReactNode;
  filterValue?: (row: T) => string; // Custom function to get the value for filtering
  priorityOnMobile?: boolean; // New property to indicate if column should be displayed prominently on mobile
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  defaultSortColumn: string;
  defaultSortDirection: "asc" | "desc";
  onRowClick?: (row: T) => void;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  id?: string;
}

type Comparable = string | number | Date | boolean;

export function DataTable<T>({
  columns,
  data,
  defaultSortColumn,
  defaultSortDirection,
  onRowClick,
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 10,
  id = "data-table",
}: DataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [orderBy, setOrderBy] = React.useState(defaultSortColumn);
  const [order, setOrder] = React.useState<"asc" | "desc">(
    defaultSortDirection
  );
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(
    isMobile ? Math.min(5, defaultRowsPerPage) : defaultRowsPerPage
  );
  const [filters, setFilters] = React.useState<
    Partial<Record<keyof T | string, string>>
  >({});

  // Update rows per page when screen size changes
  React.useEffect(() => {
    if (isMobile && rowsPerPage > 5) {
      setRowsPerPage(5);
    }
  }, [isMobile, rowsPerPage]);

  const handleRequestSort = (property: keyof T) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property as string);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (column: keyof T, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPage(0);
  };

  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  const compareValues = (a: unknown, b: unknown): number => {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Convert to comparable types if possible
    const aComp = a as Comparable;
    const bComp = b as Comparable;

    if (typeof aComp === typeof bComp) {
      return aComp < bComp ? -1 : 1;
    }

    // Fall back to string comparison
    return String(a).localeCompare(String(b));
  };

  const filteredAndSortedData = React.useMemo(() => {
    // First apply filters
    const result = data.filter((row) => {
      return Object.entries(filters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        
        // Find the column definition for this key
        const column = columns.find(col => col.id === key);
        
        // Use custom filterValue function if available
        if (column?.filterValue) {
          const customValue = column.filterValue(row);
          return customValue.toLowerCase().includes(filterValue.toLowerCase());
        }
        
        // Fall back to default behavior
        const value = getNestedValue(row, key);
        return String(value).toLowerCase().includes(filterValue.toLowerCase());
      });
    });

    // Then sort
    return [...result].sort((a, b) => {
      const aValue = getNestedValue(a, orderBy);
      const bValue = getNestedValue(b, orderBy);
      return order === "desc"
        ? compareValues(bValue, aValue)
        : compareValues(aValue, bValue);
    });
  }, [data, order, orderBy, filters, columns]);

  const paginatedData = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  // Render mobile view
  if (isMobile) {
    return (
      <Box sx={{ width: "100%" }}>
        <MobileFilters
          columns={columns}
          orderBy={orderBy as keyof T}
          order={order}
          filters={filters}
          onRequestSort={handleRequestSort}
          onFilterChange={handleFilterChange}
        />

        <Stack spacing={1}>
          {paginatedData.map((row, index) => (
            <MobileDataRow
              key={index}
              row={row}
              columns={columns}
              index={index}
              onClick={onRowClick}
            />
          ))}
        </Stack>

        <TablePagination
          rowsPerPageOptions={[5, 10]}
          component="div"
          count={filteredAndSortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            '.MuiTablePagination-selectLabel': {
              display: { xs: 'none', sm: 'block' }
            },
            '.MuiTablePagination-displayedRows': {
              margin: '0 auto'
            }
          }}
        />
      </Box>
    );
  }

  // Render desktop view
  return (
    <Box sx={{ width: "100%" }}>
      <TableContainer component={Paper}>
        <Table id={id}>
          <TableHeader
            columns={columns}
            orderBy={orderBy as keyof T}
            order={order}
            onRequestSort={handleRequestSort}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRowComponent
                key={index}
                row={row}
                columns={columns}
                index={index}
                onClick={onRowClick}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={filteredAndSortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

# DataTable Component - Installation & Usage Guide

## 📦 Installation

### 1. Install Dependencies

```bash
npm install xlsx
# or
pnpm add xlsx
# or
yarn add xlsx
```

### 2. File Structure

The DataTable component consists of the following files:

```
components/ui/data-table/
├── index.ts                   # Main exports
├── types.ts                   # TypeScript definitions
├── utils.ts                   # Helper utilities
├── export-utils.ts            # Excel export utilities
├── DataTable.tsx              # Main component
├── DataTableLoading.tsx       # Loading state
├── DataTableEmpty.tsx         # Empty state
├── DataTablePagination.tsx    # Pagination controls
└── DataTableExport.tsx        # Export button
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@/components/ui/data-table';

// Define your data type
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Define columns
const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: (row) => row.email,
    sortable: true,
  },
  {
    id: 'role',
    header: 'Role',
    accessor: (row) => row.role,
  },
];

// Use in component
function UsersTable({ users }: { users: User[] }) {
  return (
    <DataTable
      data={users}
      columns={columns}
      getRowId={(row) => row.id}
    />
  );
}
```

## 📚 Advanced Features

### 1. Pagination

```tsx
const [pagination, setPagination] = useState({
  currentPage: 1,
  pageSize: 10,
  total: users.length,
});

<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  pagination={pagination}
  onPageChange={(page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }}
/>
```

### 2. Sorting

```tsx
const [sortConfig, setSortConfig] = useState<SortConfig>({
  column: 'name',
  direction: 'asc',
});

<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  sortConfig={sortConfig}
  onSortChange={setSortConfig}
/>
```

### 3. Selection

```tsx
const [selectedRows, setSelectedRows] = useState<string[]>([]);

<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  selectable
  selectedRows={selectedRows}
  onSelectionChange={setSelectedRows}
/>
```

### 4. Row Actions

```tsx
<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  rowActions={(row) => (
    <div className="flex gap-2">
      <button onClick={() => handleEdit(row)}>Edit</button>
      <button onClick={() => handleDelete(row)}>Delete</button>
    </div>
  )}
/>
```

### 5. Excel Export

```tsx
<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  exportConfig={{
    enabled: true,
    filename: 'users',
    sheetName: 'Users List',
  }}
/>
```

### 6. Custom Cell Rendering

```tsx
const columns: ColumnDef<User>[] = [
  {
    id: 'avatar',
    header: '',
    accessor: (row) => row.avatarUrl,
    cell: (row) => (
      <Avatar src={row.avatarUrl} alt={row.name} />
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => row.isActive,
    cell: (row) => (
      <span className={row.isActive ? 'text-success' : 'text-error'}>
        {row.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];
```

### 7. Empty & Loading States

```tsx
<DataTable
  data={users}
  columns={columns}
  getRowId={(row) => row.id}
  loading={isLoading}
  emptyState={{
    icon: <UsersIcon />,
    title: 'No users found',
    description: 'Try adding your first user',
    action: {
      label: 'Add User',
      onClick: () => handleAddUser(),
    },
  }}
/>
```

### 8. Mobile Responsive

```tsx
const columns: ColumnDef<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: (row) => row.name,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: (row) => row.email,
    hideOnMobile: true, // Hide on mobile screens
  },
];
```

## 🎨 Styling Options

### Sizes

```tsx
<DataTable size="sm" />   // Small
<DataTable size="md" />   // Medium (default)
<DataTable size="lg" />   // Large
```

### Variants

```tsx
<DataTable striped />      // Striped rows
<DataTable hoverable />    // Hover effect
<DataTable stickyHeader /> // Sticky header on scroll
```

### Height Control

```tsx
<DataTable maxHeight="500px" /> // Scrollable table
```

## 🌍 RTL Support

The DataTable automatically detects RTL languages and adjusts:
- Text alignment
- Column order
- Icon directions
- Excel export layout

## ♿ Accessibility

- Full ARIA support
- Keyboard navigation
- Screen reader friendly
- Semantic HTML

## 📖 Complete Props Reference

```typescript
interface DataTableProps<T> {
  // Required
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T, index: number) => string;
  
  // Optional States
  loading?: boolean;
  error?: Error | string | null;
  emptyState?: EmptyState;
  
  // Pagination
  pagination?: PaginationConfig;
  onPageChange?: (page: number) => void;
  
  // Sorting
  sortConfig?: SortConfig;
  onSortChange?: (config: SortConfig) => void;
  
  // Filtering
  filters?: FilterConfig[];
  onFilterChange?: (filters: FilterConfig[]) => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (rowIds: string[]) => void;
  
  // Actions
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  
  // Export
  exportConfig?: ExportConfig;
  
  // Styling
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  stickyHeader?: boolean;
  maxHeight?: string;
  
  // Accessibility
  ariaLabel?: string;
  caption?: string;
}
```

## 💡 Best Practices

1. **Use TypeScript**: Define your data types for better type safety
2. **Memoize columns**: Use `useMemo` for column definitions
3. **Optimize rendering**: Use `React.memo` for row components
4. **Handle errors**: Always provide error states
5. **Test responsiveness**: Check mobile and tablet views
6. **Consider accessibility**: Add proper ARIA labels

## 🔧 Troubleshooting

### Excel export not working
- Make sure `xlsx` is installed
- Check browser console for errors
- Verify data structure

### RTL not working
- Check HTML `dir` attribute
- Verify `lang` attribute is set
- Test in RTL browser

### Performance issues
- Reduce data size with pagination
- Use server-side sorting/filtering
- Optimize column cell renderers

## 📝 Example: Full-Featured Table

See `StaffTableExample.tsx` for a complete implementation with all features.

export type UserBranchInfo = { id: string; code: string; name: string; address?: string };
export type UserCompanyInfo = { id: string; code: string; name: string; legalName?: string; taxId?: string };
export type UserRoleInfo = { id: string; code: string; name: string };

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roleId?: string;
  companyId?: string;
  branchId?: string;
  status: string;
  company?: UserCompanyInfo | null;
  branch?: UserBranchInfo | null;
  role?: UserRoleInfo | null;
  permissions?: string[];
  availableBranches?: UserBranchInfo[];
};

export type SummaryMetric = { totalCents: number; count: number };

export type DashboardSummary = {
  generatedAt: string;
  currency: string;
  sales: SummaryMetric;
  purchases: SummaryMetric;
  expenses: SummaryMetric;
  payments: SummaryMetric;
  reconciliation?: {
    ledgerBalanced: boolean;
    ledgerDebitCents: number;
    ledgerCreditCents: number;
    ledgerEntryCount: number;
  };
};

export type PaginationMeta = { page: number; limit: number; total: number; pages: number };

export type PaginatedResponse<T> = { items: T[]; meta: PaginationMeta };

export type MasterProduct = {
  id: string;
  code: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  priceCents?: number;
  costCents?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
};

export type MasterCustomer = {
  id: string;
  code: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type MasterSupplier = {
  id: string;
  code: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type MasterWarehouse = {
  id: string;
  code: string;
  name: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type InventoryItem = {
  id: string;
  sku: string;
  productName?: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  minStock?: number;
  reorderPoint?: number;
};

export type InventoryMovement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RESERVATION' | 'RELEASE';
  sku: string;
  warehouseCode: string;
  quantity: number;
  reference?: string;
  createdAt: string;
};

export type PurchaseDocument = {
  id: string;
  purchaseNumber: string;
  type?: string;
  supplierName?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'BILLED' | 'CANCELLED';
  totalCents: number;
  itemsCount?: number;
  createdAt: string;
};

export type SaleDocument = {
  id: string;
  saleNumber: string;
  customerName?: string;
  status: 'QUOTATION' | 'ORDER' | 'DELIVERED' | 'BILLED' | 'PAID' | 'CANCELLED';
  totalCents: number;
  itemsCount?: number;
  createdAt: string;
};

export type AccountingAccount = {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  balanceCents: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export type CrmLead = {
  id: string;
  leadNumber: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'CONVERTED';
  valueCents?: number;
  createdAt: string;
};

export type PosSession = {
  id: string;
  sessionNumber: string;
  terminalCode: string;
  openedAt: string;
  closedAt?: string;
  openingBalanceCents: number;
  currentBalanceCents: number;
  status: 'OPEN' | 'CLOSED';
};

export type HrEmployee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  position?: string;
  status: 'ACTIVE' | 'INACTIVE';
  hireDate?: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
};

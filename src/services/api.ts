const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('rephonix_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP error! Status: ${res.status}`);
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },

  // Dashboard
  dashboard: {
    getStats: () => request('/dashboard/stats'),
  },

  // Products
  products: {
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/products${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request(`/products/${id}`),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
    importCsv: (items: any[]) => request('/products/import-csv', { method: 'POST', body: JSON.stringify({ items }) }),
  },

  // Inventory
  inventory: {
    getMovements: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/inventory/movements${qs ? `?${qs}` : ''}`);
    },
    adjustStock: (data: any) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
    getAlerts: () => request('/inventory/alerts'),
  },

  // POS Billing
  pos: {
    lookup: (query: string) => request(`/pos/lookup?query=${encodeURIComponent(query)}`),
    checkout: (data: any) => request('/pos/checkout', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Sales History
  sales: {
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/sales${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request(`/sales/${id}`),
    refund: (id: string, reason: string) =>
      request(`/sales/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },

  // Categories
  categories: {
    getAll: () => request('/categories'),
    create: (data: any) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),
  },

  // Suppliers & Purchases
  suppliers: {
    getAll: () => request('/suppliers'),
    create: (data: any) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/suppliers/${id}`, { method: 'DELETE' }),
    getPurchases: () => request('/suppliers/purchases'),
    createPurchase: (data: any) => request('/suppliers/purchases', { method: 'POST', body: JSON.stringify(data) }),
    receiveStock: (id: string) => request(`/suppliers/purchases/${id}/receive`, { method: 'POST' }),
  },

  // Customers
  customers: {
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/customers${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => request(`/customers/${id}`),
    create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Reports
  reports: {
    getSalesSummary: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/reports/sales-summary${qs ? `?${qs}` : ''}`);
    },
    getInventoryValuation: () => request('/reports/inventory-valuation'),
    getProductSales: () => request('/reports/product-sales'),
  },

  // Settings
  settings: {
    get: () => request('/settings'),
    update: (data: any) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    resetDatabase: () => request('/settings/reset-database', { method: 'POST' }),
  },

  // Users & RBAC
  users: {
    getAll: () => request('/users'),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    toggleStatus: (id: string) => request(`/users/${id}/toggle-status`, { method: 'PUT' }),
    getAuditLogs: () => request('/users/audit-logs'),
  },

  // Tracked Device Units & Barcode IMEI Scanner
  devices: {
    lookup: (code: string) => request(`/devices/lookup?code=${encodeURIComponent(code)}`),
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/devices${qs ? `?${qs}` : ''}`);
    },
    create: (data: any) => request('/devices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    markSold: (id: string, data: any = {}) => request(`/devices/${id}/mark-sold`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/devices/${id}`, { method: 'DELETE' }),
  },

  // Hardware Direct TSPL Printing
  print: {
    directTSPL: (data: { items: any[]; printerName?: string; gapMM?: number; labelSize?: string; widthMM?: number; heightMM?: number }) =>
      request('/print/direct-tspl', { method: 'POST', body: JSON.stringify(data) }),
  },
};

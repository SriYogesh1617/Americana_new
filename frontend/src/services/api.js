import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || error);
  }
);

// Upload API
export const uploadAPI = {
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  },
  
  getUploadStatus: (fileId) => api.get(`/upload/status/${fileId}`),
  getUploads: (page = 1, limit = 20) => api.get(`/upload?page=${page}&limit=${limit}`),
};

// Data API
export const dataAPI = {
  // Workbooks
  getWorkbooks: (page = 1, limit = 20) => api.get(`/data/workbooks?page=${page}&limit=${limit}`),
  getWorkbook: (workbookId) => api.get(`/data/workbooks/${workbookId}`),
  
  // Worksheets
  getWorksheets: (workbookId) => api.get(`/data/workbooks/${workbookId}/worksheets`),
  getWorksheet: (worksheetId, page = 1, limit = 1000) => 
    api.get(`/data/worksheets/${worksheetId}?page=${page}&limit=${limit}`),
  getWorksheetRange: (worksheetId, startRow, endRow, startCol, endCol) => 
    api.get(`/data/worksheets/${worksheetId}/range?startRow=${startRow}&endRow=${endRow}&startCol=${startCol}&endCol=${endCol}`),
  getWorksheetHeaders: (worksheetId) => api.get(`/data/worksheets/${worksheetId}/headers`),
  getFormulaCells: (worksheetId) => api.get(`/data/worksheets/${worksheetId}/formulas`),
  searchWorksheet: (worksheetId, query) => api.get(`/data/worksheets/${worksheetId}/search?query=${encodeURIComponent(query)}`),
  
  // Cells
  getCellData: (worksheetId, row, col) => api.get(`/data/worksheets/${worksheetId}/cells/${row}/${col}`),
  updateCellData: (worksheetId, row, col, data) => api.put(`/data/worksheets/${worksheetId}/cells/${row}/${col}`, data),
  getRowData: (worksheetId, row) => api.get(`/data/worksheets/${worksheetId}/rows/${row}`),
  getColumnData: (worksheetId, col) => api.get(`/data/worksheets/${worksheetId}/columns/${col}`),
  
  // Dashboard
  getDashboardStats: () => api.get('/data/dashboard/stats'),
  getRecentActivities: (limit = 10) => api.get(`/data/dashboard/activities?limit=${limit}`),
  getMonthlyStats: (month) => api.get(`/data/monthly-stats?month=${month}`),
  
  // Database
  getAllWorksheets: (page = 1, limit = 20) => api.get(`/data/worksheets?page=${page}&limit=${limit}`),
  getDatabaseSchema: () => api.get('/data/schema'),
  
  // Monthly View
  getMonthlyUploads: (month) => api.get(`/data/monthly-uploads?month=${month}`),
  getMonthlyWorkbooks: (month) => api.get(`/data/monthly-workbooks?month=${month}`),
};

// Export API
export const exportAPI = {
  exportWorkbook: (workbookId, format = 'xlsx') => {
    return api.get(`/export/workbooks/${workbookId}?format=${format}`, {
      responseType: 'blob',
    });
  },
  
  exportWorksheet: (worksheetId, format = 'xlsx') => {
    return api.get(`/export/worksheets/${worksheetId}?format=${format}`, {
      responseType: 'blob',
    });
  },
  
  getExportHistory: (workbookId, page = 1, limit = 20) => 
    api.get(`/export/workbooks/${workbookId}/history?page=${page}&limit=${limit}`),
  
  // Macro calculations
  createMacroCalculation: (workbookId, data) => api.post(`/export/workbooks/${workbookId}/macros`, data),
  getMacroCalculations: (workbookId) => api.get(`/export/workbooks/${workbookId}/macros`),
  executeMacroCalculation: (calculationId) => api.post(`/export/macros/${calculationId}/execute`),
};

// Demand Template API
export const demandAPI = {
  createDemandTemplate: (data) => api.post('/demand/templates', data),
  getDemandTemplates: () => api.get('/demand/templates'),
  getDemandTemplate: (templateId) => api.get(`/demand/templates/${templateId}`),
  executeDemandTemplate: (templateId, month, year) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    return api.post(`/demand/templates/${templateId}/execute?${params.toString()}`, {}, {
      responseType: 'blob',
    });
  },
  getDemandExportHistory: () => api.get('/demand/export-history'),
  checkMonthData: (month, year) => api.get(`/demand/check-month?month=${month}&year=${year}`),
  
  // Demand filtered cursor API
  createFilteredDemandCursor: (data) => api.post('/demand/cursor', data),
  getDemandCursorStats: (data) => api.post('/demand/cursor/stats', data),
  exportFilteredDemandData: (data) => api.post('/demand/cursor/export', data, {
    responseType: 'blob',
  }),
  
  // New filtered demand data API
  getFilteredDemandData: (params) => api.get(`/demand/filtered-data?${new URLSearchParams(params)}`),
  getFilteredDemandStats: () => api.get('/demand/filtered-data/stats'),
};

// Cursor API for specific sheet tables
export const cursorAPI = {
  // Demand cursor
  getDemandCursorData: (params = {}) => api.get('/cursor/demand', { params }),
  getDemandCursorDataAsArray: (worksheetId) => api.get(`/cursor/demand/${worksheetId}/array`),
  
  // Demand Country Master cursor
  getDemandCountryMasterCursorData: (params = {}) => api.get('/cursor/demand-country-master', { params }),
  getDemandCountryMasterCursorDataAsArray: (worksheetId) => api.get(`/cursor/demand-country-master/${worksheetId}/array`),
  
  // Base Scenario Configuration cursor
  getBaseScenarioConfigurationCursorData: (params = {}) => api.get('/cursor/base-scenario-configuration', { params }),
  getBaseScenarioConfigurationCursorDataAsArray: (worksheetId) => api.get(`/cursor/base-scenario-configuration/${worksheetId}/array`),
  
  // Statistics and management
  getCursorStats: () => api.get('/cursor/stats'),
  getUploadBatches: () => api.get('/cursor/upload-batches'),
  clearAllCursorData: () => api.delete('/cursor/clear'),
};

// T01 API for calculated data
export const t01API = {
  // Calculate T01 data from cursor tables
  calculateT01Data: (uploadBatchId) => api.post('/t01/calculate', { uploadBatchId }),
  
  // Get T01 data
  getT01Data: (params = {}) => api.get('/t01/data', { params }),
  getT01DataAsArray: (uploadBatchId) => api.get(`/t01/data/array?uploadBatchId=${uploadBatchId}`),
  
  // Export T01 data to Excel
  exportT01ToExcel: (uploadBatchId) => api.get(`/t01/export?uploadBatchId=${uploadBatchId}`, {
    responseType: 'blob',
  }),
  
  // Statistics and management
  getT01Stats: () => api.get('/t01/stats'),
  clearAllT01Data: () => api.delete('/t01/clear'),
};

export const t02API = {
  calculateT02Data: (uploadBatchId) => api.post('/t02/calculate', { uploadBatchId }),
  getT02Data: (params) => api.get('/t02/data', { params }),
  getT02Stats: () => api.get('/t02/stats'),
  clearT02Data: () => api.delete('/t02/clear'),
  getT02DataAsArray: (params) => api.get('/t02/data/array', { params }),
  exportT02ToExcel: (uploadBatchId) => api.get(`/t02/export?uploadBatchId=${uploadBatchId}`, {
    responseType: 'blob',
  })
};

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api; 
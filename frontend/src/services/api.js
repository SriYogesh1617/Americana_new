import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
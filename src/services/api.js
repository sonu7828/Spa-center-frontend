/**
 * Centralized API Client for OMEGA SPA POS
 * Connects frontend to backend REST APIs on http://localhost:5000/api/v1
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000/api/v1';

export function getToken() {
  return localStorage.getItem('omega_token') || localStorage.getItem('token') || null;
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('omega_token', token);
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('omega_token');
    localStorage.removeItem('token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const url = endpoint.startsWith('http') ? endpoint : API_BASE_URL + (endpoint.startsWith('/') ? '' : '/') + endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || (typeof data === 'string' ? data : 'HTTP ' + response.status);
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[API Error] ' + (options.method || 'GET') + ' ' + endpoint + ':', error);
    throw error;
  }
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest('/auth/me'),
};

export const usersApi = {
  getAll: () => apiRequest('/users'),
  getById: (id) => apiRequest('/users/' + id),
  create: (data) =>
    apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, updates) =>
    apiRequest('/users/' + id, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  delete: (id) =>
    apiRequest('/users/' + id, {
      method: 'DELETE',
    }),
};

export const specialtiesApi = {
  getAll: () => apiRequest('/specialties'),
  getById: (id) => apiRequest('/specialties/' + id),
  create: (data) =>
    apiRequest('/specialties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, updates) =>
    apiRequest('/specialties/' + id, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  delete: (id) =>
    apiRequest('/specialties/' + id, {
      method: 'DELETE',
    }),
};

export const servicesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/services' + (query ? '?' + query : ''));
  },
  getById: (id) => apiRequest('/services/' + id),
  create: (data) =>
    apiRequest('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, updates) =>
    apiRequest('/services/' + id, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  delete: (id) =>
    apiRequest('/services/' + id, {
      method: 'DELETE',
    }),
};

export const clientsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/clients' + (query ? '?' + query : ''));
  },
  getById: (id) => apiRequest('/clients/' + id),
  create: (clientData) =>
    apiRequest('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    }),
  update: (id, updates) =>
    apiRequest('/clients/' + id, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  setStatus: (id, status) =>
    apiRequest('/clients/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  activate: (id) =>
    apiRequest('/clients/' + id + '/activate', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  deactivate: (id) =>
    apiRequest('/clients/' + id + '/deactivate', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getHistory: (id) => apiRequest('/clients/' + id + '/history'),
  addMedia: (clientId, mediaData) =>
    apiRequest('/clients/' + clientId + '/media', {
      method: 'POST',
      body: JSON.stringify(mediaData),
    }),
  getServiceCompletion: (appointmentServiceId) =>
    apiRequest('/service-completion/' + appointmentServiceId),
};

export const appointmentsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/appointments' + (query ? '?' + query : ''));
  },
  getById: (id) => apiRequest('/appointments/' + id),
  create: (appointmentData) =>
    apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    }),
  update: (id, data) =>
    apiRequest('/appointments/' + id, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updateStatus: (id, data) =>
    apiRequest('/appointments/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  changeStatus: (id, data) =>
    apiRequest('/appointments/' + id + '/status', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  reschedule: (id, data) =>
    apiRequest('/appointments/' + id + '/reschedule', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  completeService: (appointmentServiceId, data = {}) =>
    apiRequest('/service-completion/' + appointmentServiceId, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cancel: (id) =>
    apiRequest('/appointments/' + id + '/cancel', {
      method: 'PATCH',
    }),
};

export const invoicesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/invoices' + (query ? '?' + query : ''));
  },
  getPending: () => apiRequest('/invoices/pending'),
  getById: (id) => apiRequest('/invoices/' + id),
  create: (data) => {
    let payload;
    if (typeof data === 'string') {
      payload = { appointmentId: data };
    } else if (data && typeof data === 'object') {
      const rawAptId = data.appointmentId !== undefined ? data.appointmentId : data.id;
      const aptId =
        rawAptId && typeof rawAptId === 'object'
          ? rawAptId.appointmentId || rawAptId.id || String(rawAptId)
          : rawAptId;

      payload = {
        ...(aptId ? { appointmentId: aptId } : {}),
        ...(data.clientId ? { clientId: data.clientId } : {}),
        discount: typeof data.discount === 'number' ? data.discount : 0,
        status: data.status || 'PENDING_PAYMENT',
        ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.retailProducts ? { retailProducts: data.retailProducts } : {}),
      };
    } else {
      payload = data;
    }

    return apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  update: (id, data) =>
    apiRequest('/invoices/' + id, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  addRetailItem: (invoiceId, data) =>
    apiRequest('/invoices/' + invoiceId + '/retail-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const paymentsApi = {
  create: (paymentData) =>
    apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/payments' + (query ? '?' + query : ''));
  },
};

export const stockApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/stock' + (query ? '?' + query : ''));
  },
  getById: (id) => apiRequest(`/stock/${id}`),
  create: (data) =>
    apiRequest('/stock', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  refill: (id, refillData) =>
    apiRequest(`/stock/${id}/refill`, {
      method: 'POST',
      body: JSON.stringify(refillData),
    }),
  adjust: (id, adjustData) =>
    apiRequest(`/stock/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(adjustData),
    }),
  update: (id, data) =>
    apiRequest(`/stock/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getActivity: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/stock/activity' + (query ? '?' + query : ''));
  },
  getRetail: () => apiRequest('/stock/retail'),
  createRetail: (data) =>
    apiRequest('/stock/retail', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  refillRetail: (id, refillData) =>
    apiRequest(`/stock/retail/${id}/refill`, {
      method: 'POST',
      body: JSON.stringify(refillData),
    }),
  deductRetail: (data) =>
    apiRequest('/stock/retail/deduct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const commissionsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/commissions' + (query ? '?' + query : ''));
  },
  getTechnicianSummary: (technicianId) => apiRequest('/commissions/' + technicianId),
  getRules: () => apiRequest('/commissions/rules'),
  saveRule: (ruleData) =>
    apiRequest('/commissions/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData),
    }),
  addBonus: (commissionId, data) =>
    apiRequest('/commissions/' + commissionId + '/bonus', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adjust: (commissionId, data) =>
    apiRequest('/commissions/' + commissionId + '/adjust', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  approve: (commissionId) =>
    apiRequest('/commissions/' + commissionId + '/approve', {
      method: 'POST',
    }),
};

export const loyaltyApi = {
  getSettings: () => apiRequest('/loyalty/settings'),
  updateSettings: (settingsData) =>
    apiRequest('/loyalty/settings', {
      method: 'PATCH',
      body: JSON.stringify(settingsData),
    }),
  getClientLoyalty: (clientId) => apiRequest('/loyalty/clients/' + clientId),
  getClientPoints: (clientId) => apiRequest('/loyalty/clients/' + clientId),
  awardReward: (clientId, rewardData) =>
    apiRequest('/loyalty/clients/' + clientId + '/reward', {
      method: 'POST',
      body: JSON.stringify(rewardData),
    }),
  getUpcomingRewards: (days = 30) => apiRequest('/loyalty/rewards/upcoming?days=' + days),
  adjustPoints: (clientId, adjustData) =>
    apiRequest('/loyalty/clients/' + clientId + '/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustData),
    }),
  redeem: (invoiceId, redeemData) =>
    apiRequest('/loyalty/invoices/' + invoiceId + '/redeem', {
      method: 'POST',
      body: JSON.stringify(redeemData),
    }),
  getRebooking: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/loyalty/rebooking' + (query ? '?' + query : ''));
  },
};

function buildReportQuery(params = 'today') {
  if (!params) return '?period=today';
  if (typeof params === 'string') return '?period=' + encodeURIComponent(params);
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, val);
    }
  });
  const qs = searchParams.toString();
  return qs ? '?' + qs : '';
}

export const reportsApi = {
  getDashboard: (params = 'today') => apiRequest('/reports/dashboard' + buildReportQuery(params)),
  getRevenue: (params = 'today') => apiRequest('/reports/revenue' + buildReportQuery(params)),
  getAppointments: (params = 'today') => apiRequest('/reports/appointments' + buildReportQuery(params)),
  getTopServices: (params = 'today') => apiRequest('/reports/top-services' + buildReportQuery(params)),
  getTechnicians: (params = 'today') => apiRequest('/reports/technicians' + buildReportQuery(params)),
  getMyPerformance: (params = 'today') => apiRequest('/reports/technicians/me' + buildReportQuery(params)),
  getTechnicianMe: (params = 'today') => apiRequest('/reports/technicians/me' + buildReportQuery(params)),
  getTechnician: (id, params = 'today') => apiRequest('/reports/technicians/' + id + buildReportQuery(params)),
  getStockConsumption: (params = 'today') => apiRequest('/reports/stock-consumption' + buildReportQuery(params)),
  getCustomers: (params = 'today') => apiRequest('/reports/customers' + buildReportQuery(params)),
};

export const whatsappApi = {
  getAutomations: () => apiRequest('/whatsapp/automations'),
  getAutomationByType: (type) => apiRequest('/whatsapp/automations/' + type),
  updateAutomation: (type, data) =>
    apiRequest('/whatsapp/automations/' + type, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getLogs: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    return apiRequest('/whatsapp/logs' + (qs ? '?' + qs : ''));
  },
  processReminders: (data = {}) =>
    apiRequest('/whatsapp/triggers/process-reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  triggerDailyClose: (data = {}) =>
    apiRequest('/whatsapp/triggers/daily-close', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  triggerRebooking: (data = {}) =>
    apiRequest('/whatsapp/triggers/rebooking-reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  triggerCelebrations: (data = {}) =>
    apiRequest('/whatsapp/triggers/celebrations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  triggerPaymentConfirmation: (invoiceId) =>
    apiRequest('/whatsapp/triggers/payment-confirmation', {
      method: 'POST',
      body: JSON.stringify({ invoiceId }),
    }),
  triggerAfterService: (appointmentId) =>
    apiRequest('/whatsapp/triggers/after-service', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    }),
  sendMessage: (data) =>
    apiRequest('/whatsapp/triggers/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  retryMessage: (logId) =>
    apiRequest('/whatsapp/logs/' + logId + '/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};

export const expensesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/expenses' + (query ? '?' + query : ''));
  },
  create: (data) =>
    apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest('/expenses/' + id, {
      method: 'DELETE',
    }),
};

export const uploadsApi = {
  uploadImage: (image, filename) => {
    if (typeof FormData !== 'undefined' && image instanceof FormData) {
      return apiRequest('/media/upload/client', {
        method: 'POST',
        body: image,
      });
    }
    return apiRequest('/uploads', {
      method: 'POST',
      body: JSON.stringify({ image, filename }),
    });
  },
};

export const mediaApi = {
  uploadClientMedia: (formData) =>
    apiRequest('/media/upload/client', {
      method: 'POST',
      body: formData,
    }),
  uploadAttendancePhoto: (formData) =>
    apiRequest('/media/upload/attendance', {
      method: 'POST',
      body: formData,
    }),
  uploadCleaningPhoto: (formData) =>
    apiRequest('/media/upload/cleaning', {
      method: 'POST',
      body: formData,
    }),
  getCleaningRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/media/cleaning' + (query ? '?' + query : ''));
  },
  deleteCleaningRecord: (id) =>
    apiRequest('/media/cleaning/' + id, {
      method: 'DELETE',
    }),
  getClientMedia: (clientId) => apiRequest('/media/client/' + clientId),
  deleteClientMedia: (id) =>
    apiRequest('/media/client/' + id, {
      method: 'DELETE',
    }),
};

export const attendanceApi = {
  clockIn: (data) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiRequest('/attendance/clock-in', {
        method: 'POST',
        body: data,
      });
    }
    return apiRequest('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  clockOut: (data = {}) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiRequest('/attendance/clock-out', {
        method: 'POST',
        body: data,
      });
    }
    return apiRequest('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getToday: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/attendance/today' + (query ? '?' + query : ''));
  },
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest('/attendance' + (query ? '?' + query : ''));
  },
  manualEntry: (data) => {
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      return apiRequest('/attendance/manual', {
        method: 'POST',
        body: data,
      });
    }
    return apiRequest('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
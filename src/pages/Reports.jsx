/**
 * Reports — Service Performance Analytics Screen
 * 
 * Provides deep insights into services performed by clients:
 *   1. Best Performers (Top selling services)
 *   2. Worst Performers (Low volume services with 1+ bookings)
 *   3. Ignored - 0% (Services nobody ever booked in the period)
 * 
 * Shows for each service:
 *   - Service Name (& Category)
 *   - How many times sold
 *   - Total money made (FCFA)
 *   - How many clients bought it (Unique clients)
 * 
 * Accessible strictly to MANAGER and RECEPTION.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Calendar,
  Search,
  RefreshCw,
  Award,
  Users,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
  BarChart2,
  Filter,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { reportsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatFCFA(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-US') + ' FCFA';
}

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [customRange, setCustomRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [activeTab, setActiveTab] = useState('BEST'); // 'BEST' | 'WORST' | 'IGNORED'
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'volume'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    kpi: {
      totalCatalogServices: 0,
      performingServicesCount: 0,
      ignoredServicesCount: 0,
      totalServiceRevenue: 0,
      totalTimesSold: 0,
      totalUniqueClients: 0,
    },
    bestPerformers: [],
    worstPerformers: [],
    ignoredServices: [],
  });

  const fetchPerformanceReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams =
        period === 'custom'
          ? { period: 'custom', startDate: customRange.startDate, endDate: customRange.endDate }
          : period;

      const res = await reportsApi.getServicePerformance(queryParams);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch service performance report:', err.message);
      setError(err.message || 'Could not load service performance report');
    } finally {
      setLoading(false);
    }
  }, [period, customRange]);

  useEffect(() => {
    fetchPerformanceReport();
  }, [fetchPerformanceReport]);

  // Extract distinct categories for filter
  const categories = useMemo(() => {
    const set = new Set();
    [...(data.bestPerformers || []), ...(data.worstPerformers || []), ...(data.ignoredServices || [])].forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [data]);

  // Current active list based on selected tab
  const currentList = useMemo(() => {
    let list = [];
    if (activeTab === 'BEST') list = data.bestPerformers || [];
    else if (activeTab === 'WORST') list = data.worstPerformers || [];
    else if (activeTab === 'IGNORED') list = data.ignoredServices || [];

    return list.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.serviceName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;

      return matchSearch && matchCat;
    });
  }, [activeTab, data, searchQuery, categoryFilter]);

  // Chart data: Top 6 items for visual comparison bar
  const chartItems = useMemo(() => {
    const list = activeTab === 'BEST' ? data.bestPerformers : activeTab === 'WORST' ? data.worstPerformers : [];
    return (list || []).slice(0, 6);
  }, [activeTab, data]);

  const maxChartValue = useMemo(() => {
    if (chartItems.length === 0) return 1;
    if (chartMetric === 'revenue') {
      return Math.max(...chartItems.map((it) => it.totalRevenue), 1);
    }
    return Math.max(...chartItems.map((it) => it.timesSold), 1);
  }, [chartItems, chartMetric]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Service Reports"
        subtitle="Performance analytics for services performed by clients (Last 30 Days)"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Period Buttons */}
            <div className="flex items-center bg-white border border-[#E8E2D9] rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === 'weekly' || period === '7d' ? 'bg-[#5B6E58] text-white shadow-xs' : 'text-[#7D7871] hover:text-[#2D2D2A]'
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === 'monthly' || period === '30d' ? 'bg-[#5B6E58] text-white shadow-xs' : 'text-[#7D7871] hover:text-[#2D2D2A]'
                }`}
              >
                ⭐ Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === 'monthly' ? 'bg-[#5B6E58] text-white shadow-xs' : 'text-[#7D7871] hover:text-[#2D2D2A]'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setPeriod('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  period === 'custom' ? 'bg-[#5B6E58] text-white shadow-xs' : 'text-[#7D7871] hover:text-[#2D2D2A]'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchPerformanceReport}
              disabled={loading}
              className="p-2 text-[#7D7871] hover:text-[#2D2D2A] bg-white border border-[#E8E2D9] hover:bg-[#F6F1EB] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh Report"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin text-[#5B6E58]' : ''} />
            </button>
          </div>
        }
      />

      {/* Custom Date Range Picker Strip if Custom selected */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#E8E2D9] rounded-2xl shadow-xs">
          <Calendar size={18} className="text-[#5B6E58]" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#7D7871]">From:</span>
            <input
              type="date"
              value={customRange.startDate}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="text-xs px-2.5 py-1.5 border border-[#E8E2D9] rounded-lg bg-[#FAF8F5] text-[#2D2D2A]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#7D7871]">To:</span>
            <input
              type="date"
              value={customRange.endDate}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="text-xs px-2.5 py-1.5 border border-[#E8E2D9] rounded-lg bg-[#FAF8F5] text-[#2D2D2A]"
            />
          </div>
          <Button
            size="sm"
            onClick={fetchPerformanceReport}
            className="text-xs px-3 py-1.5 bg-[#5B6E58] hover:bg-[#4A5A47] text-white rounded-lg"
          >
            Apply Filter
          </Button>
        </div>
      )}

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Catalog Services */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-[#7D7871] uppercase">Catalog Services</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0EBE1] flex items-center justify-center text-[#5B6E58]">
              <Layers size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#2D2D2A]">
              {data.kpi?.totalCatalogServices || 0}
            </div>
            <p className="text-xs text-[#7D7871] mt-0.5">Active spa treatments in menu</p>
          </div>
        </div>

        {/* Total Revenue Generated */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-[#7D7871] uppercase">Service Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#2D2D2A] truncate">
              {formatFCFA(data.kpi?.totalServiceRevenue || 0)}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {data.kpi?.totalTimesSold || 0} services performed
            </p>
          </div>
        </div>

        {/* Active Performing Services */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-[#7D7871] uppercase">Active Performing</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Activity size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#2D2D2A]">
              {data.kpi?.performingServicesCount || 0}
            </div>
            <p className="text-xs text-[#7D7871] mt-0.5">
              Booked by {data.kpi?.totalUniqueClients || 0} unique clients
            </p>
          </div>
        </div>

        {/* Ignored 0% Services */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-[#7D7871] uppercase">Ignored (0 Bookings)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertOctagon size={17} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-rose-600">
              {data.kpi?.ignoredServicesCount || 0}
            </div>
            <p className="text-xs text-[#7D7871] mt-0.5">Zero bookings in selected period</p>
          </div>
        </div>
      </div>

      {/* Main Analysis Card with 3 Tabs */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-[#E8E2D9] bg-[#FAF8F5] px-4 pt-3 sm:px-6">
          <div className="flex space-x-2 overflow-x-auto pb-3 sm:pb-0 scrollbar-none">
            {/* Tab 1: Best Performers */}
            <button
              type="button"
              onClick={() => setActiveTab('BEST')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'BEST'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-[#7D7871] hover:text-[#2D2D2A]'
              }`}
            >
              <TrendingUp size={16} className={activeTab === 'BEST' ? 'text-emerald-600' : 'text-[#7D7871]'} />
              <span>1. Best Performers</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                {data.bestPerformers?.length || 0}
              </span>
            </button>

            {/* Tab 2: Worst Performers */}
            <button
              type="button"
              onClick={() => setActiveTab('WORST')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'WORST'
                  ? 'border-amber-500 text-amber-800 bg-white shadow-xs'
                  : 'border-transparent text-[#7D7871] hover:text-[#2D2D2A]'
              }`}
            >
              <TrendingDown size={16} className={activeTab === 'WORST' ? 'text-amber-500' : 'text-[#7D7871]'} />
              <span>2. Worst Performers</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                {data.worstPerformers?.length || 0}
              </span>
            </button>

            {/* Tab 3: Ignored - 0% */}
            <button
              type="button"
              onClick={() => setActiveTab('IGNORED')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'IGNORED'
                  ? 'border-rose-500 text-rose-800 bg-white shadow-xs'
                  : 'border-transparent text-[#7D7871] hover:text-[#2D2D2A]'
              }`}
            >
              <AlertOctagon size={16} className={activeTab === 'IGNORED' ? 'text-rose-500' : 'text-[#7D7871]'} />
              <span>3. Ignored - 0%</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
                {data.ignoredServices?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Context Strip / Description */}
        <div className="px-4 py-3 sm:px-6 bg-[#FCFBF9] border-b border-[#E8E2D9] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#7D7871] leading-relaxed">
            {activeTab === 'BEST' && (
              <>
                <strong className="text-emerald-700">Top revenue & booking drivers:</strong> These treatments generate
                the highest volume and money. Keep inventory stocked and promote them.
              </>
            )}
            {activeTab === 'WORST' && (
              <>
                <strong className="text-amber-700">Lowest demand services:</strong> Performed at least 1 time, but have
                the lowest volume. Consider promotional discounts or bundle packages.
              </>
            )}
            {activeTab === 'IGNORED' && (
              <>
                <strong className="text-rose-700">Zero booking alert:</strong> Active catalog services that nobody booked
                in the last 30 days. Useful for cleaning up the menu or launching targeted marketing campaigns.
              </>
            )}
          </p>

          {/* Search and Category Filter Inputs */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7D7871]" />
              <input
                type="text"
                placeholder="Search service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E8E2D9] rounded-xl bg-white focus:outline-none focus:border-[#5B6E58]"
              />
            </div>

            {/* Category Dropdown */}
            {categories.length > 2 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-[#E8E2D9] rounded-xl bg-white text-[#2D2D2A] focus:outline-none focus:border-[#5B6E58]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Visual Comparison Chart (For Best & Worst Performers) */}
        {(activeTab === 'BEST' || activeTab === 'WORST') && chartItems.length > 0 && (
          <div className="p-4 sm:p-6 border-b border-[#E8E2D9] bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className={activeTab === 'BEST' ? 'text-emerald-600' : 'text-amber-500'} />
                <h3 className="text-xs sm:text-sm font-bold text-[#2D2D2A] uppercase tracking-wide">
                  {activeTab === 'BEST' ? 'Top Performing Services Graph' : 'Lowest Demand Services Graph'}
                </h3>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E8E2D9] rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMetric('revenue')}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    chartMetric === 'revenue' ? 'bg-white shadow-xs text-[#2D2D2A]' : 'text-[#7D7871]'
                  }`}
                >
                  By Revenue (FCFA)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('volume')}
                  className={`px-2 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                    chartMetric === 'volume' ? 'bg-white shadow-xs text-[#2D2D2A]' : 'text-[#7D7871]'
                  }`}
                >
                  By Times Sold
                </button>
              </div>
            </div>

            {/* Horizontal Visual Comparison Bars */}
            <div className="space-y-3.5">
              {chartItems.map((item, idx) => {
                const val = chartMetric === 'revenue' ? item.totalRevenue : item.timesSold;
                const percentage = Math.min(100, Math.max(12, Math.round((val / maxChartValue) * 100)));
                const barColor = activeTab === 'BEST' ? 'bg-emerald-500' : 'bg-amber-400';

                return (
                  <div key={item.serviceId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#2D2D2A] truncate max-w-[70%]">
                        #{idx + 1} {item.serviceName}
                        <span className="text-[11px] font-normal text-[#7D7871] ml-2">({item.category})</span>
                      </span>
                      <span className="font-bold text-[#2D2D2A]">
                        {chartMetric === 'revenue' ? formatFCFA(item.totalRevenue) : `${item.timesSold} times`}
                        <span className="text-[11px] font-normal text-[#7D7871] ml-1.5">
                          ({item.uniqueClients} clients)
                        </span>
                      </span>
                    </div>

                    <div className="w-full h-3 bg-[#F0EBE1] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Breakdown Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-[#7D7871]">
              <RefreshCw size={24} className="animate-spin mx-auto text-[#5B6E58] mb-2" />
              <p className="text-sm font-medium">Analyzing service performance records...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-[#7D7871]">
              <Sparkles size={28} className="mx-auto text-[#C2BBA8] mb-2" />
              <p className="text-sm font-medium">No services found in this category for the selected date range.</p>
              {searchQuery && <p className="text-xs text-[#7D7871] mt-1">Try clearing your search query.</p>}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8E2D9] text-[11px] font-bold text-[#7D7871] uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6 w-14">Rank</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Times Sold</th>
                  <th className="py-3 px-4 text-right">Total Money Made</th>
                  <th className="py-3 px-4 sm:px-6 text-center">Unique Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9] text-xs">
                {currentList.map((item, index) => {
                  const isIgnored = activeTab === 'IGNORED';
                  const isBest = activeTab === 'BEST';

                  return (
                    <tr
                      key={item.serviceId}
                      className="hover:bg-[#FAF8F5]/80 transition-colors group"
                    >
                      {/* Rank / Status */}
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-[#2D2D2A]">
                        {isIgnored ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            0%
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 && isBest
                                ? 'bg-amber-100 text-amber-800'
                                : index === 1 && isBest
                                ? 'bg-slate-200 text-slate-800'
                                : index === 2 && isBest
                                ? 'bg-amber-50 text-amber-700'
                                : 'text-[#7D7871]'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        )}
                      </td>

                      {/* Service Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#2D2D2A] text-sm group-hover:text-[#5B6E58] transition-colors">
                          {item.serviceName}
                        </div>
                        <div className="text-[11px] text-[#7D7871] mt-0.5">
                          Standard price: {formatFCFA(item.price)}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F0EBE1] text-[#2D2D2A]">
                          {item.category || 'General'}
                        </span>
                      </td>

                      {/* Times Sold */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs ${
                            item.timesSold > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {item.timesSold} times
                        </span>
                      </td>

                      {/* Total Money Made */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-sm text-[#2D2D2A]">
                          {formatFCFA(item.totalRevenue)}
                        </div>
                        {item.totalRevenue > 0 && (
                          <div className="text-[11px] text-emerald-600 font-medium">
                            {item.revenuePercentage}% of total revenue
                          </div>
                        )}
                      </td>

                      {/* How Many Clients Bought It */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-xs font-semibold text-[#2D2D2A]">
                          <Users size={12} className="text-[#5B6E58]" />
                          <span>
                            {item.uniqueClients} {item.uniqueClients === 1 ? 'client' : 'clients'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


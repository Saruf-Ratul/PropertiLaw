import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsData {
  caseVolume: Array<{ month: string; count: number }>;
  outcomes: Array<{ name: string; value: number }>;
  timelineByCourt: Array<{ court: string; avgDays: number }>;
  caseStatus: Array<{ status: string; count: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      // Mock data for demonstration - replace with actual API calls
      const mockData: AnalyticsData = {
        caseVolume: [
          { month: 'Jan', count: 45 },
          { month: 'Feb', count: 52 },
          { month: 'Mar', count: 48 },
          { month: 'Apr', count: 61 },
          { month: 'May', count: 55 },
          { month: 'Jun', count: 58 }
        ],
        outcomes: [
          { name: 'Eviction Granted', value: 120 },
          { name: 'Tenant Paid', value: 45 },
          { name: 'Case Dismissed', value: 15 },
          { name: 'Settled', value: 30 }
        ],
        timelineByCourt: [
          { court: 'Essex County', avgDays: 45 },
          { court: 'Hudson County', avgDays: 52 },
          { court: 'Bergen County', avgDays: 38 },
          { court: 'Union County', avgDays: 41 }
        ],
        caseStatus: [
          { status: 'Open', count: 85 },
          { status: 'Filed', count: 42 },
          { status: 'Hearing Scheduled', count: 28 },
          { status: 'Judgment', count: 15 },
          { status: 'Closed', count: 210 }
        ]
      };

      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center">No data available</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="mt-2 text-sm text-gray-600">
            Advanced analytics and visualizations
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Case Volume Over Time */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Case Volume Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.caseVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Case Outcomes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Case Outcomes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.outcomes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.outcomes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline by Court */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Average Timeline by Court</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.timelineByCourt}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="court" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDays" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Case Status Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Case Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.caseStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="status" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Total Cases</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {data.caseVolume.reduce((sum, item) => sum + item.count, 0)}
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Eviction Rate</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {((data.outcomes.find(o => o.name === 'Eviction Granted')?.value || 0) / 
                data.outcomes.reduce((sum, o) => sum + o.value, 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Avg Timeline</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {Math.round(data.timelineByCourt.reduce((sum, c) => sum + c.avgDays, 0) / data.timelineByCourt.length)} days
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="text-sm font-medium text-gray-500">Open Cases</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">
              {data.caseStatus.find(s => s.status === 'Open')?.count || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


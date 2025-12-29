import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Reports() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/reports/timeline-metrics');
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
      <p className="mt-2 text-sm text-gray-600">
        Case timeline metrics and analytics
      </p>

      {metrics && (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Total Cases Analyzed
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.totalCases}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Avg Days to Judgment
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.avgDaysToJudgment}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Avg Days to Close
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.avgDaysToClose}
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="text-sm font-medium text-gray-500">
                Fastest Case
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {metrics.minDaysToClose} days
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


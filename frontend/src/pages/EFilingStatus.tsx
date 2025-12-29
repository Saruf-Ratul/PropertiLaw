import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { format } from 'date-fns';

interface FilingStatus {
  id: string;
  caseNumber: string;
  courtCaseNumber: string;
  court: string;
  status: string;
  filedDate: string;
  hearingDate: string | null;
}

export default function EFilingStatus() {
  const [filings, setFilings] = useState<FilingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get('/efiling-status/status');
      setFilings(response.data);
    } catch (error) {
      console.error('Failed to fetch e-filing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async (caseId: string) => {
    setRefreshing(caseId);
    try {
      // Note: Would need credentials - for now just refresh local data
      await fetchStatus();
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setRefreshing(null);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Filing Status</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor electronic filing status for all cases
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          Refresh All
        </button>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Case Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Court Case #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Court
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Filed Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Hearing Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filings.map((filing) => (
              <tr key={filing.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  <Link
                    to={`/cases/${filing.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    {filing.caseNumber}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {filing.courtCaseNumber}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {filing.court}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                    {filing.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {filing.filedDate ? format(new Date(filing.filedDate), 'MMM d, yyyy') : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {filing.hearingDate ? format(new Date(filing.hearingDate), 'MMM d, yyyy') : 'Not scheduled'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <button
                    onClick={() => refreshStatus(filing.id)}
                    disabled={refreshing === filing.id}
                    className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
                  >
                    {refreshing === filing.id ? 'Refreshing...' : 'Refresh'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filings.length === 0 && (
        <div className="mt-8 text-center text-gray-500">
          No e-filed cases found
        </div>
      )}
    </div>
  );
}


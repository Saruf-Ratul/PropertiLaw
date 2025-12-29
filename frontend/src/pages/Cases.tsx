import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { format } from 'date-fns';

interface Case {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  reason: string;
  property: {
    name: string;
    address: string;
  };
  tenants: Array<{
    tenant: {
      firstName: string;
      lastName: string;
    };
  }>;
  filedDate: string | null;
  hearingDate: string | null;
  createdAt: string;
}

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCases();
  }, [statusFilter, search]);

  const fetchCases = async () => {
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await api.get('/cases', { params });
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      INTAKE: 'bg-gray-100 text-gray-800',
      OPEN: 'bg-blue-100 text-blue-800',
      FILED: 'bg-purple-100 text-purple-800',
      HEARING_SCHEDULED: 'bg-yellow-100 text-yellow-800',
      JUDGMENT: 'bg-orange-100 text-orange-800',
      CLOSED: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cases</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage eviction cases
          </p>
        </div>
        <Link
          to="/cases/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          + New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
        >
          <option value="">All Statuses</option>
          <option value="INTAKE">Intake</option>
          <option value="OPEN">Open</option>
          <option value="FILED">Filed</option>
          <option value="HEARING_SCHEDULED">Hearing Scheduled</option>
          <option value="JUDGMENT">Judgment</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Cases table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Case #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Property
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {cases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  <Link
                    to={`/cases/${caseItem.id}`}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    {caseItem.caseNumber}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {caseItem.tenants.length > 0
                    ? `${caseItem.tenants[0].tenant.firstName} ${caseItem.tenants[0].tenant.lastName}`
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>{caseItem.property.name}</div>
                  <div className="text-xs text-gray-400">
                    {caseItem.property.address}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                      caseItem.status
                    )}`}
                  >
                    {caseItem.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {caseItem.filedDate
                    ? format(new Date(caseItem.filedDate), 'MMM d, yyyy')
                    : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {caseItem.hearingDate
                    ? format(new Date(caseItem.hearingDate), 'MMM d, yyyy')
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cases.length === 0 && (
        <div className="mt-8 text-center text-gray-500">
          No cases found. Create your first case to get started.
        </div>
      )}
    </div>
  );
}


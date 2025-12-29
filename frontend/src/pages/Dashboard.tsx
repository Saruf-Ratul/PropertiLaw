import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  FolderIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalCases: number;
  openCases: number;
  filedCases: number;
  closedCases: number;
  upcomingHearings: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/reports/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  const statCards = [
    {
      name: 'Total Cases',
      value: stats?.totalCases || 0,
      icon: FolderIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Open Cases',
      value: stats?.openCases || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Filed Cases',
      value: stats?.filedCases || 0,
      icon: FolderIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Closed Cases',
      value: stats?.closedCases || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Upcoming Hearings',
      value: stats?.upcomingHearings || 0,
      icon: CalendarIcon,
      color: 'bg-red-500'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Overview of your case management
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <div
            key={card.name}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${card.color} rounded-md p-3`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


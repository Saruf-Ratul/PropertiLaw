import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  HomeIcon,
  FolderIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  DocumentArrowUpIcon,
  PresentationChartLineIcon,
  CheckCircleIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Cases', href: '/cases', icon: FolderIcon },
  { name: 'Properties', href: '/properties', icon: BuildingOfficeIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Bulk Operations', href: '/bulk', icon: DocumentArrowUpIcon, firmOnly: true },
  { name: 'Analytics', href: '/analytics', icon: PresentationChartLineIcon },
  { name: 'Approvals', href: '/approvals', icon: CheckCircleIcon },
  { name: 'E-Filing Status', href: '/efiling-status', icon: PaperClipIcon, firmOnly: true },
  { name: 'Clients', href: '/clients', icon: UserGroupIcon, firmOnly: true },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, firmOnly: true },
  { name: 'Users', href: '/users', icon: UsersIcon, firmOnly: true },
];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isFirmUser = user?.userType === 'firm';

  // Filter navigation based on user type
  const filteredNavigation = navigation.filter(item => {
    if (item.firmOnly && !isFirmUser) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-primary-600">PropertiLaw</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center rounded-md px-3 py-2 text-sm font-medium
                    ${isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="mb-3 text-xs text-gray-500">{user?.email}</div>
            <button
              onClick={logout}
              className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


import { useEffect, useState } from 'react';
import api from '../api/client';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  _count: {
    cases: number;
  };
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
      <p className="mt-2 text-sm text-gray-600">
        View all properties
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <div
            key={property.id}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {property.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {property.address}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {property.city}, {property.state}
              </p>
              <div className="mt-4">
                <span className="text-sm text-gray-600">
                  {property._count.cases} case{property._count.cases !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="mt-8 text-center text-gray-500">
          No properties found.
        </div>
      )}
    </div>
  );
}


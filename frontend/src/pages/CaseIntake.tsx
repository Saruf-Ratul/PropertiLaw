import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export default function CaseIntake() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [clientId, setClientId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [type, setType] = useState('NON_PAYMENT');
  const [reason, setReason] = useState('');
  const [amountOwed, setAmountOwed] = useState('');
  const [monthsOwed, setMonthsOwed] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [court, setCourt] = useState('');
  const [caresActCompliant, setCaresActCompliant] = useState(false);
  const [noticeServedDate, setNoticeServedDate] = useState('');

  // Data
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (user?.userType === 'firm') {
      fetchClients();
    } else if (user?.userType === 'client') {
      setClientId(user.clientId!);
      fetchProperties();
    }
  }, [user]);

  useEffect(() => {
    if (propertyId) {
      fetchTenants();
    }
  }, [propertyId]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const params: any = {};
      if (clientId) params.clientId = clientId;
      const response = await api.get('/properties', { params });
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await api.get(`/properties/${propertyId}/tenants`);
      setTenants(response.data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const handlePropertySelect = (prop: Property) => {
    setPropertyId(prop.id);
    setSelectedProperty(prop);
    setJurisdiction(prop.jurisdiction || '');
  };

  const handleTenantToggle = (tenantId: string) => {
    setTenantIds(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/cases', {
        clientId: user?.userType === 'client' ? user.clientId : clientId,
        propertyId,
        tenantIds,
        type,
        reason,
        amountOwed: amountOwed ? parseFloat(amountOwed) : null,
        monthsOwed: monthsOwed ? parseInt(monthsOwed) : null,
        jurisdiction,
        court,
        caresActCompliant,
        noticeServedDate: noticeServedDate || null
      });

      navigate(`/cases/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">New Case Intake</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex mt-2 text-xs text-gray-600">
          <div className="flex-1 text-center">Property & Tenant</div>
          <div className="flex-1 text-center">Case Details</div>
          <div className="flex-1 text-center">Jurisdiction</div>
          <div className="flex-1 text-center">Review</div>
        </div>
      </div>

      {/* Step 1: Property & Tenant */}
      {step === 1 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Select Property & Tenant</h2>

          {user?.userType === 'firm' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  fetchProperties();
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => {
                const prop = properties.find(p => p.id === e.target.value);
                if (prop) handlePropertySelect(prop);
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              <option value="">Select a property</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name} - {prop.address}
                </option>
              ))}
            </select>
          </div>

          {propertyId && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant(s)
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-4">
                {tenants.map((tenant) => (
                  <label
                    key={tenant.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={tenantIds.includes(tenant.id)}
                      onChange={() => handleTenantToggle(tenant.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="font-medium">
                        {tenant.firstName} {tenant.lastName}
                      </div>
                      {tenant.email && (
                        <div className="text-sm text-gray-500">{tenant.email}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!propertyId || tenantIds.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Case Details */}
      {step === 2 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Case Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="NON_PAYMENT">Non-Payment</option>
                <option value="HOLDOVER">Holdover</option>
                <option value="VIOLATION">Violation</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Eviction *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Owed ($)
                </label>
                <input
                  type="number"
                  value={amountOwed}
                  onChange={(e) => setAmountOwed(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Months Owed
                </label>
                <input
                  type="number"
                  value={monthsOwed}
                  onChange={(e) => setMonthsOwed(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notice Served Date
              </label>
              <input
                type="date"
                value={noticeServedDate}
                onChange={(e) => setNoticeServedDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={caresActCompliant}
                onChange={(e) => setCaresActCompliant(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="ml-2 text-sm text-gray-700">
                CARES Act Compliant
              </label>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!reason}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Jurisdiction */}
      {step === 3 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Jurisdiction & Court</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jurisdiction *
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g., Essex County, NJ"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Court
              </label>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="e.g., Essex County Superior Court"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!jurisdiction}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Review & Submit</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Property</h3>
              <p className="text-sm text-gray-600">
                {selectedProperty?.name} - {selectedProperty?.address}
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Tenants</h3>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {tenants
                  .filter(t => tenantIds.includes(t.id))
                  .map(t => (
                    <li key={t.id}>{t.firstName} {t.lastName}</li>
                  ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Case Type</h3>
              <p className="text-sm text-gray-600">{type.replace('_', ' ')}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Reason</h3>
              <p className="text-sm text-gray-600">{reason}</p>
            </div>

            {amountOwed && (
              <div>
                <h3 className="font-medium text-gray-900">Amount Owed</h3>
                <p className="text-sm text-gray-600">${parseFloat(amountOwed).toLocaleString()}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900">Jurisdiction</h3>
              <p className="text-sm text-gray-600">{jurisdiction}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(3)}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function EFiling() {
  const { id: caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [courts, setCourts] = useState<any[]>([]);
  const [selectedCourt, setSelectedCourt] = useState('');
  const [filingFees, setFilingFees] = useState<any>(null);
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: ''
  });

  useEffect(() => {
    fetchCourts();
    if (selectedCourt) {
      fetchFilingFees();
    }
  }, [selectedCourt]);

  const fetchCourts = async () => {
    try {
      const response = await api.get('/efiling/courts');
      setCourts(response.data);
    } catch (error) {
      console.error('Failed to fetch courts:', error);
    }
  };

  const fetchFilingFees = async () => {
    try {
      const response = await api.get(`/efiling/courts/${encodeURIComponent(selectedCourt)}/fees`, {
        params: { caseType: 'NON_PAYMENT' }
      });
      setFilingFees(response.data);
    } catch (error) {
      console.error('Failed to fetch filing fees:', error);
    }
  };

  const handleSubmitFiling = async () => {
    if (!selectedCourt) {
      setError('Please select a court');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post(`/efiling/cases/${caseId}/file`, {
        courtName: selectedCourt,
        credentials: credentials.apiKey ? credentials : undefined,
        paymentMethod: 'firm_account' // Could be configurable
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/cases/${caseId}`);
        }, 2000);
      } else {
        setError(response.data.error || 'Filing failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit filing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/cases/${caseId}`)}
          className="text-sm text-primary-600 hover:text-primary-900"
        >
          ← Back to Case
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Electronic Court Filing</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">
            <strong>Success!</strong> Case filed electronically. Redirecting...
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Court *
          </label>
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            required
          >
            <option value="">Select a court</option>
            {courts.map((court) => (
              <option key={court.id} value={court.name}>
                {court.name} {court.efilingAvailable ? '(E-Filing Available)' : '(Manual Filing)'}
              </option>
            ))}
          </select>
        </div>

        {selectedCourt && courts.find(c => c.name === selectedCourt)?.efilingAvailable && (
          <>
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">E-Filing Credentials</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter your court e-filing API credentials. These are stored securely and used only for filing.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={credentials.apiKey}
                    onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={credentials.apiSecret}
                    onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Enter API secret"
                  />
                </div>
              </div>
            </div>

            {filingFees && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Filing Fees</h3>
                <div className="bg-gray-50 rounded-md p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Filing Fee:</span>
                    <span className="font-medium">${filingFees.filingFee?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Service Fee:</span>
                    <span className="font-medium">${filingFees.serviceFee?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-lg font-bold text-primary-600">
                      ${filingFees.totalFee?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  {filingFees.source === 'default' && (
                    <p className="text-xs text-gray-500 mt-2">
                      Note: Default fees shown. Connect to court API for accurate fees.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="border-t pt-4 flex justify-end gap-3">
          <button
            onClick={() => navigate(`/cases/${caseId}`)}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitFiling}
            disabled={loading || !selectedCourt}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
          >
            {loading ? 'Filing...' : 'Submit Filing'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">About E-Filing</h3>
        <p className="text-sm text-blue-800">
          Electronic filing allows you to submit cases directly to the court system. 
          This eliminates the need for paper filing and provides instant confirmation. 
          Make sure you have valid e-filing credentials for the selected court.
        </p>
      </div>
    </div>
  );
}


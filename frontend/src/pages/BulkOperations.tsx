import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { DocumentArrowUpIcon, DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function BulkOperations() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'import' | 'generate' | 'status'>('import');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Import state
  const [clientId, setClientId] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Generate state
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState('NOTICE_TO_QUIT');
  const [cases, setCases] = useState<any[]>([]);

  // Status update state
  const [statusUpdateCases, setStatusUpdateCases] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState('FILED');

  // Fetch clients
  useEffect(() => {
    if (user?.userType === 'firm') {
      api.get('/clients').then(res => setClients(res.data)).catch(console.error);
    }
  }, [user]);

  // Fetch cases for selection
  useEffect(() => {
    api.get('/cases').then(res => setCases(res.data)).catch(console.error);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleBulkImport = async () => {
    if (!csvFile || !clientId) {
      setError('Please select a CSV file and client');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('clientId', clientId);

      const response = await api.post('/bulk/cases/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import cases');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedCases.length === 0 || !documentType) {
      setError('Please select cases and document type');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/bulk/documents/generate', {
        caseIds: selectedCases,
        documentType
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate documents');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (statusUpdateCases.length === 0 || !newStatus) {
      setError('Please select cases and status');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.post('/bulk/cases/status', {
        caseIds: statusUpdateCases,
        status: newStatus
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const toggleCaseSelection = (caseId: string, list: string[], setList: (ids: string[]) => void) => {
    if (list.includes(caseId)) {
      setList(list.filter(id => id !== caseId));
    } else {
      setList([...list, caseId]);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Bulk Operations</h1>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentArrowUpIcon className="inline h-5 w-5 mr-2" />
            Import Cases
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generate'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentDuplicateIcon className="inline h-5 w-5 mr-2" />
            Generate Documents
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'status'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ArrowPathIcon className="inline h-5 w-5 mr-2" />
            Update Status
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {result && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-800">
            <strong>Success!</strong> {result.created || result.generated || result.updated} items processed.
            {result.errors > 0 && (
              <span className="text-red-600 ml-2">
                {result.errors} errors occurred. Check error details below.
              </span>
            )}
          </div>
          {result.errorDetails && result.errorDetails.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              <details>
                <summary>Error Details</summary>
                <ul className="list-disc list-inside mt-1">
                  {result.errorDetails.map((err: any, idx: number) => (
                    <li key={idx}>{JSON.stringify(err)}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Import Cases from CSV</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file with case data. Required columns: propertyName, tenantFirstName, tenantLastName, reason, amountOwed, jurisdiction
          </p>

          <div className="space-y-4">
            {user?.userType === 'firm' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <button
              onClick={handleBulkImport}
              disabled={loading || !csvFile || !clientId}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Cases'}
            </button>
          </div>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Generate Documents</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="NOTICE_TO_QUIT">Notice to Quit</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="COVER_SHEET">Cover Sheet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cases ({selectedCases.length} selected)
              </label>
              <div className="border rounded-md max-h-60 overflow-y-auto p-2">
                {cases.map((caseItem) => (
                  <label
                    key={caseItem.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(caseItem.id)}
                      onChange={() => toggleCaseSelection(caseItem.id, selectedCases, setSelectedCases)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">
                      {caseItem.caseNumber} - {caseItem.property?.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleBulkGenerate}
              disabled={loading || selectedCases.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {loading ? 'Generating...' : `Generate ${selectedCases.length} Documents`}
            </button>
          </div>
        </div>
      )}

      {/* Status Update Tab */}
      {activeTab === 'status' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Update Case Status</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="FILED">Filed</option>
                <option value="HEARING_SCHEDULED">Hearing Scheduled</option>
                <option value="JUDGMENT">Judgment</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cases ({statusUpdateCases.length} selected)
              </label>
              <div className="border rounded-md max-h-60 overflow-y-auto p-2">
                {cases.map((caseItem) => (
                  <label
                    key={caseItem.id}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={statusUpdateCases.includes(caseItem.id)}
                      onChange={() => toggleCaseSelection(caseItem.id, statusUpdateCases, setStatusUpdateCases)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">
                      {caseItem.caseNumber} - {caseItem.status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleBulkStatusUpdate}
              disabled={loading || statusUpdateCases.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : `Update ${statusUpdateCases.length} Cases`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


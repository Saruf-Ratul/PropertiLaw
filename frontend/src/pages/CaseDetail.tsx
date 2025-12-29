import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';
import DocumentPreview from '../components/DocumentPreview';

interface CaseDetail {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  reason: string;
  amountOwed: number | null;
  property: {
    name: string;
    address: string;
  };
  tenants: Array<{
    tenant: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    firmUser: { firstName: string; lastName: string } | null;
    clientUser: { firstName: string; lastName: string } | null;
  }>;
  filedDate: string | null;
  hearingDate: string | null;
}

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [documentType, setDocumentType] = useState('NOTICE_TO_QUIT');
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ id: string; name: string } | null>(null);
  const [serviceMethod, setServiceMethod] = useState('');
  const [serviceDate, setServiceDate] = useState('');

  useEffect(() => {
    if (id) {
      fetchCase();
    }
  }, [id]);

  const fetchCase = async () => {
    try {
      const response = await api.get(`/cases/${id}`);
      setCaseData(response.data);
    } catch (error) {
      console.error('Failed to fetch case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await api.post(`/comments/case/${id}`, {
        content: newComment,
        isInternal: user?.userType === 'firm'
      });
      setNewComment('');
      fetchCase();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleGenerateDocument = async () => {
    setGeneratingDoc(true);
    try {
      await api.post('/documents/generate', {
        caseId: id,
        documentType
      });
      fetchCase();
      alert('Document generated successfully');
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document');
    } finally {
      setGeneratingDoc(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!caseData) {
    return <div className="text-center">Case not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/cases"
          className="text-sm text-primary-600 hover:text-primary-900"
        >
          ← Back to Cases
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {caseData.caseNumber}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {caseData.type.replace('_', ' ')} - {caseData.reason}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
          {caseData.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case details */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Case Details
              </h3>
              <dl className="mt-5 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {caseData.property.name}
                    <br />
                    <span className="text-gray-500">{caseData.property.address}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Amount Owed</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {caseData.amountOwed
                      ? `$${caseData.amountOwed.toLocaleString()}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Filed Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {caseData.filedDate
                      ? format(new Date(caseData.filedDate), 'MMM d, yyyy')
                      : 'Not filed'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hearing Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {caseData.hearingDate
                      ? format(new Date(caseData.hearingDate), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Documents
                </h3>
                {user?.userType === 'firm' && (
                  <div className="flex gap-2">
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="text-sm rounded-md border-gray-300"
                    >
                      <option value="NOTICE_TO_QUIT">Notice to Quit</option>
                      <option value="COMPLAINT">Complaint</option>
                      <option value="COVER_SHEET">Cover Sheet</option>
                    </select>
                    <button
                      onClick={handleGenerateDocument}
                      disabled={generatingDoc}
                      className="text-sm rounded-md bg-primary-600 px-3 py-1 text-white hover:bg-primary-500 disabled:opacity-50"
                    >
                      {generatingDoc ? 'Generating...' : 'Generate'}
                    </button>
                    {caseData.status === 'OPEN' && (
                      <Link
                        to={`/efiling/${caseData.id}`}
                        className="text-sm rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-500"
                      >
                        E-File
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-5">
                {caseData.documents.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {caseData.documents.map((doc) => (
                      <li key={doc.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {doc.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {doc.type} • {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPreviewDocument({ id: doc.id, name: doc.name })}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Preview
                            </button>
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No documents</p>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-5">
                Comments
              </h3>
              <div className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddComment}
                  className="mt-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                >
                  Add Comment
                </button>
              </div>
              <div className="mt-5">
                {caseData.comments.length > 0 ? (
                  <ul className="space-y-4">
                    {caseData.comments.map((comment) => {
                      const author = comment.firmUser || comment.clientUser;
                      return (
                        <li key={comment.id} className="border-l-4 border-primary-500 pl-4">
                          <p className="text-sm text-gray-900">{comment.content}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {author?.firstName} {author?.lastName} •{' '}
                            {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tenants */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Tenants
              </h3>
              <ul className="mt-5 space-y-4">
                {caseData.tenants.map((item, index) => (
                  <li key={index}>
                    <p className="text-sm font-medium text-gray-900">
                      {item.tenant.firstName} {item.tenant.lastName}
                    </p>
                    {item.tenant.email && (
                      <p className="text-sm text-gray-500">{item.tenant.email}</p>
                    )}
                    {item.tenant.phone && (
                      <p className="text-sm text-gray-500">{item.tenant.phone}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Service of Process Section */}
      {user?.userType === 'firm' && (
        <div className="mt-6 bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Service of Process
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Method
                </label>
                <select
                  value={serviceMethod}
                  onChange={(e) => setServiceMethod(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select method</option>
                  <option value="Personal">Personal Service</option>
                  <option value="Certified Mail">Certified Mail</option>
                  <option value="Posting">Posting</option>
                  <option value="Substitute">Substitute Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Date
                </label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await api.put(`/cases/${id}`, {
                    serviceMethod,
                    serviceDate: serviceDate || null
                  });
                  fetchCase();
                } catch (error) {
                  console.error('Failed to update service info:', error);
                }
              }}
              className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
            >
              Update Service Info
            </button>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          documentId={previewDocument.id}
          documentName={previewDocument.name}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
}


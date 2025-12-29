import { useEffect, useState } from 'react';
import api from '../api/client';
import { format } from 'date-fns';
import DocumentPreview from '../components/DocumentPreview';

interface Document {
  id: string;
  name: string;
  type: string;
  approvalStatus: string;
  case: {
    caseNumber: string;
    property: {
      name: string;
    };
  };
  createdAt: string;
}

export default function DocumentApprovals() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.get('/approvals/documents/pending-approval');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (documentId: string) => {
    try {
      await api.post(`/approvals/documents/${documentId}/approve`);
      fetchPendingApprovals();
      alert('Document approved successfully');
    } catch (error) {
      console.error('Failed to approve document:', error);
      alert('Failed to approve document');
    }
  };

  const handleReject = async (documentId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      await api.post(`/approvals/documents/${documentId}/reject`, {
        reason: rejectionReason
      });
      setRejectionReason('');
      fetchPendingApprovals();
      alert('Document rejected');
    } catch (error) {
      console.error('Failed to reject document:', error);
      alert('Failed to reject document');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Document Approvals</h1>
      <p className="text-sm text-gray-600 mb-6">
        Review and approve documents requiring your approval
      </p>

      {documents.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No documents pending approval
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{doc.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Type: {doc.type.replace('_', ' ')} • Case: {doc.case.caseNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    Property: {doc.case.property.name} • Created: {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDoc({ id: doc.id, name: doc.name })}
                    className="rounded-md bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleApprove(doc.id)}
                    className="rounded-md bg-green-600 px-3 py-1 text-sm font-semibold text-white hover:bg-green-500"
                  >
                    Approve
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          setRejectionReason(reason);
                          handleReject(doc.id);
                        }
                      }}
                      className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          documentId={previewDoc.id}
          documentName={previewDoc.name}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}


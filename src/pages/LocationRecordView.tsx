import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { where } from 'firebase/firestore';
import { createDocument, deleteDocument } from '../services/firestoreService';
import { useLiveSync } from '../hooks/useLiveSync';
import { Trash2 } from 'lucide-react';

export default function LocationRecordView() {
  const { categoryId, systemId, frequencyId, locationId } = useParams<{
    categoryId: string;
    systemId: string;
    frequencyId: string;
    locationId: string;
  }>();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState('');
  const [status, setStatus] = useState('Pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync records specifically for this location
  const { data: records, loading: syncLoading, error: syncError } = useLiveSync(
    'TEST_RECORDS',
    locationId ? [where('locationId', '==', locationId)] : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = {
        categoryId: categoryId || 'unknown',
        systemId: systemId || 'unknown',
        frequencyId: frequencyId || 'unknown',
        locationId: locationId || 'unknown',
        testDate,
        technicianName,
        status,
        createdAt: new Date().toISOString(),
      };

      await createDocument('TEST_RECORDS', formData);
      
      // Reset form
      setTechnicianName('');
      setStatus('Pending');
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Failed to create record:', err);
      setError(err.message || 'Failed to create record.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    setLoading(true);
    try {
      await deleteDocument('TEST_RECORDS', recordId);
    } catch (err: any) {
      console.error('Failed to delete record:', err);
      // Removed window.alert to bypass sandbox restrictions
      setError(err.message || 'Deletion failed due to network issues.');
    } finally {
      setLoading(false);
    }
  };

  if (!locationId) {
    return <div className="p-6 text-red-500">Error: Missing locationId in URL parameters.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Location Records: {locationId}</h1>
          <p className="text-gray-500 mt-1">
            Path: {categoryId} / {systemId} / {frequencyId} / <span className="font-semibold text-gray-800">{locationId}</span>
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-sm transition-colors"
          >
            Add New Record
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">New Test Record</h2>
            <button 
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technician Name</label>
                <input
                  type="text"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 bg-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="Satisfactory">Satisfactory</option>
                  <option value="Unsatisfactory">Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                disabled={loading}
              >
                 Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Location Test Records</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time synced records for this specific location.</p>
        </div>
        
        {syncLoading ? (
          <div className="p-12 text-center text-gray-500">Loading records...</div>
        ) : syncError ? (
          <div className="p-12 text-center text-red-500">Error: {syncError.message}</div>
        ) : records && records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 font-medium text-gray-700">Date</th>
                  <th className="p-4 font-medium text-gray-700">Technician</th>
                  <th className="p-4 font-medium text-gray-700">Status</th>
                  <th className="p-4 font-medium text-gray-700">Record ID</th>
                  <th className="p-4 font-medium text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">{record.testDate || 'N/A'}</td>
                    <td className="p-4 font-medium">{record.technicianName || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${record.status === 'Satisfactory' ? 'bg-green-100 text-green-800' : 
                          record.status === 'Unsatisfactory' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}
                      >
                        {record.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{record.id}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="inline-flex items-center justify-center p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500">No records found for this location.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add the first record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

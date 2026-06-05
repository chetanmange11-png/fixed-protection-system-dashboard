import React, { useState } from 'react';
import { createDocument } from '../services/firestoreService';

interface AddRecordModalProps {
  categoryId: string;
  systemId: string;
  frequencyId: string;
  locationId: string;
  onClose: () => void;
}

export function AddRecordModal({
  categoryId,
  systemId,
  frequencyId,
  locationId,
  onClose,
}: AddRecordModalProps) {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        categoryId,
        systemId,
        frequencyId,
        locationId,
        testResult,
        testDate: new Date().toISOString(),
        status: 'Pending',
      };

      await createDocument('TEST_RECORDS', data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold">Add Test Record</h2>
        <p className="mb-4 text-sm text-gray-500">
          This record will automatically link to its parent location and system.
        </p>

        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Test Result</label>
            <input
              type="text"
              value={testResult}
              onChange={(e) => setTestResult(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2"
              placeholder="e.g. Satisfactory"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

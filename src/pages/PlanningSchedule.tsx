import React from 'react';
import { useLiveSync } from '../hooks/useLiveSync';

export default function PlanningSchedule() {
  const { data: records, loading, error } = useLiveSync('testRecords');

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <p className="text-gray-500">Loading records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center text-red-500">
        <p>Error loading records: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Planning & Schedule</h1>
        <p className="text-gray-500">Master view of all globally synced test records.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Record ID</th>
              <th className="p-4 font-medium text-gray-700">Location ID (Level 4)</th>
              <th className="p-4 font-medium text-gray-700">System ID (Level 2)</th>
              <th className="p-4 font-medium text-gray-700">Category ID (Level 1)</th>
              <th className="p-4 font-medium text-gray-700">Result</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records && records.length > 0 ? (
              records.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-xs text-gray-500">{record.id}</td>
                  <td className="p-4">{record.locationId || 'N/A'}</td>
                  <td className="p-4">{record.systemId || 'N/A'}</td>
                  <td className="p-4">{record.categoryId || 'N/A'}</td>
                  <td className="p-4">{record.testResult || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      record.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

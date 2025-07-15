import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiAlertTriangle, FiCheck } from 'react-icons/fi';

const ClearDatabase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [results, setResults] = useState(null);

  const clearAllData = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting database clearing process...');

      // Tables to clear (in order to handle foreign key dependencies)
      const tablesToClear = [
        // Clear child tables first (due to foreign keys)
        { name: 'estimate_items', description: 'Estimate line items' },
        { name: 'invoice_items', description: 'Invoice line items' },
        { name: 'stock_receive_items', description: 'Stock receive line items' },
        { name: 'job_card_parts', description: 'Job card parts' },
        { name: 'low_stock_alerts', description: 'Low stock alerts' },
        { name: 'stock_movements', description: 'Stock movements' },
        
        // Clear parent tables
        { name: 'estimates', description: 'Estimates' },
        { name: 'invoices', description: 'Invoices' },
        { name: 'stock_receives', description: 'Stock receives (GRN)' },
        { name: 'job_cards', description: 'Job cards' },
        { name: 'parts', description: 'Parts/Inventory' },
      ];

      // Clear each table
      let totalRecordsDeleted = 0;
      const clearResults = [];

      for (const table of tablesToClear) {
        try {
          const result = await window.electronAPI.database.query(
            'run',
            `DELETE FROM ${table.name}`
          );
          const deletedCount = result.changes || 0;
          totalRecordsDeleted += deletedCount;
          
          clearResults.push({
            table: table.description,
            deleted: deletedCount,
            success: true
          });
        } catch (error) {
          clearResults.push({
            table: table.description,
            deleted: 0,
            success: false,
            error: error.message
          });
        }
      }

      // Reset all counters to 0
      const counters = ['pro_no', 'job_no', 'estimate_invoice', 'invoice_no', 'grn_no'];
      const counterResults = [];

      for (const counter of counters) {
        try {
          await window.electronAPI.database.query(
            'run',
            `UPDATE counters SET current_value = 0 WHERE id = ?`,
            [counter]
          );
          counterResults.push({
            counter,
            success: true
          });
        } catch (error) {
          counterResults.push({
            counter,
            success: false,
            error: error.message
          });
        }
      }

      setResults({
        tables: clearResults,
        counters: counterResults,
        totalDeleted: totalRecordsDeleted
      });

      setCleared(true);
      window.electronAPI.notification.show('Success', `Database cleared! ${totalRecordsDeleted} records deleted.`);

    } catch (error) {
      console.error('Error clearing database:', error);
      window.electronAPI.notification.show('Error', `Failed to clear database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClear = () => {
    if (confirmStep === 0) {
      setConfirmStep(1);
    } else if (confirmStep === 1) {
      clearAllData();
      setConfirmStep(2);
    }
  };

  const resetForm = () => {
    setConfirmStep(0);
    setCleared(false);
    setResults(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FiTrash2 className="w-8 h-8 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Clear Database</h1>
        </div>

        {!cleared ? (
          <>
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-red-400 font-semibold mb-2">⚠️ DANGER ZONE</h3>
                  <p className="text-red-300 text-sm mb-2">
                    This action will permanently delete ALL data from your database:
                  </p>
                  <ul className="text-red-300 text-sm space-y-1 ml-4">
                    <li>• All job cards and their parts</li>
                    <li>• All parts/inventory data</li>
                    <li>• All estimates and estimate items</li>
                    <li>• All invoices and invoice items</li>
                    <li>• All stock receives (GRN) and their items</li>
                    <li>• All stock movements and alerts</li>
                    <li>• All document counters will be reset to 0</li>
                  </ul>
                  <p className="text-red-300 text-sm mt-3 font-semibold">
                    This action CANNOT be undone!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">What will be preserved:</h3>
              <ul className="text-gray-300 text-sm space-y-1 ml-4">
                <li>• Database table structure</li>
                <li>• Application settings</li>
                <li>• User authentication</li>
              </ul>
            </div>

            <div className="flex gap-4">
              {confirmStep === 0 && (
                <button
                  onClick={handleConfirmClear}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <FiTrash2 />
                  I want to clear all data
                </button>
              )}

              {confirmStep === 1 && (
                <>
                  <button
                    onClick={handleConfirmClear}
                    disabled={loading}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 />
                    {loading ? 'Clearing...' : 'YES, DELETE EVERYTHING'}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={loading}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-400">
              <FiCheck className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Database Successfully Cleared!</h2>
            </div>

            {results && (
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Clearing Summary</h3>
                  <p className="text-green-400 mb-4">
                    Total records deleted: {results.totalDeleted}
                  </p>
                  
                  <div className="space-y-2">
                    <h4 className="text-gray-300 font-medium">Tables cleared:</h4>
                    {results.tables.map((table, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-300">{table.table}</span>
                        <span className={table.success ? 'text-green-400' : 'text-red-400'}>
                          {table.success ? `${table.deleted} deleted` : 'Error'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mt-4">
                    <h4 className="text-gray-300 font-medium">Counters reset:</h4>
                    {results.counters.map((counter, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-300">{counter.counter}</span>
                        <span className={counter.success ? 'text-green-400' : 'text-red-400'}>
                          {counter.success ? 'Reset to 0' : 'Error'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiCheck className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <h4 className="text-blue-400 font-semibold">Ready for Fresh Start!</h4>
                      <p className="text-blue-300 text-sm">
                        Your database is now clean and ready for new data. All document numbers will start from 000001.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Dashboard
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear More Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClearDatabase;
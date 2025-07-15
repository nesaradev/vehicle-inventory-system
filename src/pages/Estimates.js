import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEye, FiX, FiCalendar, FiTruck, FiUser, FiFileText, FiDollarSign } from 'react-icons/fi';

const Estimates = () => {
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [showEstimateDetails, setShowEstimateDetails] = useState(false);
  const [estimateItems, setEstimateItems] = useState([]);

  useEffect(() => {
    fetchEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [estimates, searchTerm]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT e.*, 
          COUNT(ei.id) as items_count,
          SUM(ei.value) as items_total
         FROM estimates e
         LEFT JOIN estimate_items ei ON e.id = ei.estimate_id
         GROUP BY e.id
         ORDER BY e.created_at DESC`
      );
      setEstimates(result || []);
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEstimates = () => {
    if (!searchTerm) {
      setFilteredEstimates(estimates);
      return;
    }

    const filtered = estimates.filter(estimate =>
      (estimate.invoice_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estimate.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estimate.vehicle_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredEstimates(filtered);
  };

  const handleViewEstimateDetails = async (estimate) => {
    setSelectedEstimate(estimate);
    setShowEstimateDetails(true);
    
    // Fetch estimate items
    try {
      const items = await window.electronAPI.database.query(
        'all',
        `SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY id`,
        [estimate.id]
      );
      setEstimateItems(items || []);
    } catch (error) {
      console.error('Error fetching estimate items:', error);
      setEstimateItems([]);
    }
  };

  const closeEstimateDetails = () => {
    setShowEstimateDetails(false);
    setSelectedEstimate(null);
    setEstimateItems([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Estimates</h1>
        <Link to="/add-estimate" className="btn-primary flex items-center gap-2">
          <FiPlus />
          New Estimate
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by estimate number, customer name, or vehicle number..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Estimates List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading estimates...</p>
          </div>
        ) : filteredEstimates.length > 0 ? (
          filteredEstimates.map(estimate => (
            <div key={estimate.id} className="card p-6 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Estimate #{estimate.invoice_no}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(estimate.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    Rs. {(estimate.total_amount || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {estimate.items_count || 0} items
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Customer: </span>
                  <span className="text-gray-900 dark:text-white">{estimate.customer}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Vehicle: </span>
                  <span className="text-gray-900 dark:text-white">{estimate.vehicle_no}</span>
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleViewEstimateDetails(estimate)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No estimates found.</p>
            <Link to="/add-estimate" className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              Create your first estimate
            </Link>
          </div>
        )}
      </div>

      {/* Estimate Details Modal */}
      {showEstimateDetails && selectedEstimate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Estimate Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  #{selectedEstimate.invoice_no} • Created {new Date(selectedEstimate.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={closeEstimateDetails}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Estimate Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Estimate Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <FiFileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Invoice No:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedEstimate.invoice_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedEstimate.job_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Job No:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedEstimate.job_no || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        Rs. {selectedEstimate.total_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {selectedEstimate.discount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Discount:</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          -Rs. {selectedEstimate.discount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer & Vehicle Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Customer & Vehicle</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedEstimate.customer}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiTruck className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Vehicle:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedEstimate.vehicle_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Insurance Company:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedEstimate.ins_company || 'N/A'}
                      </span>
                    </div>
                    {selectedEstimate.remarks && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Remarks:</span>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {selectedEstimate.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Estimate Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Estimate Items</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {estimateItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Value
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              F/B
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                          {estimateItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.type}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.description}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                Rs. {item.price?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                                Rs. {item.value?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-center text-gray-900 dark:text-white">
                                {item.fb}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <td colSpan="4" className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              Total:
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                              Rs. {estimateItems.reduce((sum, item) => sum + (item.value || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                          {selectedEstimate.discount > 0 && (
                            <tr>
                              <td colSpan="4" className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                Discount:
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">
                                -Rs. {selectedEstimate.discount?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-3"></td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan="4" className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                              Final Total:
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                              Rs. {((estimateItems.reduce((sum, item) => sum + (item.value || 0), 0)) - (selectedEstimate.discount || 0)).toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No items found for this estimate
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estimates; 
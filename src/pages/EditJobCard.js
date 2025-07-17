import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';

const EditJobCard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [jobCard, setJobCard] = useState(null);
  const [selectedParts, setSelectedParts] = useState([]);

  useEffect(() => {
    fetchJobCard();
    fetchParts();
  }, [id]);

  const fetchJobCard = async () => {
    try {
      const job = await window.electronAPI.database.query(
        'get',
        'SELECT * FROM job_cards WHERE id = ?',
        [id]
      );
      
      if (!job) {
        window.electronAPI.notification.show('Error', 'Job card not found');
        navigate('/job-cards');
        return;
      }
      
      if (job.status !== 'pending') {
        window.electronAPI.notification.show('Warning', 'Only pending jobs can be edited');
        navigate('/job-cards');
        return;
      }
      
      setJobCard(job);
      
      // Fetch job parts
      const jobParts = await window.electronAPI.database.query(
        'all',
        `SELECT jp.*, p.name, p.part_number, p.current_stock 
         FROM job_card_parts jp
         JOIN parts p ON jp.part_id = p.id
         WHERE jp.job_card_id = ?`,
        [id]
      );
      
      setSelectedParts(jobParts.map(jp => ({
        id: jp.part_id,
        name: jp.name,
        part_number: jp.part_number,
        current_stock: jp.current_stock,
        quantity: jp.quantity,
        unit_price: jp.unit_price,
        total_price: jp.total_price
      })));
    } catch (error) {
      console.error('Error fetching job card:', error);
    }
  };

  const fetchParts = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        'SELECT * FROM parts WHERE current_stock > 0 ORDER BY name'
      );
      setParts(result || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleAddPart = (part) => {
    const existingIndex = selectedParts.findIndex(p => p.id === part.id);
    if (existingIndex >= 0) {
      // Update quantity if part already selected
      const updated = [...selectedParts];
      updated[existingIndex].quantity++;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setSelectedParts(updated);
    } else {
      // Add new part
      setSelectedParts([...selectedParts, {
        ...part,
        quantity: 1,
        unit_price: part.final_selling_price,
        total_price: part.final_selling_price
      }]);
    }
    setShowPartSelector(false);
    setSearchTerm('');
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...selectedParts];
    const part = parts.find(p => p.id === updated[index].id);
    const maxQuantity = (part?.current_stock || 0) + updated[index].quantity; // Include current quantity
    
    if (quantity <= 0) {
      updated.splice(index, 1);
    } else if (quantity <= maxQuantity) {
      updated[index].quantity = quantity;
      updated[index].total_price = quantity * updated[index].unit_price;
    } else {
      window.electronAPI.notification.show('Warning', `Only ${maxQuantity} units available (including already allocated)`);
      return;
    }
    
    setSelectedParts(updated);
  };

  const calculateTotal = () => {
    return selectedParts.reduce((sum, part) => sum + part.total_price, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedParts.length === 0) {
      window.electronAPI.notification.show('Warning', 'Please add at least one part to the job card');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update job card total
      await window.electronAPI.database.query(
        'run',
        `UPDATE job_cards SET 
          total_cost = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [calculateTotal(), id]
      );

      // Delete existing parts
      await window.electronAPI.database.query(
        'run',
        'DELETE FROM job_card_parts WHERE job_card_id = ?',
        [id]
      );

      // Add updated parts
      for (const part of selectedParts) {
        await window.electronAPI.database.query(
          'run',
          `INSERT INTO job_card_parts (
            job_card_id, part_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)`,
          [id, part.id, part.quantity, part.unit_price, part.total_price]
        );
      }

      window.electronAPI.notification.show('Success', 'Job card updated successfully');
      navigate('/job-cards');
    } catch (error) {
      console.error('Error updating job card:', error);
      window.electronAPI.notification.show('Error', 'Failed to update job card');
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!jobCard) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/job-cards')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Job Cards</span>
        </button>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Job Card #{id}</h1>
        
        {/* Job Information (Read-only) */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Job Name:</span>
              <p className="font-medium text-gray-900 dark:text-white">{jobCard.job_name}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Technician:</span>
              <p className="font-medium text-gray-900 dark:text-white">{jobCard.technician_name}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Customer:</span>
              <p className="font-medium text-gray-900 dark:text-white">{jobCard.customer_name}</p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
              <p className="font-medium text-gray-900 dark:text-white">{jobCard.customer_vehicle_number}</p>
            </div>
            {jobCard.description && (
              <div className="md:col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Description:</span>
                <p className="font-medium text-gray-900 dark:text-white">{jobCard.description}</p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parts Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Parts</h2>
              <button
                type="button"
                onClick={() => setShowPartSelector(!showPartSelector)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FiPlus />
                Add Part
              </button>
            </div>

            {showPartSelector && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search parts..."
                    className="input-field pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredParts.map(part => (
                    <div
                      key={part.id}
                      onClick={() => handleAddPart(part)}
                      className="p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {part.part_number} • Stock: {part.current_stock}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          LKR {part.final_selling_price}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredParts.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No parts found
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedParts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Part</th>
                      <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Quantity</th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Unit Price</th>
                      <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Total</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedParts.map((part, index) => (
                      <tr key={part.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{part.part_number}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="w-20 text-center input-field"
                          />
                        </td>
                        <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                          LKR {part.unit_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-white">
                          LKR {part.total_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(index, 0)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                      <td colSpan="3" className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">
                        Total:
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-xl text-primary-600 dark:text-primary-400">
                        LKR {calculateTotal().toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {selectedParts.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No parts in this job card. Click "Add Part" to add parts.
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <FiSave />
              {loading ? 'Updating...' : 'Update Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditJobCard;
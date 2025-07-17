import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiSearch } from 'react-icons/fi';

const AddStock = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [formData, setFormData] = useState({
    quantity: '',
    cost_price: '',
    selling_price: '',
    final_selling_price: '',
    low_stock_threshold: '',
    notes: ''
  });

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = parts.filter(part => 
        part.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParts(filtered);
    } else {
      setFilteredParts(parts);
    }
  }, [searchTerm, parts]);

  const fetchParts = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        'SELECT * FROM parts ORDER BY name'
      );
      setParts(result || []);
      setFilteredParts(result || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handlePartSelect = (part) => {
    setSelectedPart(part);
    setFormData({
      quantity: '',
      cost_price: part.cost_price.toString(),
      selling_price: part.selling_price.toString(),
      final_selling_price: part.final_selling_price.toString(),
      low_stock_threshold: part.low_stock_threshold.toString(),
      notes: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-calculate final selling price if both cost and selling are provided
      if (name === 'cost_price' || name === 'selling_price') {
        const cost = parseFloat(updated.cost_price) || 0;
        const selling = parseFloat(updated.selling_price) || 0;
        if (cost > 0 && selling > 0) {
          updated.final_selling_price = selling.toFixed(2);
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPart) return;
    
    setLoading(true);
    
    try {
      // Update part prices and stock
      await window.electronAPI.database.query(
        'run',
        `UPDATE parts SET 
          current_stock = current_stock + ?,
          cost_price = ?,
          selling_price = ?,
          final_selling_price = ?,
          low_stock_threshold = ?,
          updated_at = datetime('now','localtime')
        WHERE id = ?`,
        [
          parseInt(formData.quantity),
          parseFloat(formData.cost_price),
          parseFloat(formData.selling_price),
          parseFloat(formData.final_selling_price),
          parseInt(formData.low_stock_threshold),
          selectedPart.id
        ]
      );

      // Record stock movement
      await window.electronAPI.database.query(
        'run',
        `INSERT INTO stock_movements (
          part_id, movement_type, quantity, 
          cost_price, selling_price, final_selling_price, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          selectedPart.id,
          'IN',
          parseInt(formData.quantity),
          parseFloat(formData.cost_price),
          parseFloat(formData.selling_price),
          parseFloat(formData.final_selling_price),
          formData.notes || `Stock added for ${selectedPart.name}`
        ]
      );

      window.electronAPI.notification.show('Success', 'Stock added successfully');
      navigate('/inventory');
    } catch (error) {
      console.error('Error adding stock:', error);
      window.electronAPI.notification.show('Error', 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Inventory</span>
        </button>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add Stock</h1>
        
        {!selectedPart ? (
          <div className="space-y-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search parts by name or part number..."
                className="input-field pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredParts.map(part => (
                <div
                  key={part.id}
                  onClick={() => handlePartSelect(part)}
                  className="card p-4 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{part.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{part.part_number}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm">
                      Stock: <span className={`font-medium ${part.current_stock <= part.low_stock_threshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {part.current_stock}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      LKR {part.final_selling_price}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredParts.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No parts found matching your search.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">{selectedPart.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Part Number: {selectedPart.part_number}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current Stock: {selectedPart.current_stock} | Type: {selectedPart.part_type}
              </p>
              <button
                type="button"
                onClick={() => setSelectedPart(null)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
              >
                Change Part
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  className="input-field"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="Enter quantity"
                />
              </div>

              {/* Low Stock Threshold */}
              <div>
                <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Low Stock Alert Threshold *
                </label>
                <input
                  type="number"
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  className="input-field"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>

              {/* Cost Price */}
              <div>
                <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Part Cost (LKR) *
                </label>
                <input
                  type="number"
                  id="cost_price"
                  name="cost_price"
                  className="input-field"
                  value={formData.cost_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Selling Price */}
              <div>
                <label htmlFor="selling_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selling Price (LKR) *
                </label>
                <input
                  type="number"
                  id="selling_price"
                  name="selling_price"
                  className="input-field"
                  value={formData.selling_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Final Selling Price */}
              <div className="md:col-span-2">
                <label htmlFor="final_selling_price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Final Selling Price (LKR) *
                </label>
                <input
                  type="number"
                  id="final_selling_price"
                  name="final_selling_price"
                  className="input-field"
                  value={formData.final_selling_price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="input-field"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any notes about this stock entry..."
              />
            </div>

            {/* Profit Margin Display */}
            {formData.cost_price && formData.final_selling_price && (
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Profit Margin per Unit: 
                  <span className="font-semibold text-primary-600 dark:text-primary-400 ml-2">
                    LKR {(parseFloat(formData.final_selling_price) - parseFloat(formData.cost_price)).toFixed(2)} 
                    ({((parseFloat(formData.final_selling_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price) * 100).toFixed(1)}%)
                  </span>
                </p>
                {formData.quantity && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total Investment: 
                    <span className="font-semibold ml-2">
                      LKR {(parseFloat(formData.cost_price) * parseInt(formData.quantity)).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                <FiSave />
                {loading ? 'Adding Stock...' : 'Add Stock'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddStock;
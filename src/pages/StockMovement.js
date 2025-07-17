import React, { useState, useEffect } from 'react';
import { FiArrowDownCircle, FiArrowUpCircle, FiSearch, FiFilter, FiCalendar } from 'react-icons/fi';

const StockMovement = () => {
  const [movements, setMovements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    todayMovements: 0,
    totalValue: 0
  });

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT sm.*, p.part_number, p.name as part_name, p.part_type
         FROM stock_movements sm
         JOIN parts p ON sm.part_id = p.id
         ORDER BY sm.created_at DESC
         LIMIT 100`
      );
      setMovements(result || []);
      calculateStats(result || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const calculateStats = (movements) => {
    const today = new Date().toDateString();
    const totalIn = movements.filter(m => m.movement_type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements.filter(m => m.movement_type === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
    const todayMovements = movements.filter(m => new Date(m.created_at).toDateString() === today).length;
    const totalValue = movements.filter(m => m.movement_type === 'IN')
      .reduce((sum, m) => sum + (m.quantity * (m.cost_price || 0)), 0);

    setStats({ totalIn, totalOut, todayMovements, totalValue });
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movement.notes && movement.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || movement.movement_type === typeFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const movementDate = new Date(movement.created_at);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = movementDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = movementDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = movementDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Movement History</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock In</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalIn}</p>
            </div>
            <FiArrowDownCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Out</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalOut}</p>
            </div>
            <FiArrowUpCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Movements</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.todayMovements}</p>
            </div>
            <FiCalendar className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock In Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">LKR {stats.totalValue.toFixed(2)}</p>
            </div>
            <FiFilter className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by part name, number, or notes..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="select-field w-full md:w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
          </select>
          <select
            className="select-field w-full md:w-40"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="card p-6 overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Movement History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Date & Time</th>
                <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Part Details</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Type</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Quantity</th>
                <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Value</th>
                <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(movement.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{movement.part_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {movement.part_number} • {movement.part_type}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                      movement.movement_type === 'IN' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {movement.movement_type === 'IN' ? <FiArrowDownCircle /> : <FiArrowUpCircle />}
                      {movement.movement_type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-medium text-gray-900 dark:text-white">
                    {movement.quantity}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {movement.cost_price ? (
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          LKR {(movement.quantity * movement.cost_price).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @${movement.cost_price}/unit
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {movement.notes || '-'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredMovements.length === 0 && (
            <div className="text-center py-12">
              <FiFilter className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No stock movements found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockMovement;
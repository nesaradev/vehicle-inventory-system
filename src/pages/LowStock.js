import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiShoppingCart, FiPackage, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const LowStock = () => {
  const [lowStockParts, setLowStockParts] = useState([]);
  const [outOfStockParts, setOutOfStockParts] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalLowStock: 0,
    totalOutOfStock: 0,
    totalValue: 0,
    criticalItems: 0
  });

  useEffect(() => {
    fetchLowStockData();
  }, []);

  const fetchLowStockData = async () => {
    try {
      const lowStock = await window.electronAPI.database.query(
        'all',
        `SELECT * FROM parts 
         WHERE current_stock > 0 AND current_stock <= low_stock_threshold 
         ORDER BY (CAST(current_stock AS FLOAT) / CAST(low_stock_threshold AS FLOAT)) ASC`
      );

      const outOfStock = await window.electronAPI.database.query(
        'all',
        'SELECT * FROM parts WHERE current_stock = 0 ORDER BY name'
      );

      const alerts = await window.electronAPI.database.query(
        'all',
        `SELECT a.*, p.name, p.part_number 
         FROM low_stock_alerts a 
         JOIN parts p ON a.part_id = p.id 
         ORDER BY a.created_at DESC 
         LIMIT 10`
      );

      const totalValue = await window.electronAPI.database.query(
        'get',
        `SELECT SUM((low_stock_threshold - current_stock) * cost_price) as value 
         FROM parts 
         WHERE current_stock <= low_stock_threshold`
      );

      const critical = await window.electronAPI.database.query(
        'get',
        `SELECT COUNT(*) as count 
         FROM parts 
         WHERE current_stock <= low_stock_threshold * 0.25`
      );

      setLowStockParts(lowStock || []);
      setOutOfStockParts(outOfStock || []);
      setRecentAlerts(alerts || []);
      setStats({
        totalLowStock: lowStock?.length || 0,
        totalOutOfStock: outOfStock?.length || 0,
        totalValue: totalValue?.value || 0,
        criticalItems: critical?.count || 0
      });
    } catch (error) {
      console.error('Error fetching low stock data:', error);
    }
  };

  const getStockPercentage = (current, threshold) => {
    return Math.round((current / threshold) * 100);
  };

  const getStockStatusClass = (percentage) => {
    if (percentage === 0) return 'bg-red-600';
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-orange-500';
    if (percentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleReorder = (part) => {
    const suggestedQuantity = Math.max(part.low_stock_threshold * 2 - part.current_stock, part.low_stock_threshold);
    window.electronAPI.notification.show(
      'Reorder Suggestion',
      `Suggested reorder quantity for ${part.name}: ${suggestedQuantity} units`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Low Stock Alerts</h1>
        <Link to="/add-stock" className="btn-primary flex items-center gap-2">
          <FiPackage />
          Add Stock
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalLowStock}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalOutOfStock}</p>
            </div>
            <FiPackage className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical Items</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.criticalItems}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reorder Value</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">LKR {stats.totalValue.toFixed(2)}</p>
            </div>
            <FiShoppingCart className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      {/* Out of Stock Items */}
      {outOfStockParts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Out of Stock Items</h2>
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-full">
              {outOfStockParts.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Part Details</th>
                  <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Type</th>
                  <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Threshold</th>
                  <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Cost</th>
                  <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockParts.map((part) => (
                  <tr key={part.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{part.part_number}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        part.part_type === 'new' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {part.part_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                      {part.low_stock_threshold}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                      ${part.cost_price}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button 
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                        onClick={() => handleReorder(part)}
                      >
                        Reorder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock Items */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Low Stock Items</h2>
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
            {lowStockParts.length}
          </span>
        </div>
        
        {lowStockParts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Part Details</th>
                  <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Stock Level</th>
                  <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Reorder Cost</th>
                  <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lowStockParts.map((part) => {
                  const percentage = getStockPercentage(part.current_stock, part.low_stock_threshold);
                  const reorderQty = Math.max(part.low_stock_threshold * 2 - part.current_stock, part.low_stock_threshold);
                  return (
                    <tr key={part.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{part.part_number}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {part.current_stock}/{part.low_stock_threshold}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${getStockStatusClass(percentage)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            LKR {(reorderQty * part.cost_price).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {reorderQty} units
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button 
                          className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                          onClick={() => handleReorder(part)}
                        >
                          Reorder
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiPackage className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">All items are well stocked!</p>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Alerts History</h2>
          </div>
          
          <div className="space-y-2">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{alert.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {alert.part_number} • Stock was {alert.current_stock}/{alert.threshold}
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(alert.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStock;
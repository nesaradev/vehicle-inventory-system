import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiFilter, FiPackage, FiAlertTriangle, FiDollarSign, FiEye, FiEdit, FiX, FiCalendar, FiTag, FiMapPin, FiZoomIn, FiZoomOut, FiRotateCw, FiMove } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Inventory = () => {
  const [parts, setParts] = useState([
    {
      id: 1,
      pro_no: 'P001',
      part_number: 'BRK001',
      name: 'Brake Pads',
      item_name: 'Brake Pads',
      description: 'Front brake pads for Toyota Camry',
      part_type: 'new',
      cost_price: 45.00,
      selling_price: 65.00,
      final_selling_price: 65.00,
      current_stock: 25,
      low_stock_threshold: 10,
      supplier: 'AutoParts Co.',
      location: 'A1-B2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      pro_no: 'P002',
      part_number: 'ENG002',
      name: 'Engine Oil Filter',
      item_name: 'Engine Oil Filter',
      description: 'Oil filter for Honda Civic',
      part_type: 'new',
      cost_price: 12.00,
      selling_price: 18.00,
      final_selling_price: 18.00,
      current_stock: 5,
      low_stock_threshold: 10,
      supplier: 'FilterTech',
      location: 'B3-C1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      pro_no: 'P003',
      part_number: 'TIR003',
      name: 'All-Season Tire',
      item_name: 'All-Season Tire',
      description: '205/55R16 All-Season Tire',
      part_type: 'new',
      cost_price: 89.00,
      selling_price: 129.00,
      final_selling_price: 129.00,
      current_stock: 15,
      low_stock_threshold: 8,
      supplier: 'TirePlus',
      location: 'C2-D1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedPart, setSelectedPart] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stockMovements, setStockMovements] = useState([]);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [stats, setStats] = useState({
    totalParts: 3,
    totalValue: 2567.00,
    lowStockCount: 1,
    outOfStockCount: 0
  });

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [parts]);

  const fetchParts = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT id, pro_no, part_number, name, item_name, description, part_type,
                cost_price, selling_price, final_selling_price, current_stock, 
                low_stock_threshold, supplier, location, photo, 
                created_at, updated_at
         FROM parts ORDER BY name`
      );
      
      // If no parts found, use sample data for demo
      if (!result || result.length === 0) {
        console.log('🎯 No parts found - using sample inventory data');
        const sampleParts = [
          {
            id: 1,
            pro_no: 'P001',
            part_number: 'BRK001',
            name: 'Brake Pads',
            item_name: 'Brake Pads',
            description: 'Front brake pads for Toyota Camry',
            part_type: 'new',
            cost_price: 45.00,
            selling_price: 65.00,
            final_selling_price: 65.00,
            current_stock: 25,
            low_stock_threshold: 10,
            supplier: 'AutoParts Co.',
            location: 'A1-B2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            pro_no: 'P002',
            part_number: 'ENG002',
            name: 'Engine Oil Filter',
            item_name: 'Engine Oil Filter',
            description: 'Oil filter for Honda Civic',
            part_type: 'new',
            cost_price: 12.00,
            selling_price: 18.00,
            final_selling_price: 18.00,
            current_stock: 5,
            low_stock_threshold: 10,
            supplier: 'FilterTech',
            location: 'B3-C1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            pro_no: 'P003',
            part_number: 'TIR003',
            name: 'All-Season Tire',
            item_name: 'All-Season Tire',
            description: '205/55R16 All-Season Tire',
            part_type: 'new',
            cost_price: 89.00,
            selling_price: 129.00,
            final_selling_price: 129.00,
            current_stock: 15,
            low_stock_threshold: 8,
            supplier: 'TirePlus',
            location: 'C2-D1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setParts(sampleParts);
      } else {
        setParts(result);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      // Fallback to sample data if database fails
      console.log('🎯 Database error - using sample inventory data');
      const sampleParts = [
        {
          id: 1,
          pro_no: 'P001',
          part_number: 'BRK001',
          name: 'Brake Pads',
          item_name: 'Brake Pads',
          description: 'Front brake pads for Toyota Camry',
          part_type: 'new',
          cost_price: 45.00,
          selling_price: 65.00,
          final_selling_price: 65.00,
          current_stock: 25,
          low_stock_threshold: 10,
          supplier: 'AutoParts Co.',
          location: 'A1-B2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          pro_no: 'P002',
          part_number: 'ENG002',
          name: 'Engine Oil Filter',
          item_name: 'Engine Oil Filter',
          description: 'Oil filter for Honda Civic',
          part_type: 'new',
          cost_price: 12.00,
          selling_price: 18.00,
          final_selling_price: 18.00,
          current_stock: 5,
          low_stock_threshold: 10,
          supplier: 'FilterTech',
          location: 'B3-C1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          pro_no: 'P003',
          part_number: 'TIR003',
          name: 'All-Season Tire',
          item_name: 'All-Season Tire',
          description: '205/55R16 All-Season Tire',
          part_type: 'new',
          cost_price: 89.00,
          selling_price: 129.00,
          final_selling_price: 129.00,
          current_stock: 15,
          low_stock_threshold: 8,
          supplier: 'TirePlus',
          location: 'C2-D1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setParts(sampleParts);
    }
  };

  const calculateStats = () => {
    const totalValue = parts.reduce((sum, part) => sum + (part.current_stock * part.final_selling_price), 0);
    const lowStock = parts.filter(part => part.current_stock > 0 && part.current_stock <= part.low_stock_threshold).length;
    const outOfStock = parts.filter(part => part.current_stock === 0).length;
    
    setStats({
      totalParts: parts.length,
      totalValue,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock
    });
  };

  const validateStockLevels = async () => {
    if (!window.confirm('This will check and fix any stock calculation errors. Proceed?')) {
      return;
    }

    try {
      window.electronAPI.notification.show('Info', 'Checking stock levels...');
      
      let fixedCount = 0;
      for (const part of parts) {
        // Get all stock movements for this part
        const movements = await window.electronAPI.database.query(
          'all',
          `SELECT * FROM stock_movements WHERE part_id = ? ORDER BY created_at`,
          [part.id]
        );
        
        let totalIn = 0;
        let totalOut = 0;
        
        movements.forEach(movement => {
          if (movement.movement_type === 'IN') totalIn += movement.quantity;
          if (movement.movement_type === 'OUT') totalOut += movement.quantity;
          // GRN movements are documentation only, don't count them
        });
        
        const expectedStock = totalIn - totalOut;
        
        if (part.current_stock !== expectedStock) {
          console.log(`Stock mismatch for ${part.name}: Expected ${expectedStock}, Actual ${part.current_stock}`);
          
          // Fix the stock level
          await window.electronAPI.database.query(
            'run',
            `UPDATE parts SET current_stock = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
            [expectedStock, part.id]
          );
          
          fixedCount++;
        }
      }
      
      if (fixedCount > 0) {
        window.electronAPI.notification.show('Success', `Fixed ${fixedCount} stock calculation error(s)`);
        fetchParts(); // Refresh the parts list
      } else {
        window.electronAPI.notification.show('Info', 'All stock levels are correct');
      }
      
    } catch (error) {
      console.error('Error validating stock:', error);
      window.electronAPI.notification.show('Error', 'Failed to validate stock levels');
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.part_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || part.part_type === typeFilter;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'out' && part.current_stock === 0) ||
                        (stockFilter === 'low' && part.current_stock > 0 && part.current_stock <= part.low_stock_threshold) ||
                        (stockFilter === 'in' && part.current_stock > part.low_stock_threshold);
    return matchesSearch && matchesType && matchesStock;
  });

  const getStockStatus = (part) => {
    if (part.current_stock === 0) {
      return { 
        class: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400', 
        text: 'Out of Stock' 
      };
    }
    if (part.current_stock <= part.low_stock_threshold) {
      return { 
        class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400', 
        text: 'Low Stock' 
      };
    }
    return { 
      class: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400', 
      text: 'In Stock' 
    };
  };

  const handleViewDetails = async (part) => {
    console.log('Selected part:', part);
    console.log('Part photo:', part.photo);
    console.log('Raw created_at:', part.created_at);
    console.log('Raw updated_at:', part.updated_at);
    console.log('Current time:', new Date().toLocaleString());
    setSelectedPart(part);
    setShowDetails(true);
    
    // Fetch stock movements for this part
    try {
      const movements = await window.electronAPI.database.query(
        'all',
        `SELECT * FROM stock_movements 
         WHERE part_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [part.id]
      );
      setStockMovements(movements || []);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      setStockMovements([]);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedPart(null);
    setStockMovements([]);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      // SQLite stores timestamps as local time, but JavaScript might interpret them as UTC
      // Let's handle both cases properly
      let date;
      
      // Check if the date string includes timezone info
      if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
        // This is already in ISO format with timezone
        date = new Date(dateString);
      } else {
        // SQLite format without timezone - treat as local time
        // Replace space with 'T' to make it ISO-like, then treat as local
        const isoString = dateString.replace(' ', 'T');
        date = new Date(isoString);
      }
      
      // Format in local timezone
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      let date;
      
      if (dateString.includes('T') && (dateString.includes('Z') || dateString.includes('+'))) {
        date = new Date(dateString);
      } else {
        const isoString = dateString.replace(' ', 'T');
        date = new Date(isoString);
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid date';
    }
  };

  const openImageZoom = () => {
    setShowImageZoom(true);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const closeImageZoom = () => {
    setShowImageZoom(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
        <div className="flex gap-3">
          <button
            onClick={validateStockLevels}
            className="btn-secondary flex items-center gap-2"
            title="Check and fix stock calculation errors"
          >
            <FiAlertTriangle />
            Fix Stock
          </button>
          <Link to="/add-part" className="btn-primary flex items-center gap-2">
            <FiPlus />
            Add Part
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Parts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalParts}</p>
            </div>
            <FiPackage className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalValue.toFixed(2)}</p>
            </div>
            <FiDollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStockCount}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfStockCount}</p>
            </div>
            <FiAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
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
              placeholder="Search by name or part number..."
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
            <option value="new">New Parts</option>
            <option value="used">Used Parts</option>
          </select>
          <select
            className="select-field w-full md:w-40"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Part Details</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Type</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Stock</th>
                <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Cost</th>
                <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Price</th>
                <th className="text-right py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Value</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Status</th>
                <th className="text-center py-3 px-2 text-gray-700 dark:text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => {
                const status = getStockStatus(part);
                const profit = part.final_selling_price - part.cost_price;
                const profitMargin = part.cost_price > 0 ? (profit / part.cost_price * 100) : 0;
                
                return (
                  <tr key={part.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {part.photo && (
                          <img 
                            src={part.photo} 
                            alt={part.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{part.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{part.part_number}</p>
                          {part.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{part.description}</p>
                          )}
                        </div>
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
                    <td className="py-3 px-2 text-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{part.current_stock}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Min: {part.low_stock_threshold}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                      ${part.cost_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">${part.final_selling_price.toFixed(2)}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          +{profitMargin.toFixed(1)}%
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-white">
                      ${(part.current_stock * part.final_selling_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${status.class}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(part)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredParts.length === 0 && (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No parts found matching your filters</p>
              <Link to="/add-part" className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
                Add your first part
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Part Details Modal */}
      {showDetails && selectedPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Part Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pro No: {selectedPart.pro_no}</p>
              </div>
              <button
                onClick={closeDetails}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Part Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="card p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiTag className="w-5 h-5" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Part Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedPart.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Part Number</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedPart.part_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Item Name</label>
                      <p className="text-gray-900 dark:text-white">{selectedPart.item_name || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</label>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        selectedPart.part_type === 'new' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {selectedPart.part_type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</label>
                      <p className="text-gray-900 dark:text-white">{selectedPart.supplier || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</label>
                      <p className="text-gray-900 dark:text-white flex items-center gap-1">
                        <FiMapPin className="w-4 h-4" />
                        {selectedPart.location || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  {selectedPart.description && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                      <p className="text-gray-900 dark:text-white mt-1">{selectedPart.description}</p>
                    </div>
                  )}
                </div>

                {/* Pricing Information */}
                <div className="card p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiDollarSign className="w-5 h-5" />
                    Pricing & Stock
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Price</label>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">${selectedPart.cost_price?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Selling Price</label>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">${selectedPart.selling_price?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Final Selling Price</label>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">${selectedPart.final_selling_price?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Stock</label>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedPart.current_stock}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Threshold</label>
                      <p className="text-gray-900 dark:text-white">{selectedPart.low_stock_threshold}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</label>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">${(selectedPart.current_stock * selectedPart.final_selling_price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Stock Movements */}
                {stockMovements.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Stock Movements</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 text-gray-500 dark:text-gray-400">Date</th>
                            <th className="text-left py-2 text-gray-500 dark:text-gray-400">Type</th>
                            <th className="text-right py-2 text-gray-500 dark:text-gray-400">Quantity</th>
                            <th className="text-left py-2 text-gray-500 dark:text-gray-400">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockMovements.map((movement) => (
                            <tr key={movement.id} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-2 text-gray-900 dark:text-white">
                                {formatDate(movement.created_at)}
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  movement.movement_type === 'IN' 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                }`}>
                                  {movement.movement_type}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-900 dark:text-white font-medium">
                                {movement.movement_type === 'OUT' ? '-' : '+'}{movement.quantity}
                              </td>
                              <td className="py-2 text-gray-600 dark:text-gray-400">
                                {movement.notes || 'No notes'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Photo and Metadata */}
              <div className="space-y-6">
                {/* Photo */}
                {selectedPart.photo ? (
                  <div className="card p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                      Photo
                      <button
                        onClick={openImageZoom}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        <FiZoomIn className="w-4 h-4" />
                        Zoom & Inspect
                      </button>
                    </h3>
                    <div 
                      className="relative cursor-pointer group"
                      onClick={openImageZoom}
                    >
                      <img
                        src={selectedPart.photo}
                        alt={selectedPart.name}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105"
                        onError={(e) => {
                          console.error('Image failed to load:', selectedPart.photo);
                          e.target.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', selectedPart.photo);
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <FiZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Click to zoom and inspect for damages</p>
                  </div>
                ) : (
                  <div className="card p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Photo</h3>
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No photo available</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="card p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiCalendar className="w-5 h-5" />
                    Metadata
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                      <p className="text-gray-900 dark:text-white">
                        {formatDateTime(selectedPart.created_at)}
                      </p>
                    </div>
                    {selectedPart.updated_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                        <p className="text-gray-900 dark:text-white">
                          {formatDateTime(selectedPart.updated_at)}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                      <div className="mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStockStatus(selectedPart).class}`}>
                          {getStockStatus(selectedPart).text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoomable Image Modal */}
      {showImageZoom && selectedPart?.photo && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
              <div className="flex items-center gap-2 bg-gray-800 bg-opacity-90 rounded-lg px-4 py-2">
                <h3 className="text-white font-medium">{selectedPart.name} - Part Inspection</h3>
                <span className="text-gray-300 text-sm">({selectedPart.part_number})</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2">
                  <button
                    onClick={handleZoomOut}
                    className="text-white hover:text-blue-400 transition-colors p-1"
                    title="Zoom Out"
                  >
                    <FiZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-white text-sm min-w-16 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="text-white hover:text-blue-400 transition-colors p-1"
                    title="Zoom In"
                  >
                    <FiZoomIn className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-1 bg-gray-800 bg-opacity-90 rounded-lg px-2 py-2">
                  <button
                    onClick={handleRotate}
                    className="text-white hover:text-blue-400 transition-colors p-1"
                    title="Rotate"
                  >
                    <FiRotateCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="text-white hover:text-blue-400 transition-colors p-1"
                    title="Reset View"
                  >
                    <FiMove className="w-5 h-5" />
                  </button>
                </div>
                
                <button
                  onClick={closeImageZoom}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 transition-colors"
                  title="Close"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div 
              className="flex-1 flex items-center justify-center overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <img
                src={selectedPart.photo}
                alt={selectedPart.name}
                className={`max-w-none select-none transition-transform duration-200 ${
                  zoomLevel > 1 ? 'cursor-move' : 'cursor-zoom-in'
                }`}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  transformOrigin: 'center center'
                }}
                onMouseDown={handleMouseDown}
                onDragStart={(e) => e.preventDefault()}
                onClick={zoomLevel === 1 ? handleZoomIn : undefined}
              />
            </div>

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 bg-opacity-90 rounded-lg px-4 py-2">
              <p className="text-white text-sm text-center">
                {zoomLevel > 1 
                  ? "Drag to pan • Scroll to zoom • Click reset to center" 
                  : "Click image or use + to zoom in • Scroll to zoom • Rotate with ↻"
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
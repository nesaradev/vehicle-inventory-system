import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEye, FiX, FiCalendar, FiFileText, FiDollarSign, FiShoppingCart, FiPrinter } from 'react-icons/fi';

const StockReceives = () => {
  const [stockReceives, setStockReceives] = useState([]);
  const [filteredStockReceives, setFilteredStockReceives] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState({});
  const [selectedStockReceive, setSelectedStockReceive] = useState(null);
  const [showStockReceiveDetails, setShowStockReceiveDetails] = useState(false);
  const [stockReceiveItems, setStockReceiveItems] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printStockReceive, setPrintStockReceive] = useState(null);
  const [printStockReceiveItems, setPrintStockReceiveItems] = useState([]);

  useEffect(() => {
    fetchStockReceives();
    fetchDailySummary();
  }, []);

  useEffect(() => {
    filterStockReceives();
  }, [stockReceives, searchTerm]);

  const fetchStockReceives = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT sr.*, 
          COUNT(sri.id) as items_count,
          GROUP_CONCAT(DISTINCT sri.supplier_name) as item_suppliers,
          GROUP_CONCAT(DISTINCT sri.sup_ref) as item_supplier_refs
         FROM stock_receives sr
         LEFT JOIN stock_receive_items sri ON sr.id = sri.stock_receive_id
         GROUP BY sr.id
         ORDER BY sr.created_at DESC`
      );
      setStockReceives(result || []);
    } catch (error) {
      console.error('Error fetching stock receives:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT 
          DATE(rec_date) as date,
          grn_no,
          COUNT(*) as receive_count,
          SUM(final_value) as total_value
         FROM stock_receives 
         GROUP BY DATE(rec_date), grn_no
         ORDER BY date DESC, grn_no DESC
         LIMIT 10`
      );
      
      // Group by date for display
      const grouped = {};
      result?.forEach(row => {
        if (!grouped[row.date]) {
          grouped[row.date] = {
            date: row.date,
            grn_numbers: [],
            total_receives: 0,
            total_value: 0
          };
        }
        grouped[row.date].grn_numbers.push(row.grn_no);
        grouped[row.date].total_receives += row.receive_count;
        grouped[row.date].total_value += row.total_value;
      });
      
      setDailySummary(grouped);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  };

  const filterStockReceives = () => {
    if (!searchTerm) {
      setFilteredStockReceives(stockReceives);
      return;
    }

    const filtered = stockReceives.filter(stockReceive =>
      (stockReceive.grn_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stockReceive.item_suppliers || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stockReceive.item_supplier_refs || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredStockReceives(filtered);
  };

  const handleViewStockReceiveDetails = async (stockReceive) => {
    setSelectedStockReceive(stockReceive);
    setShowStockReceiveDetails(true);
    
    // Fetch stock receive items
    try {
      const items = await window.electronAPI.database.query(
        'all',
        `SELECT sri.*, p.name as part_name, p.part_number 
         FROM stock_receive_items sri
         LEFT JOIN parts p ON sri.part_id = p.id
         WHERE sri.stock_receive_id = ? ORDER BY sri.id`,
        [stockReceive.id]
      );
      setStockReceiveItems(items || []);
    } catch (error) {
      console.error('Error fetching stock receive items:', error);
      setStockReceiveItems([]);
    }
  };

  const closeStockReceiveDetails = () => {
    setShowStockReceiveDetails(false);
    setSelectedStockReceive(null);
    setStockReceiveItems([]);
  };

  const handlePrintPreview = async (stockReceive) => {
    setPrintStockReceive(stockReceive);
    setShowPrintPreview(true);
    
    // Fetch stock receive items for printing
    try {
      const items = await window.electronAPI.database.query(
        'all',
        `SELECT sri.*, p.name as part_name, p.part_number 
         FROM stock_receive_items sri
         LEFT JOIN parts p ON sri.part_id = p.id
         WHERE sri.stock_receive_id = ? ORDER BY sri.id`,
        [stockReceive.id]
      );
      setPrintStockReceiveItems(items || []);
    } catch (error) {
      console.error('Error fetching stock receive items for print:', error);
      setPrintStockReceiveItems([]);
    }
  };

  const handlePrint = () => {
    setShowPrintPreview(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
    setPrintStockReceive(null);
    setPrintStockReceiveItems([]);
  };

  const PrintPreviewModal = () => (
    <div className="print-preview-overlay">
      <div className="print-preview-container">
        <div className="print-preview-header">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Print Preview - GRN</h3>
            <p className="text-sm text-gray-600">Review your GRN before printing</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiPrinter />
              Print
            </button>
            <button
              onClick={closePrintPreview}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FiX />
              Close
            </button>
          </div>
        </div>
        
        <div className="print-preview-content">
          {/* Company Header */}
          <div className="company-header">
            <div className="company-name">AutoParts Pro</div>
            <div className="company-details">
              166/3, Kaolin Refinery Road, Werahera, Boralesgamuwa, Sri Lanka.<br/>
              Tel: 0706333555<br/>
              E-mail: autoparts@email.com
            </div>
          </div>

          {/* GRN Title */}
          <div className="grn-title">GOODS RECEIVED NOTE</div>

          {/* GRN Header */}
          <div className="grn-header">
             <div className="grn-details">
               <div>GRN No: {printStockReceive?.grn_no}</div>
               <div>Date: {printStockReceive?.rec_date}</div>
             </div>
             <div className="grn-details">
               <div>Lot Name: {printStockReceive?.lot_name}</div>
               <div>Remarks: {printStockReceive?.remarks}</div>
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                 <th>Pro No</th>
                 <th>Item Description</th>
                 <th>Supplier</th>
                 <th>Supplier Ref</th>
                 <th style={{ textAlign: 'center' }}>Unit Price</th>
                <th style={{ textAlign: 'center' }}>Rec Qty</th>
                <th style={{ textAlign: 'right' }}>Item Value</th>
                <th style={{ textAlign: 'center' }}>Dis %</th>
                <th style={{ textAlign: 'right' }}>Discount Value</th>
                <th style={{ textAlign: 'right' }}>Final Value</th>
              </tr>
            </thead>
            <tbody>
              {printStockReceiveItems.map((item, index) => (
                <tr key={item.id}>
                   <td>{item.pro_no}</td>
                   <td>{item.item_description}</td>
                   <td>{item.supplier_name}</td>
                   <td>{item.sup_ref}</td>
                  <td style={{ textAlign: 'center' }}>LKR {item.unit_price?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'center' }}>{item.rec_qty}</td>
                  <td style={{ textAlign: 'right' }}>LKR {item.item_value?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'center' }}>{item.dis_percent?.toFixed(2) || '0.00'}%</td>
                  <td style={{ textAlign: 'right' }}>LKR {item.discount_value?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'right' }}>LKR {item.final_value?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - printStockReceiveItems.length) }).map((_, index) => (
                <tr key={`empty-${index}`}>
                   <td>&nbsp;</td>
                   <td>&nbsp;</td>
                   <td>&nbsp;</td>
                   <td>&nbsp;</td>
                   <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="totals-section">
            <div style={{ border: '1px solid black', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Total Value</span>
                <span>LKR {printStockReceive?.total_value?.toFixed(2) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Discount Value</span>
                <span>LKR {printStockReceive?.discount_value?.toFixed(2) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontWeight: 'bold' }}>
                <span>Final Value</span>
                <span>LKR {printStockReceive?.final_value?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">Received By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Checked By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Authorized By</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
            }
            
            .print-hidden {
              display: none !important;
            }
            
            .company-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid black;
              padding-bottom: 20px;
            }
            
            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
              color: black !important;
            }
            
            .company-details {
              font-size: 9px;
              line-height: 1.4;
              color: black !important;
            }
            
            .grn-title {
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
              color: black !important;
            }
            
            .grn-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .grn-details {
              font-size: 14px;
              line-height: 1.6;
              color: black !important;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 12px;
            }
            
            .items-table th,
            .items-table td {
              border: 1px solid black;
              padding: 5px;
              text-align: left;
              color: black !important;
            }
            
            .items-table th {
              background-color: #f0f0f0 !important;
              font-weight: bold;
            }
            
            .totals-section {
              margin-top: 20px;
              float: right;
              width: 300px;
            }
            
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              clear: both;
            }
            
            .signature-box {
              width: 200px;
              text-align: center;
            }
            
            .signature-line {
              border-top: 1px solid black;
              margin-top: 30px;
              padding-top: 5px;
              font-size: 12px;
            }
          }
          
          .print-preview-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          
          .print-preview-container {
            background: white;
            border-radius: 8px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          
          .print-preview-header {
            background: #f8f9fa;
            padding: 16px 20px;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px 8px 0 0;
          }
          
          .print-preview-content {
            padding: 40px;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
          }
          
          .print-preview-content .company-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid black;
            padding-bottom: 20px;
          }
          
          .print-preview-content .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: black;
          }
          
          .print-preview-content .company-details {
            font-size: 9px;
            line-height: 1.4;
            color: black;
          }
          
          .print-preview-content .grn-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            color: black;
          }
          
          .print-preview-content .grn-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          
          .print-preview-content .grn-details {
            font-size: 14px;
            line-height: 1.6;
            color: black;
          }
          
          .print-preview-content .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          
          .print-preview-content .items-table th,
          .print-preview-content .items-table td {
            border: 1px solid black;
            padding: 5px;
            text-align: left;
            color: black;
          }
          
          .print-preview-content .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .print-preview-content .totals-section {
            margin-top: 20px;
            float: right;
            width: 300px;
          }
          
          .print-preview-content .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            clear: both;
          }
          
          .print-preview-content .signature-box {
            width: 200px;
            text-align: center;
          }
          
          .print-preview-content .signature-line {
            border-top: 1px solid black;
            margin-top: 30px;
            padding-top: 5px;
            font-size: 12px;
          }
        `
      }} />
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Receives</h1>
        <Link to="/stock-receive" className="btn-primary flex items-center gap-2">
          <FiPlus />
          New Stock Receive
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by GRN number, supplier name, or supplier reference..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Daily Summary */}
      {Object.keys(dailySummary).length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily GRN Summary</h3>
          <div className="grid gap-3">
            {Object.values(dailySummary).map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <FiCalendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      GRN: {day.grn_numbers.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    LKR {day.total_value.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {day.total_receives} receipt{day.total_receives !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Receives List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading stock receives...</p>
          </div>
        ) : filteredStockReceives.length > 0 ? (
          filteredStockReceives.map(stockReceive => (
            <div key={stockReceive.id} className="card p-6 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    GRN #{stockReceive.grn_no}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(stockReceive.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    LKR {(stockReceive.final_value || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stockReceive.items_count || 0} items
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Receive Date: </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(stockReceive.rec_date).toLocaleDateString()}
                  </span>
                </p>
                {stockReceive.lot_name && (
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Lot Name: </span>
                    <span className="text-gray-900 dark:text-white">{stockReceive.lot_name}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleViewStockReceiveDetails(stockReceive)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4" />
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handlePrintPreview(stockReceive)}
                >
                  Print
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No stock receives found.</p>
            <Link to="/stock-receive" className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              Create your first stock receive
            </Link>
          </div>
        )}
      </div>

      {/* Stock Receive Details Modal */}
      {showStockReceiveDetails && selectedStockReceive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Stock Receive Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  GRN #{selectedStockReceive.grn_no} • Created {new Date(selectedStockReceive.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={closeStockReceiveDetails}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* GRN Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">GRN Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <FiFileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">GRN No:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedStockReceive.grn_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Receive Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedStockReceive.rec_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Value:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        LKR {selectedStockReceive.total_value?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {selectedStockReceive.discount_value > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Discount:</span>
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          -LKR {selectedStockReceive.discount_value?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Final Value:</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        LKR {selectedStockReceive.final_value?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Common GRN Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Common GRN Details</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    {selectedStockReceive.lot_name && (
                      <div className="flex items-center gap-2">
                        <FiShoppingCart className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Lot Name:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedStockReceive.lot_name}
                        </span>
                      </div>
                    )}
                    {selectedStockReceive.remarks && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Remarks:</span>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {selectedStockReceive.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Receive Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Received Items</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {stockReceiveItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Pro No
                            </th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                               Description
                             </th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                               Supplier
                             </th>
                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                               Supplier Ref
                             </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Rec Qty
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Item Value
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Dis %
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Discount Value
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Final Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                          {stockReceiveItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.pro_no}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.item_description}
                                {item.part_name && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.part_number}
                                  </p>
                                )}
                               </td>
                               <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                 {item.supplier_name || '-'}
                               </td>
                               <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                 {item.sup_ref || '-'}
                               </td>
                               <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.unit_price?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                {item.rec_qty}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.item_value?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                {item.dis_percent?.toFixed(2) || '0.00'}%
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.discount_value?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                                LKR {item.final_value?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <td colSpan="6" className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              Total:
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              LKR {stockReceiveItems.reduce((sum, item) => sum + (item.item_value || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">
                              LKR {stockReceiveItems.reduce((sum, item) => sum + (item.discount_value || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                              LKR {stockReceiveItems.reduce((sum, item) => sum + (item.final_value || 0), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No items found for this stock receive
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && <PrintPreviewModal />}
    </div>
    </>
  );
};

export default StockReceives;

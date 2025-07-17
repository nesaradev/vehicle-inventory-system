import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEye, FiX, FiCalendar, FiTruck, FiUser, FiFileText, FiDollarSign, FiPrinter } from 'react-icons/fi';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [printInvoiceItems, setPrintInvoiceItems] = useState([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT i.*, 
          COUNT(ii.id) as items_count
         FROM invoices i
         LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
         GROUP BY i.id
         ORDER BY i.created_at DESC`
      );
      setInvoices(result || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    if (!searchTerm) {
      setFilteredInvoices(invoices);
      return;
    }

    const filtered = invoices.filter(invoice =>
      (invoice.inv_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.vehicle_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredInvoices(filtered);
  };

  const handleViewInvoiceDetails = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
    
    // Fetch invoice items
    try {
      const items = await window.electronAPI.database.query(
        'all',
        `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id`,
        [invoice.id]
      );
      setInvoiceItems(items || []);
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      setInvoiceItems([]);
    }
  };

  const closeInvoiceDetails = () => {
    setShowInvoiceDetails(false);
    setSelectedInvoice(null);
    setInvoiceItems([]);
  };

  const handlePrintPreview = async (invoice) => {
    setPrintInvoice(invoice);
    setShowPrintPreview(true);
    
    // Fetch invoice items for printing
    try {
      const items = await window.electronAPI.database.query(
        'all',
        `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id`,
        [invoice.id]
      );
      setPrintInvoiceItems(items || []);
    } catch (error) {
      console.error('Error fetching invoice items for print:', error);
      setPrintInvoiceItems([]);
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
    setPrintInvoice(null);
    setPrintInvoiceItems([]);
  };

  const PrintPreviewModal = () => (
    <div className="print-preview-overlay">
      <div className="print-preview-container">
        <div className="print-preview-header">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Print Preview - Invoice</h3>
            <p className="text-sm text-gray-600">Review your invoice before printing</p>
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
            <div className="brand-badges">
              <img src="/badges/Volkswagen.png" alt="Volkswagen" />
              <img src="/badges/Audi.jpg" alt="Audi" />
              <img src="/badges/Seat.png" alt="Seat" />
              <img src="/badges/Skoda.jpg" alt="Skoda" />
            </div>
            <div className="company-name">EU Auto Parts</div>
            <div className="company-details">
              166/3, Kaolin Refinery Road, Werahera, Boralesgamuwa, Sri Lanka.<br/>
              Tel: 0706333555<br/>
              E-mail: euautoparts@gmail.com &nbsp;&nbsp;&nbsp;&nbsp; Reg No. - J 28994
            </div>
          </div>

          {/* Invoice Title */}
          <div className="invoice-title">INVOICE</div>

          {/* Invoice Header */}
          <div className="invoice-header">
            <div className="invoice-details">
              <div>Customer Name: {printInvoice?.customer_name}</div>
              <div>Address & Tel No:</div>
              <div>P.O #:</div>
            </div>
            <div className="invoice-details">
              <div>Inv No: {printInvoice?.inv_no}</div>
              <div>Date: {printInvoice?.invoice_date}</div>
              <div>Mode of Payment:</div>
            </div>
            <div className="invoice-details">
              <div>Vehicle #: {printInvoice?.vehicle_no}</div>
            </div>
          </div>

          {/* Parts Table */}
          <table className="parts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Unit Price</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {printInvoiceItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center' }}>LKR {item.unit_price?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>LKR {(item.selling_price * item.quantity)?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'right' }}>LKR {(item.discount * item.quantity)?.toFixed(2) || '0.00'}</td>
                  <td style={{ textAlign: 'right' }}>LKR {item.amount?.toFixed(2) || '0.00'}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - printInvoiceItems.length) }).map((_, index) => (
                <tr key={`empty-${index}`}>
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
                <span>Invoice Value</span>
                <span>LKR {printInvoice?.total_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Advance Paid</span>
                <span>LKR {printInvoice?.advance_paid?.toFixed(2) || '0.00'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontWeight: 'bold' }}>
                <span>Balance Amount</span>
                <span>LKR {printInvoice?.balance_due?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div>Transaction ID : _________________</div>
              <div className="signature-line">Invoiced By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Checked By</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Received By</div>
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
            
            .brand-badges {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            
            .brand-badges img {
              height: 50px;
              object-fit: contain;
              max-width: 120px;
            }
            
            .company-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
              color: black !important;
            }
            
            .company-details {
              font-size: 12px;
              line-height: 1.4;
              color: black !important;
            }
            
            .invoice-title {
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              margin: 20px 0;
              color: black !important;
            }
            
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            
            .invoice-details {
              font-size: 14px;
              line-height: 1.6;
              color: black !important;
            }
            
            .parts-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 12px;
            }
            
            .parts-table th,
            .parts-table td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
              color: black !important;
            }
            
            .parts-table th {
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
          
          .print-preview-content .brand-badges {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          
          .print-preview-content .brand-badges img {
            height: 50px;
            object-fit: contain;
            max-width: 120px;
          }
          
          .print-preview-content .company-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: black;
          }
          
          .print-preview-content .company-details {
            font-size: 12px;
            line-height: 1.4;
            color: black;
          }
          
          .print-preview-content .invoice-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
            color: black;
          }
          
          .print-preview-content .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          
          .print-preview-content .invoice-details {
            font-size: 14px;
            line-height: 1.6;
            color: black;
          }
          
          .print-preview-content .parts-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
          }
          
          .print-preview-content .parts-table th,
          .print-preview-content .parts-table td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
            color: black;
          }
          
          .print-preview-content .parts-table th {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <Link to="/add-invoice" className="btn-primary flex items-center gap-2">
          <FiPlus />
          New Invoice
        </Link>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, or vehicle number..."
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length > 0 ? (
          filteredInvoices.map(invoice => (
            <div key={invoice.id} className="card p-6 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Invoice #{invoice.inv_no}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    LKR {(invoice.balance_due || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {invoice.items_count || 0} items
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Customer: </span>
                  <span className="text-gray-900 dark:text-white">{invoice.customer_name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Vehicle: </span>
                  <span className="text-gray-900 dark:text-white">{invoice.vehicle_no}</span>
                </p>
                {invoice.job_no && (
                  <p className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Job No: </span>
                    <span className="text-gray-900 dark:text-white">{invoice.job_no}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleViewInvoiceDetails(invoice)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4" />
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handlePrintPreview(invoice)}
                >
                  Print
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No invoices found.</p>
            <Link to="/add-invoice" className="text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-block">
              Create your first invoice
            </Link>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {showInvoiceDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Invoice Details
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  #{selectedInvoice.inv_no} • Created {new Date(selectedInvoice.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={closeInvoiceDetails}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Invoice Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Invoice Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <FiFileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Invoice No:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedInvoice.inv_no}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCalendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                      </span>
                    </div>
                    {selectedInvoice.job_no && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Job No:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedInvoice.job_no}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        LKR {selectedInvoice.total_amount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Advance Paid:</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        LKR {selectedInvoice.advance_paid?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Balance Due:</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        LKR {selectedInvoice.balance_due?.toFixed(2) || '0.00'}
                      </span>
                    </div>
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
                        {selectedInvoice.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiTruck className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Vehicle:</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedInvoice.vehicle_no}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Invoice Items</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  {invoiceItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Code
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Unit Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Selling Price
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Discount
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                          {invoiceItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.code}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                                {item.description}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.unit_price?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.selling_price?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right text-gray-900 dark:text-white">
                                LKR {item.discount?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-4 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                                LKR {item.amount?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-100 dark:bg-gray-600">
                          <tr>
                            <td colSpan="6" className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              Total:
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                              LKR {invoiceItems.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="6" className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                              Advance Paid:
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-blue-600 dark:text-blue-400">
                              LKR {selectedInvoice.advance_paid?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="6" className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                              Balance Due:
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                              LKR {selectedInvoice.balance_due?.toFixed(2) || '0.00'}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                      No items found for this invoice
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

export default Invoices;
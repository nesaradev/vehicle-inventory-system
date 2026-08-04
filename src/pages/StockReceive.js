import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiSearch, FiPrinter, FiEye, FiX } from 'react-icons/fi';
import {
  findStockReceiveByDate,
  getLocalDate,
  saveDailyStockReceive
} from '../services/stockReceiveService';

const StockReceive = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [preventAutoSave, setPreventAutoSave] = useState(false);
  const preventAutoSaveRef = useRef(false);
  const [todaysReceiveCount, setTodaysReceiveCount] = useState(0);

  const [formData, setFormData] = useState({
    grn_no: '',
    rec_date: getLocalDate(),
    lot_name: '',
    remarks: '',
    items: [],
    total_value: 0,
    discount_value: 0,
    final_value: 0
  });

  const [selectedParts, setSelectedParts] = useState([]);
  const [undocumentedStock, setUndocumentedStock] = useState({});

  // Draft management functions
  const saveDraft = () => {
    if (preventAutoSaveRef.current) return; // Don't save if auto-save is prevented
    
    if (formData.lot_name || formData.remarks || selectedParts.length > 0) {
      const draftData = {
        formData,
        selectedParts,
        searchTerm,
        showPartSelector,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('stockReceiveDraft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('stockReceiveDraft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Update date to current date but keep other data
        const updatedFormData = {
          ...draftData.formData,
          rec_date: getLocalDate()
        };
        setFormData(updatedFormData);
        setSelectedParts((draftData.selectedParts || []).map((part, index) => ({
          ...part,
          line_id: part.line_id || `${part.id}-draft-${index}`,
          supplier_name: part.supplier_name || draftData.formData?.supplier_name || part.supplier || '',
          sup_ref: part.sup_ref || draftData.formData?.sup_ref || ''
        })));
        setSearchTerm(draftData.searchTerm || '');
        setShowPartSelector(draftData.showPartSelector || false);
        setIsDraftLoaded(true);
        setHasDraft(true);
        // Recalculate totals after loading
        setTimeout(() => calculateTotals(), 100);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('stockReceiveDraft');
    setHasDraft(false);
    setIsDraftLoaded(false);
  };

  const handleCancel = () => {
    // Prevent auto-save during and after reset
    setPreventAutoSave(true);
    preventAutoSaveRef.current = true;
    
    // Clear the draft
    clearDraft();
    
    // Reset form to initial state
    setFormData({
      grn_no: '',
      rec_date: getLocalDate(),
      lot_name: '',
      remarks: '',
      items: [],
      total_value: 0,
      discount_value: 0,
      final_value: 0
    });
    
    // Reset selected parts
    setSelectedParts([]);
    
    // Reset other state
    setSearchTerm('');
    setShowPartSelector(false);
    
    // Regenerate GRN number
    generateGRNNo();
    
    // Re-enable auto-save after a short delay
    setTimeout(() => {
      setPreventAutoSave(false);
      preventAutoSaveRef.current = false;
    }, 1000);
    
    window.electronAPI.notification.show('Info', 'Form cleared and draft removed');
  };

  const checkForDraft = () => {
    const savedDraft = localStorage.getItem('stockReceiveDraft');
    setHasDraft(!!savedDraft);
    return !!savedDraft;
  };

  const checkTodaysReceiveCount = async () => {
    try {
      const today = getLocalDate();
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT COUNT(*) as count FROM stock_receives WHERE DATE(rec_date) = ?`,
        [today]
      );
      setTodaysReceiveCount(result?.count || 0);
    } catch (error) {
      console.error('Error checking today\'s receive count:', error);
    }
  };

  const fetchUndocumentedStock = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT 
          sm.part_id,
          p.name,
          p.part_number,
          SUM(
            sm.quantity - COALESCE(
              sm.grn_documented_quantity,
              CASE WHEN sm.grn_documented = 1 THEN sm.quantity ELSE 0 END
            )
          ) as available_qty
         FROM stock_movements sm
         JOIN parts p ON sm.part_id = p.id
         WHERE sm.movement_type = 'IN'
         AND sm.quantity > COALESCE(
           sm.grn_documented_quantity,
           CASE WHEN sm.grn_documented = 1 THEN sm.quantity ELSE 0 END
         )
         GROUP BY sm.part_id, p.name, p.part_number
         HAVING available_qty > 0`
      );
      
      const undocumented = {};
      result?.forEach(row => {
        undocumented[row.part_id] = {
          available_qty: row.available_qty,
          name: row.name,
          part_number: row.part_number
        };
      });
      setUndocumentedStock(undocumented);
    } catch (error) {
      console.error('Error fetching undocumented stock:', error);
    }
  };

  useEffect(() => {
    fetchParts();
    generateGRNNo(getLocalDate());
    checkTodaysReceiveCount();
    fetchUndocumentedStock();
    
    // Check for existing draft on component mount
    if (checkForDraft()) {
      // Auto-load draft after a brief delay to let other initialization complete
      setTimeout(() => {
        loadDraft();
      }, 100);
    }
  }, []);

  // Auto-save draft periodically and when user navigates away
  useEffect(() => {
    // Auto-save every 30 seconds if there's meaningful data
    const autoSaveInterval = setInterval(() => {
      if (formData.lot_name || formData.remarks || selectedParts.length > 0) {
        saveDraft();
      }
    }, 30000);

    // Save draft when user navigates away
    const handleBeforeUnload = () => {
      if (!preventAutoSaveRef.current) saveDraft();
    };

    // Save draft when component unmounts (navigation)
    const handleUnload = () => {
      if (!preventAutoSaveRef.current) saveDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      clearInterval(autoSaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      // Save one final time when component unmounts
      if (!preventAutoSaveRef.current) saveDraft();
    };
  }, [formData, selectedParts, searchTerm, showPartSelector]);

  // Save draft when form data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.lot_name || formData.remarks || selectedParts.length > 0) {
        saveDraft();
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [formData, selectedParts]);

  const generateGRNNo = async (receiveDate = getLocalDate()) => {
    try {
      const existingGRN = await findStockReceiveByDate(
        window.electronAPI.database,
        receiveDate
      );
      
      if (existingGRN) {
        setFormData(prev => ({
          ...prev,
          grn_no: existingGRN.grn_no,
          lot_name: existingGRN.lot_name || '',
          remarks: existingGRN.remarks || ''
        }));
        console.log('Using existing GRN for receive date:', existingGRN.grn_no);
      } else {
        const result = await window.electronAPI.database.query(
          'get',
          `SELECT current_value FROM counters WHERE id = 'grn_no'`
        );

        let nextValue;
        if (result && result.current_value !== undefined) {
          nextValue = result.current_value + 1;
        } else {
          nextValue = 1;
          // Initialize counter if it doesn't exist
          await window.electronAPI.database.query(
            'run',
            `INSERT OR IGNORE INTO counters (id, current_value) VALUES ('grn_no', 0)`
          );
        }

        // Show preview without updating the counter
        const grnNo = `GRN${nextValue.toString().padStart(6, '0')}`;
        setFormData(prev => ({ ...prev, grn_no: grnNo }));
        console.log('Generated GRN preview for receive date:', grnNo);
      }
    } catch (error) {
      console.error('Error generating GRN No:', error);
    }
  };

  const generateNewGRNNo = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT current_value FROM counters WHERE id = 'grn_no'`
      );

      if (!result || result.current_value === undefined) {
        await window.electronAPI.database.query(
          'run',
          `INSERT OR IGNORE INTO counters (id, current_value) VALUES ('grn_no', 0)`
        );
      }

      const nextValue = (result?.current_value || 0) + 1;
      await window.electronAPI.database.query(
        'run',
        `UPDATE counters SET current_value = ? WHERE id = 'grn_no'`,
        [nextValue]
      );

      const grnNo = `GRN${nextValue.toString().padStart(6, '0')}`;
      console.log('Generated new GRN:', grnNo);
      return grnNo;
    } catch (error) {
      console.error('Error generating new GRN No:', error);
      return null;
    }
  };

  const fetchParts = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        'SELECT * FROM parts ORDER BY name'
      );
      setParts(result || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleAddPart = (part) => {
    const availableQty = undocumentedStock[part.id]?.available_qty || 0;
    
    if (availableQty <= 0) {
      window.electronAPI.notification.show('Error', 
        `No undocumented stock available for ${part.name}. Please add stock first through "Add Stock" function.`);
      return;
    }
    
    const allocatedQty = selectedParts
      .filter(selectedPart => selectedPart.id === part.id)
      .reduce((sum, selectedPart) => sum + selectedPart.rec_qty, 0);

    if (allocatedQty >= availableQty) {
      window.electronAPI.notification.show('Error',
        `All ${availableQty} available units for ${part.name} are already allocated to GRN rows.`);
      return;
    }

    const updated = [...selectedParts, {
      ...part,
      line_id: `${part.id}-${Date.now()}-${selectedParts.length}`,
      pro_no: part.pro_no || part.part_number,
      item_description: part.name,
      supplier_name: part.supplier || '',
      sup_ref: '',
      unit_price: part.cost_price || 0,
      rec_qty: 1,
      item_value: part.cost_price || 0,
      dis_percent: 0,
      discount_value: 0,
      final_value: part.cost_price || 0
    }];
    setSelectedParts(updated);
    setShowPartSelector(false);
    setSearchTerm('');
    calculateTotals(updated);
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...selectedParts];
    const part = updated[index];
    const availableQty = undocumentedStock[part.id]?.available_qty || 0;
    const otherRowsQty = selectedParts.reduce((sum, selectedPart, selectedIndex) => (
      selectedIndex !== index && selectedPart.id === part.id
        ? sum + selectedPart.rec_qty
        : sum
    ), 0);
    
    if (quantity <= 0) {
      updated.splice(index, 1);
    } else if (otherRowsQty + quantity > availableQty) {
      window.electronAPI.notification.show('Error', 
        `Cannot allocate ${otherRowsQty + quantity} units across these rows. Only ${availableQty} units are available for ${part.item_description}.`);
      return;
    } else {
      updated[index].rec_qty = quantity;
      updated[index].item_value = updated[index].unit_price * quantity;
      updated[index].discount_value = updated[index].item_value * updated[index].dis_percent / 100;
      updated[index].final_value = updated[index].item_value - updated[index].discount_value;
    }
    setSelectedParts(updated);
    calculateTotals(updated);
  };

  const handlePriceChange = (index, field, value) => {
    const updated = [...selectedParts];
    updated[index][field] = parseFloat(value) || 0;
    
    if (field === 'unit_price' || field === 'rec_qty') {
      updated[index].item_value = updated[index].unit_price * updated[index].rec_qty;
    }

    updated[index].discount_value = updated[index].item_value * updated[index].dis_percent / 100;
    updated[index].final_value = updated[index].item_value - updated[index].discount_value;
    
    setSelectedParts(updated);
    calculateTotals(updated);
  };

  const handleItemTextChange = (index, field, value) => {
    const updated = [...selectedParts];
    updated[index][field] = value;
    setSelectedParts(updated);
  };

  const calculateTotals = (partsToTotal = selectedParts) => {
    const totalValue = partsToTotal.reduce((sum, part) => sum + (part.item_value || 0), 0);
    const discountValue = partsToTotal.reduce((sum, part) => sum + (part.discount_value || 0), 0);
    const finalValue = totalValue - discountValue;
    
    setFormData(prev => ({
      ...prev,
      total_value: totalValue,
      discount_value: discountValue,
      final_value: finalValue
    }));
  };

  const handleRemovePart = (index) => {
    const updated = [...selectedParts];
    updated.splice(index, 1);
    setSelectedParts(updated);
    calculateTotals(updated);
  };

  const filteredParts = parts.filter(part => {
    const hasUndocumentedStock = undocumentedStock[part.id];
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.part_number.toLowerCase().includes(searchTerm.toLowerCase());
    return hasUndocumentedStock && matchesSearch;
  });

  const handleSave = async () => {
    if (selectedParts.length === 0) {
      window.electronAPI.notification.show('Error', 'Please add at least one part');
      return;
    }

    const itemWithoutSupplier = selectedParts.find(part => !part.supplier_name?.trim());
    if (itemWithoutSupplier) {
      window.electronAPI.notification.show('Error',
        `Please enter a supplier name for "${itemWithoutSupplier.item_description}".`);
      return;
    }

    const quantitiesByPart = selectedParts.reduce((quantities, part) => {
      quantities[part.id] = (quantities[part.id] || 0) + part.rec_qty;
      return quantities;
    }, {});

    for (const [partId, requestedQty] of Object.entries(quantitiesByPart)) {
      const availableQty = undocumentedStock[partId]?.available_qty || 0;
      if (requestedQty > availableQty) {
        const part = selectedParts.find(selectedPart => String(selectedPart.id) === partId);
        window.electronAPI.notification.show('Error', 
          `Cannot save GRN. The combined rows for "${part?.item_description || 'this part'}" request ${requestedQty} units, but only ${availableQty} are available.`);
        return;
      }
    }

    setLoading(true);
    try {
      const saveResult = await saveDailyStockReceive({
        database: window.electronAPI.database,
        formData,
        selectedParts,
        generateNewGRNNo
      });

      setFormData(prev => ({ ...prev, grn_no: saveResult.grnNo }));
      clearDraft();
      checkTodaysReceiveCount();
      fetchUndocumentedStock();

      const successMessage = saveResult.appended
        ? `${saveResult.itemsAdded} item(s) added to existing GRN #${saveResult.grnNo}`
        : `Stock received successfully - GRN #${saveResult.grnNo}`;
      window.electronAPI.notification.show('Success', successMessage);
      navigate('/stock-receives');
    } catch (error) {
      console.error('Error saving stock receive:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        window.electronAPI.notification.show('Error', 'GRN number already exists');
      } else if (error.message?.includes('no such table: stock_receives')) {
        window.electronAPI.notification.show('Error', 'Database not ready. Please restart the application.');
      } else {
        window.electronAPI.notification.show('Error', `Failed to save stock receive: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handlePrint = () => {
    setShowPrintPreview(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
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
              E-mail: vishwa.motors@yahoo.com
            </div>
          </div>

          {/* GRN Title */}
          <div className="grn-title">GOODS RECEIVED NOTE</div>

          {/* GRN Header */}
          <div className="grn-header">
             <div className="grn-details">
               <div>GRN No: {formData.grn_no}</div>
               <div>Date: {formData.rec_date}</div>
             </div>
             <div className="grn-details">
               <div>Lot Name: {formData.lot_name}</div>
               <div>Remarks: {formData.remarks}</div>
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
              {selectedParts.map((part, index) => (
                <tr key={part.line_id || `${part.id}-${index}`}>
                  <td>{part.pro_no}</td>
                  <td>{part.item_description}</td>
                  <td>{part.supplier_name}</td>
                  <td>{part.sup_ref}</td>
                  <td style={{ textAlign: 'center' }}>LKR {part.unit_price.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{part.rec_qty}</td>
                  <td style={{ textAlign: 'right' }}>LKR {part.item_value.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{part.dis_percent.toFixed(2)}%</td>
                  <td style={{ textAlign: 'right' }}>LKR {part.discount_value.toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>LKR {part.final_value.toFixed(2)}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - selectedParts.length) }).map((_, index) => (
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
                <span>LKR {formData.total_value.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Discount Value</span>
                <span>LKR {formData.discount_value.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontWeight: 'bold' }}>
                <span>Final Value</span>
                <span>LKR {formData.final_value.toFixed(2)}</span>
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
    <div className="max-w-7xl mx-auto p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Stock Receive (GRN)</h1>
              <p className="text-sm text-gray-400 mt-1">
                Goods Received Note - For tracking and documenting daily stock receipts only
              </p>
            </div>
            
            {/* Draft Status Indicator */}
            {hasDraft && (
              <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-600 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-400 text-sm font-medium">Draft Saved</span>
                <button
                  onClick={clearDraft}
                  className="text-yellow-400 hover:text-yellow-300 ml-2 text-xs underline"
                  title="Clear draft"
                >
                  Clear
                </button>
              </div>
            )}
            
            {/* Today's Receive Count */}
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-600 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 text-sm font-medium">
                Today's Receipts: {todaysReceiveCount}
              </span>
            </div>
          </div>
        </div>

        {/* Information Notice */}
        <div className="mb-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-blue-400 mt-0.5">ℹ️</div>
            <div>
              <h3 className="text-blue-400 font-semibold">Important: Daily GRN System with Stock Validation</h3>
              <p className="text-blue-300 text-sm mt-1">
                One GRN number per day for all stock received on that date. Saving again on the same date appends every selected item to the existing GRN. <strong>GRN quantities must match stock added through "Add Stock" function.</strong>
                You can only document stock that has been previously added but not yet documented in a GRN. The system will prevent saving if quantities exceed available undocumented stock.
              </p>
            </div>
          </div>
        </div>

        {/* Header Form */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">GRN No</label>
            <div className="relative">
              <input
                type="text"
                value={formData.grn_no}
                readOnly
                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
              />
              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-yellow-400">
                (Daily GRN)
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rec Date</label>
            <input
              type="date"
              value={formData.rec_date}
              onChange={(e) => {
                const receiveDate = e.target.value;
                setFormData(prev => ({ ...prev, rec_date: receiveDate }));
                generateGRNNo(receiveDate);
              }}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Lot Name</label>
            <input
              type="text"
              value={formData.lot_name}
              onChange={(e) => setFormData(prev => ({ ...prev, lot_name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Lot/Batch name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional remarks"
            />
          </div>
        </div>

        {/* Parts & Services Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Items</h3>
            <div className="flex gap-2">
              <button
                onClick={fetchUndocumentedStock}
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                title="Refresh available stock data"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => setShowPartSelector(!showPartSelector)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FiPlus />
                Add Item
              </button>
            </div>
          </div>

          {showPartSelector && (
            <div className="bg-gray-750 rounded-lg p-4 mb-4 border border-gray-600">
              <div className="relative mb-4">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parts..."
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-10 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredParts.map(part => (
                  <div
                    key={part.id}
                    onClick={() => handleAddPart(part)}
                    className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-white">{part.name}</p>
                        <p className="text-sm text-gray-400">
                          {part.part_number} • Stock: {part.current_stock}
                        </p>
                        <p className="text-sm text-green-400">
                          Available for GRN: {undocumentedStock[part.id]?.available_qty || 0}
                        </p>
                      </div>
                      <p className="font-medium text-white">
                        LKR {part.cost_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
                {filteredParts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      {Object.keys(undocumentedStock).length === 0 
                        ? "No parts have undocumented stock. Please add stock first using 'Add Stock' function."
                        : "No parts match your search that have undocumented stock available."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border border-gray-600 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="bg-gray-700">
                <tr>
                   <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Pro No</th>
                   <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Item Description</th>
                   <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Supplier Name</th>
                   <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Supplier Ref</th>
                   <th className="border-r border-gray-600 px-3 py-3 text-center font-medium text-gray-200">Unit Price</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-center font-medium text-gray-200">Rec Qty</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Item Value</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-center font-medium text-gray-200">Dis %</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Discount Value</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Final Value</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-200">Action</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {selectedParts.map((part, index) => (
                  <tr key={part.line_id || `${part.id}-${index}`} className="border-t border-gray-700">
                    <td className="border-r border-gray-700 px-3 py-2 text-white">{part.pro_no}</td>
                    <td className="border-r border-gray-700 px-3 py-2 text-white">
                      {part.item_description}
                      <br />
                      <span className="text-xs text-green-400">
                        Max: {undocumentedStock[part.id]?.available_qty || 0}
                      </span>
                     </td>
                     <td className="border-r border-gray-700 px-3 py-2">
                       <input
                         type="text"
                         value={part.supplier_name || ''}
                         onChange={(e) => handleItemTextChange(index, 'supplier_name', e.target.value)}
                         className="w-36 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                         placeholder="Supplier name"
                       />
                     </td>
                     <td className="border-r border-gray-700 px-3 py-2">
                       <input
                         type="text"
                         value={part.sup_ref || ''}
                         onChange={(e) => handleItemTextChange(index, 'sup_ref', e.target.value)}
                         className="w-28 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                         placeholder="Reference"
                       />
                     </td>
                     <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={part.unit_price}
                        onChange={(e) => handlePriceChange(index, 'unit_price', e.target.value)}
                        className="w-20 text-center bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 font-medium text-sm"
                      />
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        max={undocumentedStock[part.id]?.available_qty || 0}
                        value={part.rec_qty}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        className={`w-16 text-center bg-gray-700 border rounded px-2 py-1 font-medium text-sm ${
                          part.rec_qty > (undocumentedStock[part.id]?.available_qty || 0) 
                            ? 'border-red-500 text-red-400' 
                            : 'border-gray-600 text-white'
                        }`}
                      />
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-right text-white font-medium">
                      LKR {part.item_value?.toFixed(2) || '0.00'}
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={part.dis_percent}
                        onChange={(e) => handlePriceChange(index, 'dis_percent', e.target.value)}
                        className="w-16 text-center bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 font-medium text-sm"
                      />
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-right text-white font-medium">
                      LKR {part.discount_value?.toFixed(2) || '0.00'}
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-right text-white font-medium">
                      LKR {part.final_value?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemovePart(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Empty rows to fill space */}
                {Array.from({ length: Math.max(0, 8 - selectedParts.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-t border-gray-700">
                    <td className="border-r border-gray-700 px-3 py-3 h-12">&nbsp;</td>
                     <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                     <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                     <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                     <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                     <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                    <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                    <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                    <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                    <td className="border-r border-gray-700 px-3 py-3">&nbsp;</td>
                    <td className="px-3 py-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="mt-4 flex justify-end">
            <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">Total Value</p>
                  <p className="text-lg font-bold text-white">LKR {formData.total_value.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Discount Value</p>
                  <p className="text-lg font-bold text-red-400">LKR {formData.discount_value.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Final Value</p>
                  <p className="text-lg font-bold text-green-400">LKR {formData.final_value.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
          <button
            onClick={handleCancel}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <FiX />
            Cancel
          </button>
          <button
            onClick={handlePrintPreview}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiEye />
            Print Preview
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FiSave />
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* Print Preview Modal */}
      {showPrintPreview && <PrintPreviewModal />}
    </div>
    </>
  );
};

export default StockReceive;

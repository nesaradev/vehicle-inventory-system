import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPrinter, FiPlus, FiTrash2, FiSearch, FiX, FiEye } from 'react-icons/fi';
import InvoicePrintHeader from '../components/InvoicePrintHeader';

const Invoice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [jobNumbers, setJobNumbers] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [preventAutoSave, setPreventAutoSave] = useState(false);
  const preventAutoSaveRef = useRef(false);
  const [jobNoSearch, setJobNoSearch] = useState('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const [formData, setFormData] = useState({
    // Invoice header
    inv_no: '',
    customer_name: '',
    date: new Date().toISOString().split('T')[0],
    job_no: '',
    vehicle_no: '',
    
    // Invoice items
    items: [],
    
    // Customer totals
    customer_total_outstanding: 0,
    advance_paid: 0,
    balance_due: 0
  });

  const [selectedParts, setSelectedParts] = useState([]);
  const [vehicleInvoiceHistory, setVehicleInvoiceHistory] = useState([]);

  // Draft management functions
  const saveDraft = () => {
    if (preventAutoSaveRef.current) return; // Don't save if auto-save is prevented
    
    if (formData.customer_name || formData.vehicle_no || selectedParts.length > 0) {
      const draftData = {
        formData,
        selectedParts,
        searchTerm,
        showPartSelector,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('invoiceDraft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  };

  const loadDraft = async () => {
    try {
      const savedDraft = localStorage.getItem('invoiceDraft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        
        // Validate that the job_no in the draft still exists
        if (draftData.formData.job_no) {
          const jobExists = await window.electronAPI.database.query(
            'get',
            `SELECT * FROM job_cards WHERE job_no = ?`,
            [draftData.formData.job_no]
          );
          
          if (!jobExists) {
            // Job card doesn't exist anymore - clear the draft
            console.log('Draft contains invalid job number, clearing draft');
            clearDraft();
            return;
          }
        }
        
        // Update date to current date but keep other data
        const updatedFormData = {
          ...draftData.formData,
          date: new Date().toISOString().split('T')[0]
        };
        setFormData(updatedFormData);
        setSelectedParts(draftData.selectedParts || []);
        setSearchTerm(draftData.searchTerm || '');
        setShowPartSelector(draftData.showPartSelector || false);
        setIsDraftLoaded(true);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('invoiceDraft');
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
      // Invoice header
      inv_no: '',
      customer_name: '',
      date: new Date().toISOString().split('T')[0],
      job_no: '',
      vehicle_no: '',
      
      // Invoice items
      items: [],
      
      // Customer totals
      customer_total_outstanding: 0,
      advance_paid: 0,
      balance_due: 0
    });
    
    // Reset selected parts
    setSelectedParts([]);
    
    // Reset other state
    setSearchTerm('');
    setShowPartSelector(false);
    setIsReadOnly(false);
    setVehicleInvoiceHistory([]);
    
    // Don't regenerate temp invoice number after cancel - let user start fresh
    
    // Re-enable auto-save after a short delay
    setTimeout(() => {
      setPreventAutoSave(false);
      preventAutoSaveRef.current = false;
    }, 1000);
    
    window.electronAPI.notification.show('Info', 'Form cleared and draft removed');
  };

  const checkForDraft = () => {
    const savedDraft = localStorage.getItem('invoiceDraft');
    setHasDraft(!!savedDraft);
    return !!savedDraft;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.job-dropdown-container')) {
        setShowJobDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await fetchParts();
      await fetchJobNumbers();
      
      // Check for existing draft first
      if (checkForDraft()) {
        // Auto-load draft after a brief delay to let other initialization complete
        setTimeout(() => {
          loadDraft();
        }, 100);
      } else {
        // No draft, generate temp invoice number (this will check for pending estimates)
        generateTempInvoiceNo();
      }
    };
    
    initializeData();
  }, []);

  // Auto-save draft periodically and when user navigates away
  useEffect(() => {
    // Auto-save every 30 seconds if there's meaningful data
    const autoSaveInterval = setInterval(() => {
      if (formData.customer_name || formData.vehicle_no || selectedParts.length > 0) {
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
      if (formData.customer_name || formData.vehicle_no || selectedParts.length > 0) {
        saveDraft();
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [formData, selectedParts]);

  // Fetch vehicle invoice history when vehicle number changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.vehicle_no) {
        // Fetch regardless of job_no - we want to show history for any vehicle number
        fetchVehicleInvoiceHistory(formData.vehicle_no);
      } else {
        // Clear history if vehicle number is empty
        setVehicleInvoiceHistory([]);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [formData.vehicle_no, formData.job_no]);

  const generateTempInvoiceNo = async () => {
    try {
      // First check if there are estimates without invoices (should reuse those numbers)
      const estimateWithoutInvoice = await window.electronAPI.database.query(
        'get',
        `SELECT e.invoice_no, e.job_no 
         FROM estimates e 
         LEFT JOIN invoices i ON e.job_no = i.job_no 
         WHERE i.job_no IS NULL 
         ORDER BY e.created_at ASC 
         LIMIT 1`
      );
      
      if (estimateWithoutInvoice) {
        // Verify that the job card still exists before using it
        const jobExists = await window.electronAPI.database.query(
          'get',
          `SELECT * FROM job_cards WHERE job_no = ?`,
          [estimateWithoutInvoice.job_no]
        );
        
        if (jobExists) {
          // Job card exists - suggest reusing that number and auto-select job
          setFormData(prev => ({ 
            ...prev, 
            inv_no: estimateWithoutInvoice.invoice_no,
            job_no: estimateWithoutInvoice.job_no,
            vehicle_no: jobExists.vehicle_no,
            customer_name: jobExists.customer_name,
            advance_paid: jobExists.advance || 0,
            date: jobExists.job_date || new Date().toISOString().split('T')[0]
          }));
          return;
        } else {
          // Job card doesn't exist anymore - clean up the orphaned estimate
          // First get the estimate ID to delete its items
          const estimateToDelete = await window.electronAPI.database.query(
            'get',
            `SELECT id FROM estimates WHERE job_no = ?`,
            [estimateWithoutInvoice.job_no]
          );
          
          if (estimateToDelete) {
            // Delete estimate items first
            await window.electronAPI.database.query(
              'run',
              `DELETE FROM estimate_items WHERE estimate_id = ?`,
              [estimateToDelete.id]
            );
            
            // Then delete the estimate
            await window.electronAPI.database.query(
              'run',
              `DELETE FROM estimates WHERE id = ?`,
              [estimateToDelete.id]
            );
          }
        }
      }

      // No valid pending estimates, generate next available number
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT current_value FROM counters WHERE id = 'invoice_no'`
      );

      let nextValue;
      if (result && result.current_value !== undefined) {
        nextValue = result.current_value + 1;
      } else {
        nextValue = 1;
        // Initialize counter if it doesn't exist
        await window.electronAPI.database.query(
          'run',
          `INSERT OR IGNORE INTO counters (id, current_value) VALUES ('invoice_no', 0)`
        );
      }

      // Show preview without updating the counter
      const invoiceNo = `INV${nextValue.toString().padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, inv_no: invoiceNo }));
    } catch (error) {
      console.error('Error generating temp Invoice No:', error);
    }
  };

  const generateActualInvoiceNo = async () => {
    try {
      // Check if we're reusing an existing estimate's invoice number
      if (formData.job_no) {
        const existingEstimate = await window.electronAPI.database.query(
          'get',
          `SELECT invoice_no FROM estimates WHERE job_no = ?`,
          [formData.job_no]
        );
        
        if (existingEstimate && existingEstimate.invoice_no) {
          // Reuse existing estimate's invoice number - don't increment counter
          return existingEstimate.invoice_no;
        }
      }

      // Generate new invoice number and increment counter
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT current_value FROM counters WHERE id = 'invoice_no'`
      );

      let nextValue;
      if (result && result.current_value !== undefined) {
        nextValue = result.current_value + 1;
      } else {
        nextValue = 1;
      }

      // Actually update the counter
      await window.electronAPI.database.query(
        'run',
        `UPDATE counters SET current_value = ? WHERE id = 'invoice_no'`,
        [nextValue]
      );

      const invoiceNo = `INV${nextValue.toString().padStart(6, '0')}`;
      return invoiceNo;
    } catch (error) {
      console.error('Error generating actual Invoice No:', error);
      return null;
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

  const fetchJobNumbers = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT jc.job_no, jc.customer_name, jc.vehicle_no, jc.advance, jc.created_at,
                jc.id_no, jc.address, jc.mob_no, jc.tel_no, jc.email, jc.job_date,
                jc.make, jc.model, jc.color, jc.insurance_company, jc.status, jc.id,
                i.inv_no as existing_invoice_no
         FROM job_cards jc 
         LEFT JOIN invoices i ON jc.job_no = i.job_no
         WHERE jc.status = 'completed'
         ORDER BY jc.created_at DESC`
      );
      setJobNumbers(result || []);
    } catch (error) {
      console.error('Error fetching job numbers:', error);
    }
  };

  const fetchVehicleInvoiceHistory = async (vehicleNo) => {
    if (!vehicleNo) {
      setVehicleInvoiceHistory([]);
      return;
    }

    try {
      // Clean the vehicle number (trim whitespace and normalize case)
      const cleanVehicleNo = vehicleNo.trim();
      
      // Create normalized version without special characters for fuzzy matching
      const normalizedVehicleNo = cleanVehicleNo.replace(/[-\s]/g, '').toUpperCase();
      
      // First try exact match
      let result = await window.electronAPI.database.query(
        'all',
        `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
         FROM invoices i 
         WHERE TRIM(i.vehicle_no) = ? 
         ORDER BY i.invoice_date DESC, i.created_at DESC`,
        [cleanVehicleNo]
      );

      // If no exact match, try case-insensitive search
      if (!result || result.length === 0) {
        result = await window.electronAPI.database.query(
          'all',
          `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
           FROM invoices i 
           WHERE UPPER(TRIM(i.vehicle_no)) = UPPER(?) 
           ORDER BY i.invoice_date DESC, i.created_at DESC`,
          [cleanVehicleNo]
        );
      }

      // If still no results, try normalized match (remove dashes and spaces)
      if (!result || result.length === 0) {
        result = await window.electronAPI.database.query(
          'all',
          `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
           FROM invoices i 
           WHERE UPPER(REPLACE(REPLACE(TRIM(i.vehicle_no), '-', ''), ' ', '')) = ? 
           ORDER BY i.invoice_date DESC, i.created_at DESC`,
          [normalizedVehicleNo]
        );
      }

      // If still no results, try partial match
      if (!result || result.length === 0) {
        result = await window.electronAPI.database.query(
          'all',
          `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
           FROM invoices i 
           WHERE UPPER(TRIM(i.vehicle_no)) LIKE UPPER(?) 
           ORDER BY i.invoice_date DESC, i.created_at DESC`,
          [`%${cleanVehicleNo}%`]
        );
      }

      // If still no results, try to find invoices by job card vehicle number (exact)
      if (!result || result.length === 0) {
        result = await window.electronAPI.database.query(
          'all',
          `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
           FROM invoices i 
           JOIN job_cards jc ON i.job_no = jc.job_no
           WHERE UPPER(TRIM(jc.vehicle_no)) = UPPER(?) 
           ORDER BY i.invoice_date DESC, i.created_at DESC`,
          [cleanVehicleNo]
        );
      }

      // If still no results, try job card vehicle number with normalization
      if (!result || result.length === 0) {
        result = await window.electronAPI.database.query(
          'all',
          `SELECT i.inv_no, i.invoice_date, i.vehicle_no, i.balance_due 
           FROM invoices i 
           JOIN job_cards jc ON i.job_no = jc.job_no
           WHERE UPPER(REPLACE(REPLACE(TRIM(jc.vehicle_no), '-', ''), ' ', '')) = ? 
           ORDER BY i.invoice_date DESC, i.created_at DESC`,
          [normalizedVehicleNo]
        );
      }

      
      setVehicleInvoiceHistory(result || []);
    } catch (error) {
      console.error('Error fetching vehicle invoice history:', error);
      setVehicleInvoiceHistory([]);
    }
  };

  const handleJobSelect = async (jobNo) => {
    if (!jobNo) return;
    
    // Find selected job from the loaded list first
    let selectedJob = jobNumbers.find(job => job.job_no === jobNo);
    
    // If not found in the loaded list, fetch directly from database
    if (!selectedJob) {
      try {
        selectedJob = await window.electronAPI.database.query(
          'get',
          `SELECT jc.job_no, jc.customer_name, jc.vehicle_no, jc.advance, jc.created_at,
                  jc.id_no, jc.address, jc.mob_no, jc.tel_no, jc.email, jc.job_date,
                  jc.make, jc.model, jc.color, jc.insurance_company, jc.status, jc.id,
                  i.inv_no as existing_invoice_no
           FROM job_cards jc 
           LEFT JOIN invoices i ON jc.job_no = i.job_no
           WHERE jc.job_no = ? AND jc.status = 'completed'`,
          [jobNo]
        );
      } catch (error) {
        console.error('Error fetching job details:', error);
        window.electronAPI.notification.show('Error', 'Failed to load job details');
        return;
      }
    }
    
    if (!selectedJob) {
      window.electronAPI.notification.show('Error', 'Job card not found or not completed');
      return;
    }
    
    // Check if this job already has an invoice
    if (selectedJob.existing_invoice_no) {
      // Load existing invoice data in read-only mode
      await loadExistingInvoice(jobNo);
      return;
    }
    
    try {
      // Load job card parts from the job_card_parts table
      const jobParts = await window.electronAPI.database.query(
        'all',
        `SELECT jp.*, p.name, p.part_number, p.pro_no, p.final_selling_price 
         FROM job_card_parts jp
         JOIN parts p ON jp.part_id = p.id
         WHERE jp.job_card_id = ?`,
        [selectedJob.id]
      );
      
      // Convert job parts to invoice parts format
      const invoiceParts = jobParts.map(jp => ({
        id: jp.part_id,
        part_id: jp.part_id,
        code: jp.pro_no || jp.part_number,
        description: jp.name,
        quantity: jp.quantity_used || jp.quantity,
        unit_price: jp.unit_price,
        selling_price: jp.unit_price * (jp.quantity_used || jp.quantity),
        discount: 0,
        amount: jp.unit_price * (jp.quantity_used || jp.quantity)
      }));
      
      // Check if there's an existing estimate for this job number
      const existingEstimate = await window.electronAPI.database.query(
        'get',
        `SELECT invoice_no FROM estimates WHERE job_no = ?`,
        [jobNo]
      );
      
      let invoiceNo;
      if (existingEstimate && existingEstimate.invoice_no) {
        // Use existing estimate's invoice number
        invoiceNo = existingEstimate.invoice_no;
      } else {
        // Generate new temp invoice number
        const result = await window.electronAPI.database.query(
          'get',
          `SELECT current_value FROM counters WHERE id = 'invoice_no'`
        );
        let nextValue = result && result.current_value !== undefined ? result.current_value + 1 : 1;
        invoiceNo = `INV${nextValue.toString().padStart(6, '0')}`;
      }
      
      // Auto-fill all the job details and parts
      setFormData(prev => ({
        ...prev,
        job_no: selectedJob.job_no,
        vehicle_no: selectedJob.vehicle_no,
        customer_name: selectedJob.customer_name,
        advance_paid: selectedJob.advance || 0,
        date: selectedJob.job_date || new Date().toISOString().split('T')[0],
        inv_no: invoiceNo
      }));
      
      // Load the job card parts into selected parts
      setSelectedParts(invoiceParts);
      setIsReadOnly(false); // Allow users to still add manual parts and edit if needed
      
      // Fetch invoice history for this vehicle
      await fetchVehicleInvoiceHistory(selectedJob.vehicle_no);
      
      window.electronAPI.notification.show('Success', `Job details and parts loaded for ${jobNo}`);
      
    } catch (error) {
      console.error('Error loading job card parts:', error);
      window.electronAPI.notification.show('Error', 'Failed to load job card details');
    }
  };

  const loadExistingInvoice = async (jobNo) => {
    try {
      // Load existing invoice data
      const invoice = await window.electronAPI.database.query(
        'get',
        `SELECT * FROM invoices WHERE job_no = ?`,
        [jobNo]
      );
      
      if (invoice) {
        // Load invoice items
        const invoiceItems = await window.electronAPI.database.query(
          'all',
          `SELECT * FROM invoice_items WHERE invoice_id = ?`,
          [invoice.id]
        );
        
        setFormData({
          inv_no: invoice.inv_no,
          customer_name: invoice.customer_name,
          date: invoice.invoice_date,
          job_no: invoice.job_no,
          vehicle_no: invoice.vehicle_no,
          items: invoiceItems || [],
          customer_total_outstanding: invoice.total_amount || 0,
          advance_paid: invoice.advance_paid || 0,
          balance_due: invoice.balance_due || 0
        });
        
        setSelectedParts(invoiceItems || []);
        setIsReadOnly(true);
        
        // Fetch invoice history for this vehicle
        await fetchVehicleInvoiceHistory(invoice.vehicle_no);
        
        window.electronAPI.notification.show('Info', 'Showing existing invoice in read-only mode');
      }
    } catch (error) {
      console.error('Error loading existing invoice:', error);
      window.electronAPI.notification.show('Error', 'Failed to load existing invoice');
    }
  };

  const handleAddPart = (part) => {
    const existingIndex = selectedParts.findIndex(p => p.id === part.id);
    if (existingIndex >= 0) {
      const updated = [...selectedParts];
      const newQuantity = updated[existingIndex].quantity + 1;
      
      // Check stock availability before increasing quantity
      if (newQuantity > part.current_stock) {
        window.electronAPI.notification.show(
          'Error', 
          `Stock limit exceeded! Only ${part.current_stock} units available for ${part.name}`
        );
        return;
      }
      
      updated[existingIndex].quantity = newQuantity;
      updated[existingIndex].amount = (updated[existingIndex].selling_price - updated[existingIndex].discount) * updated[existingIndex].quantity;
      setSelectedParts(updated);
    } else {
      // Check stock availability for new part
      if (part.current_stock <= 0) {
        window.electronAPI.notification.show(
          'Error', 
          `No stock available for ${part.name}`
        );
        return;
      }
      
      setSelectedParts([...selectedParts, {
        ...part,
        part_id: part.id, // Explicitly set part_id for stock reduction
        code: part.pro_no || part.part_number,
        description: part.name,
        quantity: 1,
        unit_price: part.final_selling_price || part.selling_price || 0,
        discount: 0,
        selling_price: part.final_selling_price || part.selling_price || 0,
        amount: part.final_selling_price || part.selling_price || 0
      }]);
    }
    setShowPartSelector(false);
    setSearchTerm('');
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...selectedParts];
    if (quantity <= 0) {
      updated.splice(index, 1);
    } else {
      const selectedPart = updated[index];
      
      // Check stock availability - only for parts with part_id (not manual entries)
      if (selectedPart.part_id) {
        const partInStock = parts.find(p => p.id === selectedPart.part_id);
        if (partInStock && quantity > partInStock.current_stock) {
          window.electronAPI.notification.show(
            'Error', 
            `Stock limit exceeded! Only ${partInStock.current_stock} units available for ${selectedPart.description}`
          );
          return; // Don't update quantity if stock is insufficient
        }
      }
      
      updated[index].quantity = quantity;
      updated[index].selling_price = updated[index].unit_price * quantity; // Update selling price
      updated[index].amount = updated[index].selling_price - updated[index].discount;
    }
    setSelectedParts(updated);
  };

  const handlePriceChange = (index, field, value) => {
    const updated = [...selectedParts];
    updated[index][field] = parseFloat(value) || 0;
    
    // Amount is always selling price - discount
    updated[index].amount = updated[index].selling_price - updated[index].discount;
    
    setSelectedParts(updated);
  };

  const calculateSubTotal = () => {
    return selectedParts.reduce((sum, part) => sum + part.amount, 0);
  };

  const calculateTotalDiscount = () => {
    return selectedParts.reduce((sum, part) => sum + (part.discount * part.quantity), 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubTotal() - calculateTotalDiscount();
  };

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const PrintPreviewModal = () => (
    <div className="print-preview-overlay">
      <div className="print-preview-container">
        <div className="print-preview-header">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Print Preview</h3>
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
          <InvoicePrintHeader />

          {/* Invoice Title */}
          <div className="invoice-title">INVOICE</div>

          {/* Invoice Header */}
          <div className="invoice-header">
            <div className="invoice-details">
              <div>Customer Name: {formData.customer_name}</div>
              <div>Address & Tel No:</div>
              <div>P.O #:</div>
            </div>
            <div className="invoice-details">
              <div>Inv No: {formData.inv_no}</div>
              <div>Date: {formData.date}</div>
              <div>Mode of Payment:</div>
            </div>
            <div className="invoice-details">
              <div>Vehicle #: {formData.vehicle_no}</div>
            </div>
          </div>

          {/* Parts Table */}
          <table className="parts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'center' }}>Unit Price</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {selectedParts.map((part, index) => (
                <tr key={part.id}>
                  <td>{part.part_no}</td>
                  <td>{part.description}</td>
                  <td style={{ textAlign: 'center' }}>LKR {part.selling_price.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{part.quantity}</td>
                  <td style={{ textAlign: 'right' }}>LKR {(part.selling_price * part.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>LKR {(part.discount * part.quantity).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>LKR {part.amount.toFixed(2)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="totals-section">
            <div style={{ border: '1px solid black', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Invoice Value</span>
                <span>LKR {calculateSubTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', paddingBottom: '4px', borderBottom: '1px solid black' }}>
                <span>Advance Paid</span>
                <span>LKR {formData.advance_paid.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontWeight: 'bold' }}>
                <span>Balance Amount</span>
                <span>LKR {(calculateGrandTotal() + formData.advance_paid).toFixed(2)}</span>
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

  const handleSave = async () => {
    if (!formData.customer_name) {
      window.electronAPI.notification.show('Error', 'Please fill in customer name');
      return;
    }

    if (!formData.job_no) {
      window.electronAPI.notification.show('Error', 'Please select a job number');
      return;
    }

    if (selectedParts.length === 0) {
      window.electronAPI.notification.show('Error', 'Please add at least one part');
      return;
    }

    setLoading(true);
    try {
      // Generate the actual invoice number only when saving
      const actualInvoiceNo = await generateActualInvoiceNo();
      if (!actualInvoiceNo) {
        throw new Error('Failed to generate invoice number');
      }

      const totalAmount = calculateSubTotal();
      const balanceDue = totalAmount + formData.advance_paid;

      // Save the invoice to database
      const result = await window.electronAPI.database.query(
        'run',
        `INSERT INTO invoices (
          inv_no, job_no, customer_name, vehicle_no, invoice_date,
          total_amount, advance_paid, balance_due
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actualInvoiceNo,
          formData.job_no,
          formData.customer_name,
          formData.vehicle_no,
          formData.date,
          totalAmount,
          formData.advance_paid,
          balanceDue
        ]
      );

      if (result && (result.lastInsertRowid || result.lastID)) {
        // Save invoice items and handle stock appropriately
        for (const part of selectedParts) {
          // Save invoice item
          await window.electronAPI.database.query(
            'run',
            `INSERT INTO invoice_items (
              invoice_id, code, description, quantity, unit_price,
              selling_price, discount, amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              result.lastInsertRowid || result.lastID,
              part.code,
              part.description,
              part.quantity,
              part.unit_price,
              part.selling_price,
              part.discount,
              part.amount
            ]
          );

          // Handle stock reduction based on whether this is from a job card or manual invoice
          if (part.part_id) {
            if (formData.job_no) {
              // This is from a completed job card - stock was already reduced when job was marked as completed
              // Do NOT reduce stock again, just document it in the invoice
              console.log(`Skipping stock reduction for part ${part.code} - already reduced during job completion`);
            } else {
              // This is a manual invoice - reduce stock now
              await window.electronAPI.database.query(
                'run',
                `UPDATE parts 
                 SET current_stock = current_stock - ?, 
                     updated_at = datetime('now','localtime')
                 WHERE id = ? AND current_stock >= ?`,
                [part.quantity, part.part_id, part.quantity]
              );

              // Record stock movement (OUT)
              await window.electronAPI.database.query(
                'run',
                `INSERT INTO stock_movements (
                  part_id, movement_type, quantity, cost_price, selling_price, 
                  final_selling_price, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
                [
                  part.part_id,
                  'OUT',
                  part.quantity,
                  part.unit_price,
                  part.selling_price,
                  part.selling_price - part.discount,
                  `Manual Invoice ${actualInvoiceNo}`
                ]
              );
            }
          }
        }

        // Update the form data with the actual invoice number
        setFormData(prev => ({ ...prev, inv_no: actualInvoiceNo }));

        // Clear draft after successful save
        clearDraft();
        window.electronAPI.notification.show('Success', `Invoice ${actualInvoiceNo} saved successfully`);
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      console.error('Error details:', error.message);
      if (error.message?.includes('UNIQUE constraint failed')) {
        window.electronAPI.notification.show('Error', 'Invoice number already exists');
      } else if (error.message?.includes('no such table: invoices')) {
        window.electronAPI.notification.show('Error', 'Database not ready. Please restart the application.');
      } else {
        window.electronAPI.notification.show('Error', `Failed to save invoice: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

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
            
            .print-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 20px !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
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
            
            .text-right {
              text-align: right !important;
            }
            
            .text-center {
              text-align: center !important;
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

      <div className="max-w-7xl mx-auto p-6 bg-gray-900 min-h-screen">
        {/* Header - Hidden in print */}
        <div className="mb-6 print-hidden">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Invoices</span>
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700 print-container">
          {/* Company Header - Only visible in print */}
          <InvoicePrintHeader className="company-header hidden print:block" />

          {/* Screen Title - Hidden in print */}
          <div className="flex justify-between items-center mb-6 print-hidden">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">INVOICE</h1>
              
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
            </div>
            <div className="flex gap-3">
              {isReadOnly && (
                <button
                  onClick={() => {
                    setIsReadOnly(false);
                    setFormData({
                      inv_no: '',
                      customer_name: '',
                      date: new Date().toISOString().split('T')[0],
                      job_no: '',
                      vehicle_no: '',
                      items: [],
                      customer_total_outstanding: 0,
                      advance_paid: 0,
                      balance_due: 0
                    });
                    setSelectedParts([]);
                    setVehicleInvoiceHistory([]);
                    generateTempInvoiceNo();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FiPlus />
                  New Invoice
                </button>
              )}
            </div>
          </div>
          
          {/* Print Title - Only visible in print */}
          <div className="invoice-title hidden print:block">INVOICE</div>

          {/* Invoice Header */}
          <div className="invoice-header hidden print:block">
            <div className="invoice-details">
              <div>Customer Name: {formData.customer_name}</div>
              <div>Address & Tel No:</div>
              <div>P.O #:</div>
            </div>
            <div className="invoice-details">
              <div>Inv No: {formData.inv_no}</div>
              <div>Date: {formData.date}</div>
              <div>Mode of Payment:</div>
            </div>
            <div className="invoice-details">
              <div>Vehicle #: {formData.vehicle_no}</div>
            </div>
          </div>

          {/* Screen Form - Hidden in print */}
          <div className="print-hidden">
            {/* Read-only notification only for existing invoices */}
            {isReadOnly && formData.job_no && (
              <div className="mb-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FiEye className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-blue-400 font-semibold">Viewing Existing Invoice</h3>
                    <p className="text-blue-300 text-sm">This invoice has already been created and is displayed in read-only mode.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Inv No.</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.inv_no}
                    readOnly
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                  />
                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-yellow-400">
                    (Preview)
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  readOnly={isReadOnly || !!formData.job_no}
                  className={`w-full border rounded px-3 py-2 text-sm ${
                    isReadOnly || formData.job_no 
                      ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder="Enter customer name"
                />
                {formData.job_no && (
                  <div className="mt-1 text-xs text-blue-400">
                    Auto-filled from Job Card
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  readOnly={isReadOnly}
                  className={`w-full border rounded px-3 py-2 text-sm ${
                    isReadOnly 
                      ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Days</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Job No.</label>
                <div className="relative job-dropdown-container">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={jobNoSearch}
                      onChange={(e) => {
                        setJobNoSearch(e.target.value);
                        setShowJobDropdown(true);
                      }}
                      onFocus={() => setShowJobDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowJobDropdown(false);
                        }
                      }}
                      placeholder="Search or select completed job..."
                      disabled={isReadOnly}
                      className={`flex-1 border rounded px-3 py-2 text-sm ${
                        isReadOnly 
                          ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
                      }`}
                    />
                    {formData.job_no && !isReadOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            job_no: '',
                            vehicle_no: '',
                            customer_name: '',
                            advance_paid: 0
                          }));
                          setJobNoSearch('');
                          setIsReadOnly(false);
                          setShowJobDropdown(false);
                          setSelectedParts([]);
                          setVehicleInvoiceHistory([]);
                          generateTempInvoiceNo();
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        title="Clear selection"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {showJobDropdown && !isReadOnly && (
                    <div className="absolute z-50 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {jobNumbers
                        .filter(job => 
                          job.job_no.toLowerCase().includes(jobNoSearch.toLowerCase()) ||
                          job.customer_name.toLowerCase().includes(jobNoSearch.toLowerCase()) ||
                          job.vehicle_no.toLowerCase().includes(jobNoSearch.toLowerCase())
                        )
                        .map(job => (
                          <div
                            key={job.job_no}
                            onClick={() => {
                              setJobNoSearch(job.job_no);
                              setShowJobDropdown(false);
                              handleJobSelect(job.job_no);
                            }}
                            className="px-3 py-2 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-white font-medium">{job.job_no}</div>
                                <div className="text-gray-400 text-sm">{job.customer_name} • {job.vehicle_no}</div>
                              </div>
                              {job.existing_invoice_no && (
                                <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-1 rounded">
                                  Already Invoiced
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      }
                      {jobNumbers.filter(job => 
                        job.job_no.toLowerCase().includes(jobNoSearch.toLowerCase()) ||
                        job.customer_name.toLowerCase().includes(jobNoSearch.toLowerCase()) ||
                        job.vehicle_no.toLowerCase().includes(jobNoSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-400 text-sm">
                          No matching completed job cards found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {formData.job_no && (
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs text-blue-400">
                      ✓ Selected: {formData.job_no}
                    </div>
                    {jobNumbers.find(job => job.job_no === formData.job_no)?.existing_invoice_no && (
                      <div className="text-xs text-orange-400">
                        View Mode - Already Invoiced
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle No.</label>
                <input
                  type="text"
                  value={formData.vehicle_no || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_no: e.target.value }))}
                  readOnly={isReadOnly}
                  className={`w-full border rounded px-3 py-2 text-sm ${
                    isReadOnly 
                      ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                      : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder="Enter vehicle number"
                />
                {formData.job_no && (
                  <div className="mt-1 text-xs text-blue-400">
                    Auto-filled from Job Card (editable)
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Parts & Services Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Parts & Services</h3>
            <button
              onClick={() => setShowPartSelector(!showPartSelector)}
              disabled={isReadOnly}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isReadOnly 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FiPlus />
              Add Part
            </button>
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
                      </div>
                      <p className="font-medium text-white">
                        LKR {part.final_selling_price?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Code</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Description</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-center font-medium text-gray-200">Qty</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-center font-medium text-gray-200">Unit Price</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Discount</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Selling Price</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-200">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {selectedParts.map((part, index) => (
                  <tr key={part.id} className="border-t border-gray-700">
                    <td className="border-r border-gray-700 px-3 py-2 text-white">{part.code}</td>
                    <td className="border-r border-gray-700 px-3 py-2 text-white">{part.description}</td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                        readOnly={isReadOnly}
                        className={`w-16 text-center border rounded px-2 py-1 font-medium text-sm ${
                          isReadOnly 
                            ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                            : 'bg-gray-700 border-gray-600 text-white'
                        }`}
                        style={{ WebkitAppearance: 'textfield', MozAppearance: 'textfield' }}
                      />
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center text-white">
                      LKR {part.unit_price.toFixed(2)}
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={part.discount}
                        onChange={(e) => handlePriceChange(index, 'discount', e.target.value)}
                        readOnly={isReadOnly}
                        className={`w-20 text-right border rounded px-2 py-1 font-medium text-sm ${
                          isReadOnly 
                            ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                            : 'bg-gray-700 border-gray-600 text-white'
                        }`}
                        style={{ WebkitAppearance: 'textfield', MozAppearance: 'textfield' }}
                      />
                    </td>
                    <td className="border-r border-gray-700 px-3 py-2 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={part.selling_price}
                        onChange={(e) => handlePriceChange(index, 'selling_price', e.target.value)}
                        readOnly={isReadOnly}
                        className={`w-20 text-right border rounded px-2 py-1 font-medium text-sm ${
                          isReadOnly 
                            ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                            : 'bg-gray-700 border-gray-600 text-white'
                        }`}
                        style={{ WebkitAppearance: 'textfield', MozAppearance: 'textfield' }}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-white font-medium">
                      LKR {(part.selling_price - part.discount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {/* Total row with summary */}
                {selectedParts.length > 0 && (
                  <>
                    <tr className="border-t-2 border-gray-600 bg-gray-750">
                      <td className="border-r border-gray-700 px-3 py-2 text-white font-semibold">Total</td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2 text-center text-white font-semibold">
                        {selectedParts.reduce((sum, part) => sum + part.quantity, 0)}
                      </td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="px-3 py-2 text-right text-white font-semibold">
                        LKR {calculateSubTotal().toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-700 bg-gray-750">
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2 text-white font-medium">Advance Paid:</td>
                      <td className="px-3 py-2 text-right text-white font-medium">
                        LKR {formData.advance_paid.toFixed(2)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-700 bg-gray-750">
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2"></td>
                      <td className="border-r border-gray-700 px-3 py-2 text-white font-semibold">Balance Due:</td>
                      <td className="px-3 py-2 text-right text-white font-semibold">
                        LKR {(calculateSubTotal() + formData.advance_paid).toFixed(2)}
                      </td>
                    </tr>
                  </>
                )}
                {/* Empty rows to fill space */}
                {Array.from({ length: Math.max(0, 8 - selectedParts.length - (selectedParts.length > 0 ? 3 : 0)) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-t border-gray-700">
                    <td className="border-r border-gray-700 px-3 py-3 h-12">&nbsp;</td>
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
        </div>

        {/* Customer Total Outstanding Table - Hidden in print */}
        <div className="mb-6 print-hidden">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Total Outstanding</h3>
          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Inv No</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Date</th>
                  <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Veh No</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-200">Bal Amt</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800">
                {vehicleInvoiceHistory.length > 0 ? (
                  vehicleInvoiceHistory.map((invoice, index) => (
                    <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="border-r border-gray-700 px-3 py-2 text-white text-sm">
                        {invoice.inv_no}
                      </td>
                      <td className="border-r border-gray-700 px-3 py-2 text-white text-sm">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="border-r border-gray-700 px-3 py-2 text-white text-sm">
                        {invoice.vehicle_no}
                      </td>
                      <td className="px-3 py-2 text-white text-sm text-right">
                        LKR {(invoice.balance_due || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-gray-700">
                    <td colSpan="4" className="px-3 py-4 text-center text-gray-400 text-sm">
                      {formData.vehicle_no ? 'No previous invoices found for this vehicle' : 'Select a job to view vehicle invoice history'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Section - Only visible in print */}
        <div className="hidden print:block signature-section">
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700 print:hidden">
          {!isReadOnly ? (
            <>
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <FiX />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <FiSave />
                {loading ? 'Saving...' : 'Save Invoice'}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsReadOnly(false);
                setFormData({
                  inv_no: '',
                  customer_name: '',
                  date: new Date().toISOString().split('T')[0],
                  job_no: '',
                  vehicle_no: '',
                  items: [],
                  customer_total_outstanding: 0,
                  advance_paid: 0,
                  balance_due: 0
                });
                setSelectedParts([]);
                setVehicleInvoiceHistory([]);
                setJobNoSearch('');
                generateTempInvoiceNo();
              }}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <FiPlus />
              New Invoice
            </button>
          )}
          <button
            onClick={handlePrintPreview}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiEye />
            Print Preview
          </button>
        </div>
      </div>
    </div>

    {/* Print Preview Modal */}
    {showPrintPreview && <PrintPreviewModal />}
    </>
  );
};

export default Invoice;

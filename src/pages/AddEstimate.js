import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiRefreshCw, FiEye } from 'react-icons/fi';

const AddEstimate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [jobNumbers, setJobNumbers] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [preventAutoSave, setPreventAutoSave] = useState(false);
  const preventAutoSaveRef = useRef(false);

  // List of available work types
  const workTypes = [
    'WHEEL ELIGMENT',
    'WHEEL ALIGH',
    'VAT 18%',
    'VACUUMIMNG/PRESSURE TEST AND RECHARGE',
    'UPHOLSTERY WORK',
    'UNDER GARAGE WASH',
    'TRANSPORT CHARGES',
    'TOWING CHARGE',
    'TOP UP',
    'TINKERING WORK',
    'SERVICE INSPECTION',
    'SCAN/ERASE AND RESET',
    'RETROFITTING',
    'RESET',
    'REPORT',
    'REPLACEMENT CHARGES',
    'REPLACMENT',
    'REPLACED',
    'REPLACE',
    'REPEAR',
    'REPAIR CHARGES',
    'REPAIR',
    'REMOVE AND REFIT',
    'REMOVE AND REFILL',
    'REMOVE',
    'REFIT',
    'REFILL',
    'RECHARGE A/C GAS',
    'RE-ASSEMBLE',
    'REALIGN',
    'RE ALIGN',
    'PAINT WORK',
    'PAINT TOUCH-UP',
    'OVERHAUL',
    'OTHERS',
    'OTHER PAINT JOB',
    'ON-LINE RESET',
    'OIL SERVICE',
    'NEED TO TOP UP',
    'NEED TO TO UP',
    'NEED TO REPLACE',
    'NEED TO REPEAR',
    'NEED TO CLEAN',
    'MIS.ITEMS',
    'MACHINE WORKS',
    'LUBRICATE',
    'LATH WORKS',
    'LABOUR WORKS',
    'LABOUR CHARGES',
    'JOB DONE',
    'INTERIOR CLEAN',
    'INSURANCE JOB',
    'INSTALLATION CHARGES',
    'INSPECTION CHARGES',
    'INCENTIVE-PARTS',
    'INCENTIVE-LABOUR',
    'FLUSH AND CLEAN',
    'FLUSH AND BLEED',
    'FLUSH A/C SYSTEM',
    'FIX',
    'ENGINE TUNUP',
    'ENGINE OVERHAUL',
    'DISMANTLE AND ASSEMBLE',
    'DISCOUNT',
    'DEGREASE ENGINE',
    'CUT AND POLISH',
    'CUT AND POLICE',
    'CUSHION WORKS',
    'CLEAN WORD',
    'CHECKUP',
    'CHECK ITEMS',
    'CHECK ENGINE LIGHT',
    'CHECK AND REPORT',
    'CHECK AND REPAIR',
    'CHECK AND ATTEND',
    'CHECK',
    'CHANGE',
    'BRAKE DOWN CHARGES',
    'BODY WASH',
    'AJEST',
    'ADJUSTMENT',
    '-'
  ];

  const [formData, setFormData] = useState({
    invoice_no: '',
    job_no: '',
    job_date: new Date().toISOString().split('T')[0],
    vehicle_no: '',
    customer: '',
    ins_company: 'N/A',
    remarks: '',
    items: [],
    discount: 0
  });

  const [jobNoSearch, setJobNoSearch] = useState('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1.00');
  const [quantity, setQuantity] = useState('1');

  // Draft management functions
  const saveDraft = () => {
    if (preventAutoSaveRef.current) return; // Don't save if auto-save is prevented
    
    if (formData.customer || formData.vehicle_no || formData.items.length > 0) {
      const draftData = {
        formData,
        selectedType,
        description,
        price,
        quantity,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('estimateDraft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('estimateDraft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Update date to current date but keep other data
        const updatedFormData = {
          ...draftData.formData,
          job_date: new Date().toISOString().split('T')[0]
        };
        setFormData(updatedFormData);
        setSelectedType(draftData.selectedType || '');
        setDescription(draftData.description || '');
        setPrice(draftData.price || '1.00');
        setQuantity(draftData.quantity || '1');
        setIsDraftLoaded(true);
        setHasDraft(true);
        
        // Set job search field if job_no exists in draft
        if (updatedFormData.job_no) {
          setJobNoSearch(updatedFormData.job_no);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('estimateDraft');
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
      invoice_no: '',
      job_no: '',
      job_date: new Date().toISOString().split('T')[0],
      vehicle_no: '',
      customer: '',
      ins_company: 'N/A',
      remarks: '',
      items: [],
      discount: 0
    });
    
    // Reset input fields
    setSelectedType('');
    setDescription('');
    setPrice('1.00');
    setQuantity('1');
    
    // Regenerate invoice number
    generateInvoiceNo();
    
    // Re-enable auto-save after a short delay
    setTimeout(() => {
      setPreventAutoSave(false);
      preventAutoSaveRef.current = false;
    }, 1000);
    
    window.electronAPI.notification.show('Info', 'Form cleared and draft removed');
  };

  const checkForDraft = () => {
    const savedDraft = localStorage.getItem('estimateDraft');
    setHasDraft(!!savedDraft);
    return !!savedDraft;
  };

  useEffect(() => {
    fetchJobNumbers();
  }, [location.search]);

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
    // Check for job number from URL params (from newly created job card)
    const urlParams = new URLSearchParams(location.search);
    const jobNoFromUrl = urlParams.get('jobNo');
    
    if (jobNoFromUrl && !formData.job_no) {
      // Auto-select the job number from URL
      setTimeout(() => {
        setJobNoSearch(jobNoFromUrl); // Set search field
        handleJobSelect(jobNoFromUrl);
      }, 500); // Small delay to ensure job numbers are loaded
    } else if (checkForDraft() && !jobNoFromUrl) {
      // Check for existing draft only if not coming from job card creation
      setTimeout(() => {
        loadDraft();
      }, 100);
    }
  }, [location.search]);

  // Auto-save draft periodically and when user navigates away
  useEffect(() => {
    // Auto-save every 30 seconds if there's meaningful data
    const autoSaveInterval = setInterval(() => {
      if (formData.customer || formData.vehicle_no || formData.items.length > 0) {
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
  }, [formData, selectedType, description, price, quantity]);

  // Save draft when form data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.customer || formData.vehicle_no || formData.items.length > 0) {
        saveDraft();
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [formData, selectedType, description, price, quantity]);

  const fetchJobNumbers = async () => {
    try {
      // Fetch all job cards (including those with estimates for read-only viewing)
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT jc.job_no, jc.customer_name, jc.vehicle_no, jc.insurance_company, jc.created_at,
                e.invoice_no as existing_estimate_no
         FROM job_cards jc 
         LEFT JOIN estimates e ON jc.job_no = e.job_no
         ORDER BY jc.created_at DESC`
      );
      
      setJobNumbers(result || []);
    } catch (error) {
      console.error('Error fetching job numbers:', error);
    }
  };

  const generateInvoiceNo = async () => {
    // If invoice_no already exists in form, don't generate a new one
    if (formData.invoice_no) {
      window.electronAPI.notification.show('Info', 'Invoice No. already generated');
      return;
    }

    try {
      // Get the current counter value and increment it (same as Invoice page)
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

      // DON'T update the counter yet - only when actually saving
      // Generate preview number without updating database
      const invoiceNo = `INV${nextValue.toString().padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, invoice_no: invoiceNo }));
    } catch (error) {
      console.error('Error generating Invoice No:', error);
      window.electronAPI.notification.show('Error', 'Failed to generate Invoice No.');
    }
  };

  const saveActualInvoiceNo = async () => {
    // This function actually saves the invoice number to database when saving estimate
    try {
      // Check if we're reusing an existing estimate's invoice number (like Invoice page does)
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

      // No existing estimate found, generate new invoice number
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

      // Actually update the counter now
      await window.electronAPI.database.query(
        'run',
        `UPDATE counters SET current_value = ? WHERE id = 'invoice_no'`,
        [nextValue]
      );

      const invoiceNo = `INV${nextValue.toString().padStart(6, '0')}`;
      setFormData(prev => ({ ...prev, invoice_no: invoiceNo }));
      return invoiceNo;
    } catch (error) {
      console.error('Error saving Invoice No:', error);
      return formData.invoice_no; // Return existing preview number as fallback
    }
  };

  const handleJobSelect = async (jobNo) => {
    // Try to find in current job numbers first
    let selectedJob = jobNumbers.find(job => job.job_no === jobNo);
    
    // If not found (like when auto-selecting from URL), fetch it directly
    if (!selectedJob) {
      try {
        const result = await window.electronAPI.database.query(
          'get',
          `SELECT jc.job_no, jc.customer_name, jc.vehicle_no, jc.insurance_company, jc.created_at,
                  e.invoice_no as existing_estimate_no
           FROM job_cards jc 
           LEFT JOIN estimates e ON jc.job_no = e.job_no
           WHERE jc.job_no = ?`,
          [jobNo]
        );
        selectedJob = result;
      } catch (error) {
        console.error('Error fetching job details:', error);
        return;
      }
    }
    
    if (selectedJob) {
      // Set the search field to show the selected job number
      setJobNoSearch(selectedJob.job_no);
      
      // Check if this job already has an estimate
      if (selectedJob.existing_estimate_no) {
        // Load existing estimate data in read-only mode
        await loadExistingEstimate(jobNo);
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        job_no: selectedJob.job_no,
        vehicle_no: selectedJob.vehicle_no,
        customer: selectedJob.customer_name,
        ins_company: selectedJob.insurance_company || 'N/A'
      }));
      
      // Auto-generate invoice number for new estimates
      if (!formData.invoice_no) {
        generateInvoiceNo();
      }
    }
  };

  const loadExistingEstimate = async (jobNo) => {
    try {
      // Load existing estimate data
      const estimate = await window.electronAPI.database.query(
        'get',
        `SELECT * FROM estimates WHERE job_no = ?`,
        [jobNo]
      );
      
      if (estimate) {
        // Load estimate items
        const estimateItems = await window.electronAPI.database.query(
          'all',
          `SELECT * FROM estimate_items WHERE estimate_id = ?`,
          [estimate.id]
        );
        
        setFormData({
          invoice_no: estimate.invoice_no,
          job_no: estimate.job_no,
          job_date: estimate.job_date,
          vehicle_no: estimate.vehicle_no,
          customer: estimate.customer,
          ins_company: estimate.ins_company,
          remarks: estimate.remarks,
          items: estimateItems || []
        });
        
        setIsReadOnly(true);
        
        window.electronAPI.notification.show('Info', 'Showing existing estimate in read-only mode');
      }
    } catch (error) {
      console.error('Error loading existing estimate:', error);
      window.electronAPI.notification.show('Error', 'Failed to load existing estimate');
    }
  };

  const handleAddItem = () => {
    if (!selectedType || !description) return;

    const newItem = {
      type: selectedType,
      description: description,
      price: parseFloat(price) || 0,
      quantity: parseInt(quantity) || 1,
      value: (parseFloat(price) || 0) * (parseInt(quantity) || 1),
      fb: 'Y'
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Reset input fields
    setSelectedType('');
    setDescription('');
    setPrice('1.00');
    setQuantity('1');
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.value, 0);
  };

  const calculateBalanceDue = () => {
    return calculateTotal() - (formData.discount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_no) {
      window.electronAPI.notification.show('Error', 'Please generate an Invoice No. first');
      return;
    }
    
    if (!formData.job_no) {
      window.electronAPI.notification.show('Error', 'Please select a Job No.');
      return;
    }

    if (formData.items.length === 0) {
      window.electronAPI.notification.show('Error', 'Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      // Save the actual invoice number to database (increment counter)
      const actualInvoiceNo = await saveActualInvoiceNo();
      
      // Insert the estimate
      const result = await window.electronAPI.database.query(
        'run',
        `INSERT INTO estimates (
          invoice_no, job_no, job_date, vehicle_no,
          customer, ins_company, remarks, total_amount,
          discount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          actualInvoiceNo,
          formData.job_no,
          formData.job_date,
          formData.vehicle_no,
          formData.customer,
          formData.ins_company,
          formData.remarks,
          calculateTotal(),
          formData.discount || 0
        ]
      );

      if (result && result.lastID) {
        // Insert estimate items
        for (const item of formData.items) {
          await window.electronAPI.database.query(
            'run',
            `INSERT INTO estimate_items (
              estimate_id, type, description, price,
              quantity, value, fb
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              result.lastID,
              item.type,
              item.description,
              item.price,
              item.quantity,
              item.value,
              item.fb
            ]
          );
        }

        // Clear draft after successful save
        clearDraft();
        window.electronAPI.notification.show('Success', 'Estimate created successfully');
        
        // Navigate to job cards and trigger print preview for the relevant job
        if (formData.job_no) {
          navigate(`/job-cards?printPreview=${formData.job_no}`);
        } else {
          navigate('/estimates');
        }
      }
    } catch (error) {
      console.error('Error creating estimate:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        window.electronAPI.notification.show('Error', 'Invoice number already exists');
      } else {
        window.electronAPI.notification.show('Error', 'Failed to create estimate');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-900 min-h-screen">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/estimates')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Estimates</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 border border-gray-700">
        {/* Read-only notification */}
        {isReadOnly && (
          <div className="mb-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FiEye className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-blue-400 font-semibold">Viewing Existing Estimate</h3>
                <p className="text-blue-300 text-sm">This estimate has already been created and is displayed in read-only mode.</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">{isReadOnly ? 'View Estimate' : 'New Estimate'}</h1>
            
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
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-6">
            {/* Left side - Items Table */}
            <div className="flex-1">
              {!isReadOnly && (
                <div className="mb-4">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <option value="">Select Type</option>
                    {workTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price"
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  />
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Qty"
                    className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm w-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <FiPlus />
                    Add
                  </button>
                </div>
              </div>
              )}

              <div className="border border-gray-600 rounded-lg mb-4 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Type</th>
                      <th className="border-r border-gray-600 px-3 py-3 text-left font-medium text-gray-200">Description</th>
                      <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Price</th>
                      <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Qty</th>
                      <th className="border-r border-gray-600 px-3 py-3 text-right font-medium text-gray-200">Value</th>
                      <th className="px-3 py-3 text-center font-medium text-gray-200">F/B</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="border-r border-gray-700 px-3 py-2 text-white">{item.type}</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-white">{item.description}</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-right text-white">{item.price.toFixed(2)}</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-right text-white">{item.quantity}</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-right text-white font-medium">{item.value.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center text-white">{item.fb}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - formData.items.length) }).map((_, index) => (
                      <tr key={`empty-${index}`} className="border-t border-gray-700">
                        <td className="border-r border-gray-700 px-3 py-2 h-10 text-gray-500">&nbsp;</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-gray-500">&nbsp;</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-gray-500">&nbsp;</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-gray-500">&nbsp;</td>
                        <td className="border-r border-gray-700 px-3 py-2 text-gray-500">&nbsp;</td>
                        <td className="px-3 py-2 text-gray-500">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action buttons */}
              {!isReadOnly && (
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {loading ? 'Saving...' : 'Save Estimate'}
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Job Details */}
            <div className="w-80 space-y-4">
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Job Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Invoice Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.invoice_no}
                        readOnly
                        placeholder="Click arrow to generate"
                        className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm font-mono w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={generateInvoiceNo}
                        disabled={!!formData.invoice_no || isReadOnly}
                        className={`px-3 py-2 rounded transition-colors
                          ${formData.invoice_no || isReadOnly
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                          }`}
                      >
                        <FiRefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Job No</label>
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
                          placeholder="Search or select job number..."
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
                                customer: '',
                                ins_company: 'N/A'
                              }));
                              setJobNoSearch('');
                              setIsReadOnly(false);
                              setShowJobDropdown(false);
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
                                  {job.existing_estimate_no && (
                                    <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                                      Has Estimate
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
                              No matching job cards found
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
                        {jobNumbers.find(job => job.job_no === formData.job_no)?.existing_estimate_no && (
                          <div className="text-xs text-orange-400">
                            View Mode - Has Existing Estimate
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Vehicle No</label>
                    <input
                      type="text"
                      value={formData.vehicle_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_no: e.target.value }))}
                      readOnly={!!formData.job_no}
                      className={`w-full border rounded px-3 py-2 text-sm ${
                        formData.job_no 
                          ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
                      }`}
                      placeholder="Enter vehicle number"
                    />
                    {formData.job_no && (
                      <div className="mt-1 text-xs text-blue-400">
                        Auto-filled from Job Card
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Customer</label>
                    <input
                      type="text"
                      value={formData.customer}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                      readOnly={!!formData.job_no}
                      className={`w-full border rounded px-3 py-2 text-sm ${
                        formData.job_no 
                          ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Ins Company</label>
                    <input
                      type="text"
                      value={formData.ins_company}
                      onChange={(e) => setFormData(prev => ({ ...prev, ins_company: e.target.value }))}
                      readOnly={!!formData.job_no}
                      className={`w-full border rounded px-3 py-2 text-sm ${
                        formData.job_no 
                          ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed' 
                          : 'bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
                      }`}
                      placeholder="Insurance company"
                    />
                    {formData.job_no && (
                      <div className="mt-1 text-xs text-blue-400">
                        Auto-filled from Job Card
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                      rows="3"
                      placeholder="Additional remarks..."
                    />
                  </div>
                </div>
              </div>

              {/* Totals section */}
              <div className="bg-gray-750 rounded-lg p-4 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-300">Total</span>
                    <span className="text-white font-semibold">Rs. {calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-medium text-gray-300">Discount</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                      className="bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm w-24 text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-600 pt-3">
                    <span className="text-gray-200">Balance Due</span>
                    <span className="text-green-400">Rs. {calculateBalanceDue().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEstimate; 
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiSearch, FiRefreshCw } from 'react-icons/fi';
import html2canvas from 'html2canvas';
import JobCardPrint from '../components/JobCardPrint';

const AddJobCard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [recentJobNos, setRecentJobNos] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [existingJobCards, setExistingJobCards] = useState([]);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [jobNoInputValue, setJobNoInputValue] = useState('');
  const [showJobNoDropdown, setShowJobNoDropdown] = useState(false);
  const [jobValidationMessage, setJobValidationMessage] = useState('');
  const [preventAutoSave, setPreventAutoSave] = useState(false);
  const preventAutoSaveRef = useRef(false);
  const printRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  
  const [formData, setFormData] = useState({
    // Job Details
    job_no: '',
    job_date: new Date().toISOString().split('T')[0],
    in_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    
    // Vehicle Details
    vehicle_no: '',
    type: 'CAR',
    make: 'AUDI',
    model: 'A5',
    color: '',
    engine_no: '',
    chassis_no: '',
    man_year: '',
    in_milage: '',
    insurance_company: '',
    claim_no: '',
    date_of_accident: new Date().toISOString().split('T')[0],
    advance: 0,

    // Customer Details
    customer_name: '',
    id_no: '',
    address: '',
    mob_no: '',
    tel_no: '',
    fax_no: '',
    email: '',
    vat_no: '',
    technician: '',
    service_advisor: ''
  });

  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // Draft management functions
  const saveDraft = () => {
    if (preventAutoSaveRef.current) return; // Don't save if auto-save is prevented
    
    if (formData.customer_name || formData.vehicle_no) {
      const draftData = {
        formData,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('jobCardDraft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('jobCardDraft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        // Update time to current time but keep other data
        const updatedFormData = {
          ...draftData.formData,
          in_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          job_date: new Date().toISOString().split('T')[0] // Update to current date
        };
        setFormData(updatedFormData);
        // Also update the job number input value to show the job number
        setJobNoInputValue(updatedFormData.job_no || '');
        setIsDraftLoaded(true);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('jobCardDraft');
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
      // Job Details
      job_no: '',
      job_date: new Date().toISOString().split('T')[0],
      in_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      
      // Vehicle Details
      vehicle_no: '',
      type: 'CAR',
      make: 'AUDI',
      model: 'A5',
      color: '',
      engine_no: '',
      chassis_no: '',
      man_year: '',
      in_milage: '',
      insurance_company: '',
      claim_no: '',
      date_of_accident: new Date().toISOString().split('T')[0],
      advance: 0,

      // Customer Details
      customer_name: '',
      id_no: '',
      address: '',
      mob_no: '',
      tel_no: '',
      fax_no: '',
      email: '',
      vat_no: '',
      technician: '',
      service_advisor: ''
    });
    
    
    // Reset other state
    setIsNewCustomer(false);
    
    // Re-enable auto-save after a short delay
    setTimeout(() => {
      setPreventAutoSave(false);
      preventAutoSaveRef.current = false;
    }, 1000);
    
    window.electronAPI.notification.show('Info', 'Form cleared and draft removed');
  };

  const checkForDraft = () => {
    const savedDraft = localStorage.getItem('jobCardDraft');
    setHasDraft(!!savedDraft);
    return !!savedDraft;
  };

  const fetchExistingJobCards = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        'SELECT job_no, customer_name, vehicle_no FROM job_cards ORDER BY created_at DESC LIMIT 50'
      );
      setExistingJobCards(result || []);
    } catch (error) {
      console.error('Error fetching existing job cards:', error);
    }
  };

  const handleJobNoInputChange = (value) => {
    setJobNoInputValue(value);
    setJobValidationMessage('');
    
    if (value.trim() === '') {
      setShowJobNoDropdown(false);
      setFormData(prev => ({ ...prev, job_no: '' }));
      setIsEditingExisting(false);
      return;
    }

    // Check if the entered value matches any existing job card
    const matchingJob = existingJobCards.find(job => 
      job.job_no.toLowerCase().includes(value.toLowerCase())
    );

    if (matchingJob && value === matchingJob.job_no) {
      // Exact match found - load existing job card
      loadExistingJobCard(matchingJob.job_no);
    } else if (value.length > 0) {
      // Show dropdown with filtered results
      const filteredJobs = existingJobCards.filter(job => 
        job.job_no.toLowerCase().includes(value.toLowerCase())
      );
      
      if (filteredJobs.length > 0) {
        setShowJobNoDropdown(true);
      } else {
        setShowJobNoDropdown(false);
        setJobValidationMessage('No matching job cards found');
        setFormData(prev => ({ ...prev, job_no: '' }));
        setIsEditingExisting(false);
      }
    }
  };

  const loadExistingJobCard = async (jobNo) => {
    try {
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT * FROM job_cards WHERE job_no = ?`,
        [jobNo]
      );
      
      if (result) {
        // Load job card data
        setFormData({
          ...result,
          job_date: result.job_date,
          in_time: result.in_time
        });
        
        // Load job card parts
        const partsResult = await window.electronAPI.database.query(
          'all',
          `SELECT jcp.*, p.name, p.pro_no 
           FROM job_card_parts jcp 
           JOIN parts p ON jcp.part_id = p.id 
           WHERE jcp.job_card_id = ?`,
          [result.id]
        );
        
        setSelectedParts(partsResult || []);
        setIsEditingExisting(true);
        setShowJobNoDropdown(false);
        setJobValidationMessage('');
        
        window.electronAPI.notification.show('Info', 'Loaded existing job card for editing');
      }
    } catch (error) {
      console.error('Error loading existing job card:', error);
      window.electronAPI.notification.show('Error', 'Failed to load job card');
    }
  };

  const selectJobFromDropdown = (jobNo) => {
    setJobNoInputValue(jobNo);
    loadExistingJobCard(jobNo);
  };

  useEffect(() => {
    fetchRecentJobNos();
    fetchExistingJobCards();
    
    // Check for existing draft on component mount
    if (checkForDraft()) {
      // Auto-load draft after a brief delay to let other initialization complete
      setTimeout(() => {
        loadDraft();
      }, 100);
    }
  }, []);

  // Update time every minute
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const newTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      setCurrentTime(newTime);
      
      // Update the form data with current time
      setFormData(prev => ({
        ...prev,
        in_time: newTime
      }));
    }, 60000); // Update every minute

    return () => clearInterval(timeInterval);
  }, []);

  // Update time when component becomes visible (when user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const newTime = new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        setCurrentTime(newTime);
        setFormData(prev => ({
          ...prev,
          in_time: newTime
        }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Auto-save draft periodically and when user navigates away
  useEffect(() => {
    // Auto-save every 30 seconds if there's meaningful data
    const autoSaveInterval = setInterval(() => {
      if (formData.customer_name || formData.vehicle_no) {
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
  }, [formData]);

  // Save draft when formData or selectedParts change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.customer_name || formData.vehicle_no) {
        saveDraft();
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [formData]);


  const fetchRecentJobNos = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT job_no, customer_name, created_at 
         FROM job_cards 
         WHERE job_no IS NOT NULL 
         ORDER BY created_at DESC 
         LIMIT 5`
      );
      setRecentJobNos(result || []);
    } catch (error) {
      console.error('Error fetching recent job numbers:', error);
    }
  };

  const generateJobNo = async () => {
    // If job_no already exists in form, don't generate a new one
    if (formData.job_no) {
      window.electronAPI.notification.show('Info', 'Job No. already generated');
      return;
    }

    try {
      // Get the highest used job number from actual job cards
      const result = await window.electronAPI.database.query(
        'get',
        `SELECT job_no 
         FROM job_cards 
         WHERE job_no IS NOT NULL 
         ORDER BY CAST(REPLACE(job_no, '0', '') AS INTEGER) DESC 
         LIMIT 1`
      );

      let nextValue;
      if (result && result.job_no) {
        // If there are existing job cards, increment from the highest number
        nextValue = parseInt(result.job_no) + 1;
      } else {
        // If no job cards exist, start from 1
        nextValue = 1;
      }

      // Format with leading zeros (6 digits)
      const jobNo = nextValue.toString().padStart(6, '0');
      setFormData(prev => ({ ...prev, job_no: jobNo }));
      setJobNoInputValue(jobNo);
      setIsEditingExisting(false);
      setShowJobNoDropdown(false);
      setJobValidationMessage('');
      await fetchRecentJobNos();
    } catch (error) {
      console.error('Error generating Job No:', error);
      window.electronAPI.notification.show('Error', 'Failed to generate Job No.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.job_no) {
      window.electronAPI.notification.show('Error', 'Please generate a Job No. first');
      return;
    }
    
    setLoading(true);
    try {
      let result;
      
      if (isEditingExisting) {
        // Update existing job card
        result = await window.electronAPI.database.query(
          'run',
          `UPDATE job_cards SET 
            job_date = ?, in_time = ?, vehicle_no = ?, vehicle_type = ?,
            make = ?, model = ?, color = ?, engine_no = ?, chassis_no = ?,
            man_year = ?, in_milage = ?, insurance_company = ?, claim_no = ?,
            date_of_accident = ?, advance = ?, customer_type = ?, customer_name = ?,
            id_no = ?, address = ?, mob_no = ?, tel_no = ?, fax_no = ?,
            email = ?, vat_no = ?, technician = ?, service_advisor = ?, updated_at = CURRENT_TIMESTAMP
           WHERE job_no = ?`,
          [
            formData.job_date,
            formData.in_time,
            formData.vehicle_no,
            formData.type,
            formData.make,
            formData.model,
            formData.color,
            formData.engine_no,
            formData.chassis_no,
            formData.man_year,
            formData.in_milage,
            formData.insurance_company,
            formData.claim_no,
            formData.date_of_accident,
            formData.advance,
            isNewCustomer ? 'new' : 'existing',
            formData.customer_name,
            formData.id_no,
            formData.address,
            formData.mob_no,
            formData.tel_no,
            formData.fax_no,
            formData.email,
            formData.vat_no,
            formData.technician,
            formData.service_advisor,
            formData.job_no
          ]
        );
      } else {
        // Create new job card
        result = await window.electronAPI.database.query(
          'run',
          `INSERT INTO job_cards (
            job_no, job_date, in_time, vehicle_no, vehicle_type,
            make, model, color, engine_no, chassis_no,
            man_year, in_milage, insurance_company, claim_no,
            date_of_accident, advance, customer_type, customer_name,
            id_no, address, mob_no, tel_no, fax_no,
            email, vat_no, technician, service_advisor
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formData.job_no,
          formData.job_date,
          formData.in_time,
          formData.vehicle_no,
          formData.type,
          formData.make,
          formData.model,
          formData.color,
          formData.engine_no,
          formData.chassis_no,
          formData.man_year,
          formData.in_milage,
          formData.insurance_company,
          formData.claim_no,
          formData.date_of_accident,
          formData.advance,
          isNewCustomer ? 'new' : 'existing',
          formData.customer_name,
          formData.id_no,
          formData.address,
          formData.mob_no,
          formData.tel_no,
          formData.fax_no,
          formData.email,
          formData.vat_no,
          formData.technician,
          formData.service_advisor
          ]
        );
      }

      if (result && result.changes > 0) {
        // Clear draft after successful save
        clearDraft();
        const successMessage = isEditingExisting ? 'Job card updated successfully' : 'Job card created successfully';
        window.electronAPI.notification.show('Success', successMessage);
        
        if (isEditingExisting) {
          navigate('/job-cards');
        } else {
          navigate(`/add-estimate?jobNo=${formData.job_no}`);
        }
      } else {
        throw new Error(isEditingExisting ? 'Failed to update job card' : 'Failed to create job card');
      }
    } catch (error) {
      console.error('Error creating job card:', error);
      if (error.message?.includes('UNIQUE constraint failed')) {
        window.electronAPI.notification.show('Error', 'Job number already exists');
      } else {
        window.electronAPI.notification.show('Error', 'Failed to create job card');
      }
    } finally {
      setLoading(false);
    }
  };


  const handlePrint = async () => {
    if (!formData.job_no) {
      window.electronAPI.notification.show('Error', 'Please generate a Job No. first');
      return;
    }
    setShowPrintPreview(true);
  };

  const handlePrintPreview = () => {
    setShowPrintPreview(true);
  };

  const handleActualPrint = () => {
    setShowPrintPreview(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/job-cards')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Job Cards</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">
              {isEditingExisting ? 'Edit Job Card' : 'Vehicle Registration'}
            </h1>
            
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
            
            {/* Editing Status Indicator */}
            {isEditingExisting && (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-600 rounded-lg px-3 py-2">
                <FiSearch className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-sm font-medium">Editing Existing Job Card</span>
              </div>
            )}
          </div>
          
          {/* Recent Job Numbers */}
          <div className="bg-gray-700 rounded-lg p-4 min-w-[200px]">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Job Numbers</h3>
            <div className="space-y-2">
              {recentJobNos.map((job) => (
                <div 
                  key={job.job_no}
                  className="text-sm p-2 bg-gray-600 rounded"
                >
                  <div className="font-mono text-white">{job.job_no}</div>
                  <div className="text-xs text-gray-400 truncate">{job.customer_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Details */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">Job No</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={jobNoInputValue}
                    onChange={(e) => handleJobNoInputChange(e.target.value)}
                    onFocus={() => setShowJobNoDropdown(existingJobCards.length > 0)}
                    onBlur={() => setTimeout(() => setShowJobNoDropdown(false), 200)}
                    placeholder="Enter job number or generate new"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {/* Dropdown for existing job cards */}
                  {showJobNoDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {existingJobCards
                        .filter(job => job.job_no.toLowerCase().includes(jobNoInputValue.toLowerCase()))
                        .map(job => (
                          <div
                            key={job.job_no}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                            onClick={() => selectJobFromDropdown(job.job_no)}
                          >
                            <div className="font-mono font-semibold">{job.job_no}</div>
                            <div className="text-gray-400 text-xs">{job.customer_name} • {job.vehicle_no}</div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Validation message */}
                  {jobValidationMessage && (
                    <div className="absolute z-40 w-full mt-1 bg-red-900/30 border border-red-600 rounded-md p-2">
                      <div className="text-red-400 text-xs">{jobValidationMessage}</div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={generateJobNo}
                  disabled={!!formData.job_no}
                  className={`px-3 py-2 rounded-md transition-colors
                    ${formData.job_no 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                    }`}
                >
                  <FiRefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Job Date</label>
              <input
                type="date"
                name="job_date"
                value={formData.job_date}
                onChange={handleChange}
                className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                In Time 
                <span className="text-green-400 text-xs ml-1">● Auto-updating</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  name="in_time"
                  value={formData.in_time}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newTime = new Date().toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    setCurrentTime(newTime);
                    setFormData(prev => ({ ...prev, in_time: newTime }));
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                  title="Refresh current time"
                >
                  <FiRefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
            <h2 className="text-lg font-medium text-white mb-4">Vehicle Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vehicle No</label>
                <input
                  type="text"
                  name="vehicle_no"
                  value={formData.vehicle_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <input
                  type="text"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  list="vehicle-types"
                  placeholder="Type vehicle type or select from list"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="vehicle-types">
                  <option value="CAR" />
                  <option value="SUV" />
                  <option value="VAN" />
                  <option value="TRUCK" />
                  <option value="JEEP" />
                  <option value="HATCHBACK" />
                  <option value="LORRY" />
                  <option value="CAB" />
                  <option value="CREW CAB" />
                  <option value="SEDARN" />
                  <option value="WORKSHOP" />
                  <option value="WORK SHOP" />
                  <option value="WPKS-1661" />
                  <option value="WPGS-2296" />
                  <option value="VW" />
                  <option value="UNIQUE RIDES" />
                  <option value="UNIQUE 1" />
                  <option value="SU V" />
                  <option value="SCODA" />
                  <option value="Q5" />
                  <option value="Q3" />
                  <option value="Q2" />
                  <option value="MR.IMTIYAZ *" />
                  <option value="MR.IMTIYAZ" />
                  <option value="MR.GIHAN NEW" />
                  <option value="JAYASEKARA" />
                  <option value="GENERATOR 1" />
                  <option value="GEEP" />
                  <option value="CR" />
                  <option value="CAT" />
                  <option value="AUDI" />
                  <option value="A3" />
                  <option value="-" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  list="vehicle-makes"
                  placeholder="Type vehicle make or select from list"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="vehicle-makes">
                  <option value="AUDI" />
                  <option value="BMW" />
                  <option value="BENZ" />
                  <option value="TOYOTA" />
                  <option value="HONDA" />
                  <option value="NISSAN" />
                  <option value="MAZDA" />
                  <option value="SUZUKI" />
                  <option value="MITSUBISHI" />
                  <option value="SUBARU" />
                  <option value="VOLKSWAGEN" />
                  <option value="VW" />
                  <option value="FORD" />
                  <option value="KIA" />
                  <option value="HYUNDAI" />
                  <option value="PEUGEOT" />
                  <option value="RENAULT" />
                  <option value="SKODA" />
                  <option value="SEAT" />
                  <option value="PORSCHE" />
                  <option value="LAMBORGHINI" />
                  <option value="RANGE ROVER" />
                  <option value="LANDROVER" />
                  <option value="JEEP" />
                  <option value="ISUZU" />
                  <option value="PERADUA" />
                  <option value="BORGWARD" />
                  <option value="STINGRAY" />
                  <option value="MICRO" />
                  <option value="MERC" />
                  <option value="HINDA" />
                  <option value="GEEP" />
                  <option value="CIAT" />
                  <option value="BFB" />
                  <option value="AUDI E TRON" />
                  <option value="VOLKSWAGON" />
                  <option value="WALKSWAGON" />
                  <option value="WALKSWAGEN" />
                  <option value="WALKSWAGAN" />
                  <option value="WALKSAGON" />
                  <option value="VALKSWAGON" />
                  <option value="WAXWAGON" />
                  <option value="TIGUAN" />
                  <option value="SUSUKI-SWIFT" />
                  <option value="SUSUKI" />
                  <option value="SCODA" />
                  <option value="PORCHI" />
                  <option value="POCSCHE" />
                  <option value="MITSHUBISHY" />
                  <option value="MITSHUBISHI" />
                  <option value="HYHUNDAI" />
                  <option value="ADUI" />
                  <option value="AIDU" />
                  <option value="ALT0" />
                  <option value="AUD" />
                  <option value="AUD1" />
                  <option value="AAAA" />
                  <option value="A6" />
                  <option value="A4" />
                  <option value="A3" />
                  <option value="Q2" />
                  <option value="TOYATA" />
                  <option value="SUV" />
                  <option value="VAN" />
                  <option value="CAR" />
                  <option value="V" />
                  <option value="UK" />
                  <option value="-" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  list="vehicle-models"
                  placeholder="Type vehicle model or select from list"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="vehicle-models">
                  <option value="A1" />
                  <option value="A2" />
                  <option value="A3" />
                  <option value="A4" />
                  <option value="A5" />
                  <option value="A6" />
                  <option value="A7" />
                  <option value="A8" />
                  <option value="Q2" />
                  <option value="Q3" />
                  <option value="Q4" />
                  <option value="Q5" />
                  <option value="Q6" />
                  <option value="Q7" />
                  <option value="Q8" />
                  <option value="TT" />
                  <option value="R32" />
                  <option value="R35" />
                  <option value="GOLF" />
                  <option value="POLO" />
                  <option value="PASSAT" />
                  <option value="JETTA" />
                  <option value="TIGUAN" />
                  <option value="TOUAREG" />
                  <option value="T-CROSS" />
                  <option value="T-ROC" />
                  <option value="UP" />
                  <option value="BEETLE" />
                  <option value="VENTO" />
                  <option value="TRANSPORTER" />
                  <option value="CRAFTER" />
                  <option value="CARAVELLE" />
                  <option value="COROLLA" />
                  <option value="PRIUS" />
                  <option value="VITZ" />
                  <option value="AQUA" />
                  <option value="PASSO" />
                  <option value="AXIO" />
                  <option value="PRADO" />
                  <option value="HILUX" />
                  <option value="LAND CRUISER" />
                  <option value="KDH" />
                  <option value="CIVIC" />
                  <option value="CRV" />
                  <option value="CRZ" />
                  <option value="GRACE" />
                  <option value="VEZEL" />
                  <option value="MARCH" />
                  <option value="LEAF" />
                  <option value="SUNNY" />
                  <option value="VITARA" />
                  <option value="ALTO" />
                  <option value="EVERY" />
                  <option value="HUSTLER" />
                  <option value="SWIFT" />
                  <option value="IMPREZA" />
                  <option value="FORESTER" />
                  <option value="OUTBACK" />
                  <option value="PAJERO" />
                  <option value="MONTERO" />
                  <option value="GALANT" />
                  <option value="LANCER" />
                  <option value="OUTLANDER" />
                  <option value="320D" />
                  <option value="523I" />
                  <option value="530 E" />
                  <option value="730D" />
                  <option value="X1" />
                  <option value="E200" />
                  <option value="E300" />
                  <option value="E320" />
                  <option value="GLC250" />
                  <option value="C" />
                  <option value="AMG" />
                  <option value="CAYENNE" />
                  <option value="MACAN" />
                  <option value="PANAMERA" />
                  <option value="911" />
                  <option value="FOCUS" />
                  <option value="MUSTANG" />
                  <option value="RANGER" />
                  <option value="EXPLORER" />
                  <option value="RIO" />
                  <option value="SPORTAGE" />
                  <option value="SORENTO" />
                  <option value="CERATO" />
                  <option value="OCTAVIA" />
                  <option value="SUPERB" />
                  <option value="KODIAQ" />
                  <option value="KAROQ" />
                  <option value="FABIA" />
                  <option value="DISCOVERY" />
                  <option value="EVOQUE" />
                  <option value="DEFENDER" />
                  <option value="FREELANDER" />
                  <option value="MU-X" />
                  <option value="D-MAX" />
                  <option value="KWID" />
                  <option value="DUSTER" />
                  <option value="CAPTUR" />
                  <option value="CLIO" />
                  <option value="308" />
                  <option value="508" />
                  <option value="2008" />
                  <option value="3008" />
                  <option value="ARONA" />
                  <option value="LEON" />
                  <option value="IBIZA" />
                  <option value="ATECA" />
                  <option value="AXIA" />
                  <option value="MYVI" />
                  <option value="VIVA" />
                  <option value="BEZZA" />
                  <option value="ID4" />
                  <option value="ID5" />
                  <option value="E-GOLF" />
                  <option value="GTE" />
                  <option value="HYBRID" />
                  <option value="SMART" />
                  <option value="MULTI VAN" />
                  <option value="VITO" />
                  <option value="WHITE" />
                  <option value="BLUE" />
                  <option value="-" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Engine No</label>
                <input
                  type="text"
                  name="engine_no"
                  value={formData.engine_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Chassis No</label>
                <input
                  type="text"
                  name="chassis_no"
                  value={formData.chassis_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Man. Year</label>
                <input
                  type="text"
                  name="man_year"
                  value={formData.man_year}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">In Milage</label>
                <input
                  type="text"
                  name="in_milage"
                  value={formData.in_milage}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Insurance Company</label>
                <input
                  type="text"
                  name="insurance_company"
                  value={formData.insurance_company}
                  onChange={handleChange}
                  list="insurance-companies"
                  placeholder="Type insurance company or select from list"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <datalist id="insurance-companies">
                  <option value="Sri Lanka Insurance" />
                  <option value="Amana Insurance" />
                  <option value="Ceylinco Insurance" />
                  <option value="HNB Insurance" />
                  <option value="Peoples Insurance" />
                  <option value="Fair First Insurance" />
                  <option value="Co-operative Insurance" />
                  <option value="Sanas General Insurance" />
                  <option value="Allianz Insurance" />
                  <option value="Oriant Insurance" />
                  <option value="Continental Insurance" />
                  <option value="LOLC Insurance" />
                  <option value="Agharar Insurance" />
                  <option value="MBSL Insurance" />
                  <option value="AIA Insurance" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Claim No</label>
                <input
                  type="text"
                  name="claim_no"
                  value={formData.claim_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date of Accident</label>
                <input
                  type="date"
                  name="date_of_accident"
                  value={formData.date_of_accident}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Advance</label>
                <input
                  type="number"
                  step="0.01"
                  name="advance"
                  value={formData.advance}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-medium text-white">Customer Details</h2>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="customer_type"
                    checked={!isNewCustomer}
                    onChange={() => setIsNewCustomer(false)}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Existing Customer</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="customer_type"
                    checked={isNewCustomer}
                    onChange={() => setIsNewCustomer(true)}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2 text-gray-300">New Customer</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ID No</label>
                <input
                  type="text"
                  name="id_no"
                  value={formData.id_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="2"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mob No</label>
                <input
                  type="text"
                  name="mob_no"
                  value={formData.mob_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tel No</label>
                <input
                  type="text"
                  name="tel_no"
                  value={formData.tel_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fax No</label>
                <input
                  type="text"
                  name="fax_no"
                  value={formData.fax_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Vat No</label>
                <input
                  type="text"
                  name="vat_no"
                  value={formData.vat_no}
                  onChange={handleChange}
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Technician</label>
                <input
                  type="text"
                  name="technician"
                  value={formData.technician}
                  onChange={handleChange}
                  placeholder="Enter technician name"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Service Advisor</label>
                <input
                  type="text"
                  name="service_advisor"
                  value={formData.service_advisor}
                  onChange={handleChange}
                  placeholder="Enter service advisor name"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800
                       transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printLoading ? 'Generating Preview...' : '🖨️ Print Preview'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="print-preview-overlay">
          <div className="print-preview-container">
            <div className="print-preview-header">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Job Card Print Preview</h3>
                <p className="text-sm text-gray-600">Review your job card before printing</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleActualPrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={closePrintPreview}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div className="print-preview-content">
              <JobCardPrint 
                jobData={formData} 
              />
            </div>
          </div>
        </div>
      )}

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
            padding: 20px;
            background: white;
            color: black;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
          }
        `
      }} />
    </div>
  );
};

export default AddJobCard;
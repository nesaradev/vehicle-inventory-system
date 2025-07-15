import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiRefreshCw, FiCamera, FiX } from 'react-icons/fi';

const AddPart = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recentProNos, setRecentProNos] = useState([]);
  const [recentParts, setRecentParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParts, setFilteredParts] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [preventAutoSave, setPreventAutoSave] = useState(false);
  const preventAutoSaveRef = useRef(false);
  const [formData, setFormData] = useState({
    pro_no: '',
    part_number: '',
    name: '',
    description: '',
    part_type: 'new',
    cost_price: '',
    selling_price: '',
    final_selling_price: '',
    low_stock_threshold: 10,
    supplier: '',
    location: '',
    item_name: '',
    photo: ''
  });

  // Draft management functions
  const saveDraft = () => {
    if (preventAutoSaveRef.current) return; // Don't save if auto-save is prevented
    
    if (formData.part_number || formData.name || formData.cost_price || formData.selling_price || selectedPhoto) {
      const draftData = {
        formData,
        photoPreview,
        searchTerm,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('addPartDraft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  };

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('addPartDraft');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        setFormData(draftData.formData);
        setPhotoPreview(draftData.photoPreview || null);
        setSearchTerm(draftData.searchTerm || '');
        if (draftData.photoPreview) {
          setFormData(prev => ({ ...prev, photo: draftData.photoPreview }));
        }
        setIsDraftLoaded(true);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('addPartDraft');
    setHasDraft(false);
    setIsDraftLoaded(false);
  };

  const checkForDraft = () => {
    const savedDraft = localStorage.getItem('addPartDraft');
    setHasDraft(!!savedDraft);
    return !!savedDraft;
  };

  const handleCancel = () => {
    // Prevent auto-save during and after reset
    setPreventAutoSave(true);
    preventAutoSaveRef.current = true;
    
    // Clear the draft
    clearDraft();
    
    // Reset form to initial state
    setFormData({
      pro_no: '',
      part_number: '',
      name: '',
      description: '',
      part_type: 'new',
      cost_price: '',
      selling_price: '',
      final_selling_price: '',
      low_stock_threshold: 10,
      supplier: '',
      location: '',
      item_name: '',
      photo: ''
    });
    
    // Reset photo state
    setSelectedPhoto(null);
    setPhotoPreview(null);
    
    // Reset search
    setSearchTerm('');
    
    // Clear file input
    const fileInput = document.getElementById('photo-input');
    if (fileInput) fileInput.value = '';
    
    // Re-enable auto-save after a short delay
    setTimeout(() => {
      setPreventAutoSave(false);
      preventAutoSaveRef.current = false;
    }, 1000);
    
    window.electronAPI.notification.show('Info', 'Form cleared and draft removed');
  };

  // Fetch recent Pro Nos on component mount
  useEffect(() => {
    fetchRecentProNos();
    fetchRecentParts();
    
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
      if (formData.part_number || formData.name || formData.cost_price || formData.selling_price || selectedPhoto) {
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
  }, [formData, selectedPhoto, searchTerm]);

  // Save draft when form data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.part_number || formData.name || formData.cost_price || formData.selling_price || selectedPhoto) {
        saveDraft();
      }
    }, 2000); // Wait 2 seconds after last change

    return () => clearTimeout(timeoutId);
  }, [formData, selectedPhoto]);

  // Add search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParts(recentParts);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = recentParts.filter(part => 
      part.pro_no?.toLowerCase().includes(searchTermLower) ||
      part.part_number?.toLowerCase().includes(searchTermLower) ||
      part.name?.toLowerCase().includes(searchTermLower)
    );
    setFilteredParts(filtered);
  }, [searchTerm, recentParts]);

  const fetchRecentProNos = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        'SELECT pro_no, name FROM parts ORDER BY pro_no DESC LIMIT 5'
      );
      setRecentProNos(result || []);
    } catch (error) {
      console.error('Error fetching recent Pro Nos:', error);
    }
  };

  const fetchRecentParts = async () => {
    try {
      const result = await window.electronAPI.database.query(
        'all',
        `SELECT pro_no, part_number, name, item_name, part_type, location, supplier,
                current_stock as quantity
         FROM parts 
         ORDER BY created_at DESC 
         LIMIT 50`  // Increased limit for better search results
      );
      setRecentParts(result || []);
    } catch (error) {
      console.error('Error fetching recent parts:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedPhoto(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target.result;
          setPhotoPreview(base64String);
          setFormData(prev => ({ ...prev, photo: base64String }));
        };
        reader.readAsDataURL(file);
      } else {
        window.electronAPI.notification.show('Error', 'Please select a valid image file');
      }
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, photo: '' }));
    const fileInput = document.getElementById('photo-input');
    if (fileInput) fileInput.value = '';
  };

  const getCurrentLocalTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const generateProNo = async () => {
    // If pro_no already exists in form, don't generate a new one
    if (formData.pro_no) {
      window.electronAPI.notification.show('Info', 'Pro No. already generated');
      return;
    }

    try {
      // Get the highest Pro No. from the parts table
      const lastPart = await window.electronAPI.database.query(
        'get',
        'SELECT pro_no FROM parts ORDER BY CAST(pro_no AS INTEGER) DESC LIMIT 1'
      );

      let nextValue;
      if (lastPart && lastPart.pro_no) {
        // If there are existing parts, increment from the highest Pro No.
        nextValue = parseInt(lastPart.pro_no) + 1;
      } else {
        // If no parts exist, start from 1
        nextValue = 1;
      }

      // Update the counter to match the highest value
      await window.electronAPI.database.query(
        'run',
        'UPDATE counters SET current_value = ? WHERE id = ?',
        [nextValue, 'pro_no']
      );

      // Format Pro No with leading zeros (6 digits)
      const proNo = nextValue.toString().padStart(6, '0');
      setFormData(prev => ({ ...prev, pro_no: proNo }));
      await fetchRecentProNos();
    } catch (error) {
      console.error('Error generating Pro No:', error);
      window.electronAPI.notification.show('Error', 'Failed to generate Pro No.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (!formData.pro_no) {
      console.log('No pro_no generated');
      window.electronAPI?.notification?.show('Error', 'Please generate a Pro No. first') || alert('Please generate a Pro No. first');
      return;
    }
    
    setLoading(true);
    try {
      // Convert numeric fields to proper types
      const dataToSubmit = {
        ...formData,
        cost_price: parseFloat(formData.cost_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        final_selling_price: parseFloat(formData.final_selling_price) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        current_stock: 0,
        // Set default values for removed fields
        item_code: '',
        cost_code: '',
        reorder_level: 0,
        unit: 'NOS',
        // Use current local time
        created_at: getCurrentLocalTimestamp(),
        updated_at: getCurrentLocalTimestamp()
      };

      console.log('Data to submit:', dataToSubmit);

      // Check if photo column exists and build appropriate query
      let result;
      try {
        // First try with photo column
        result = await window.electronAPI.database.query(
          'run',
          `INSERT INTO parts (
            pro_no, part_number, name, item_name, description, part_type,
            cost_price, selling_price, final_selling_price,
            current_stock, low_stock_threshold,
            item_code, cost_code, reorder_level, unit, location, supplier, photo,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dataToSubmit.pro_no,
            dataToSubmit.part_number,
            dataToSubmit.name,
            dataToSubmit.item_name || '',
            dataToSubmit.description || '',
            dataToSubmit.part_type,
            dataToSubmit.cost_price,
            dataToSubmit.selling_price,
            dataToSubmit.final_selling_price,
            dataToSubmit.current_stock,
            dataToSubmit.low_stock_threshold,
            dataToSubmit.item_code,
            dataToSubmit.cost_code,
            dataToSubmit.reorder_level,
            dataToSubmit.unit,
            dataToSubmit.location || '',
            dataToSubmit.supplier || '',
            dataToSubmit.photo || '',
            dataToSubmit.created_at,
            dataToSubmit.updated_at
          ]
        );
      } catch (photoColumnError) {
        if (photoColumnError.message?.includes('no column named photo')) {
          console.log('Photo column does not exist, inserting without photo');
          // Try without photo column
          result = await window.electronAPI.database.query(
            'run',
            `INSERT INTO parts (
              pro_no, part_number, name, item_name, description, part_type,
              cost_price, selling_price, final_selling_price,
              current_stock, low_stock_threshold,
              item_code, cost_code, reorder_level, unit, location, supplier,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dataToSubmit.pro_no,
              dataToSubmit.part_number,
              dataToSubmit.name,
              dataToSubmit.item_name || '',
              dataToSubmit.description || '',
              dataToSubmit.part_type,
              dataToSubmit.cost_price,
              dataToSubmit.selling_price,
              dataToSubmit.final_selling_price,
              dataToSubmit.current_stock,
              dataToSubmit.low_stock_threshold,
              dataToSubmit.item_code,
              dataToSubmit.cost_code,
              dataToSubmit.reorder_level,
              dataToSubmit.unit,
              dataToSubmit.location || '',
              dataToSubmit.supplier || '',
              dataToSubmit.created_at,
              dataToSubmit.updated_at
            ]
          );
        } else {
          throw photoColumnError;
        }
      }

      console.log('Database insert result:', result);
      if (result && result.changes > 0) {
        // Clear draft after successful save
        clearDraft();
        window.electronAPI?.notification?.show('Success', 'Part added successfully') || alert('Part added successfully');
        await fetchRecentParts();
        navigate('/inventory');
      } else {
        throw new Error('Failed to add part');
      }
    } catch (error) {
      console.error('Error adding part:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      if (error.message?.includes('UNIQUE constraint failed')) {
        if (error.message.includes('pro_no')) {
          window.electronAPI.notification.show('Error', 'Pro No. already exists');
        } else if (error.message.includes('part_number')) {
          window.electronAPI.notification.show('Error', 'Part number already exists');
        } else {
          window.electronAPI.notification.show('Error', 'Duplicate entry detected');
        }
      } else if (error.message?.includes('no such column')) {
        window.electronAPI.notification.show('Error', 'Database schema needs to be updated. Please restart the application.');
      } else {
        window.electronAPI.notification.show('Error', `Failed to add part: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Inventory</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Recent Pro Nos List */}
        <div className="col-span-3">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Pro Nos</h3>
            <div className="space-y-2">
              {recentProNos.map((item) => (
                <div 
                  key={item.pro_no}
                  className="text-sm p-2 bg-gray-700 rounded"
                >
                  <div className="font-mono text-white">{item.pro_no}</div>
                  <div className="text-xs text-gray-400 truncate">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="col-span-9">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">Add New Part</h1>
                
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
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pro No */}
                <div>
                  <label htmlFor="pro_no" className="block text-sm font-medium text-gray-300 mb-2">
                    Pro No. *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="pro_no"
                      name="pro_no"
                      className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={formData.pro_no}
                      readOnly
                      placeholder="Click arrow to generate"
                    />
                    <button
                      type="button"
                      onClick={generateProNo}
                      disabled={!!formData.pro_no}
                      className={`px-3 py-2 rounded-md transition-colors
                        ${formData.pro_no 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800'
                        }`}
                    >
                      <FiRefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Part Number */}
                <div>
                  <label htmlFor="part_number" className="block text-sm font-medium text-gray-300 mb-2">
                    Part Number *
                  </label>
                  <input
                    type="text"
                    id="part_number"
                    name="part_number"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.part_number}
                    onChange={handleChange}
                    required
                    placeholder="e.g., BRK-001"
                  />
                </div>

                {/* Part Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Part Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Item Name */}
                <div>
                  <label htmlFor="item_name" className="block text-sm font-medium text-gray-300 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    id="item_name"
                    name="item_name"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.item_name}
                    onChange={handleChange}
                    placeholder="Enter item name"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-300 mb-2">
                    Supplier
                  </label>
                  <input
                    type="text"
                    id="supplier"
                    name="supplier"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.supplier}
                    onChange={handleChange}
                    placeholder="Enter supplier name"
                  />
                </div>

                {/* Part Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="part_type"
                        value="new"
                        checked={formData.part_type === 'new'}
                        onChange={handleChange}
                        className="form-radio text-primary-600"
                      />
                      <span className="ml-2 text-gray-300">New</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="part_type"
                        value="used"
                        checked={formData.part_type === 'used'}
                        onChange={handleChange}
                        className="form-radio text-primary-600"
                      />
                      <span className="ml-2 text-gray-300">Used</span>
                    </label>
                  </div>
                </div>

                {/* Cost Price */}
                <div>
                  <label htmlFor="cost_price" className="block text-sm font-medium text-gray-300 mb-2">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    id="cost_price"
                    name="cost_price"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.cost_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label htmlFor="selling_price" className="block text-sm font-medium text-gray-300 mb-2">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    id="selling_price"
                    name="selling_price"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.selling_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Final Selling Price */}
                <div>
                  <label htmlFor="final_selling_price" className="block text-sm font-medium text-gray-300 mb-2">
                    Final Selling Price
                  </label>
                  <input
                    type="number"
                    id="final_selling_price"
                    name="final_selling_price"
                    className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.final_selling_price}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="bg-gray-900 text-white border border-gray-700 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Part Photo
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      id="photo-input"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-input"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <FiCamera className="w-4 h-4" />
                      Choose Photo
                    </label>
                    {selectedPhoto && (
                      <p className="text-sm text-gray-400 mt-1">
                        Selected: {selectedPhoto.name}
                      </p>
                    )}
                  </div>
                  
                  {photoPreview && (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Part preview"
                        className="w-24 h-24 object-cover rounded-md border border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave />
                  {loading ? 'Adding...' : 'Add Part'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800
                           transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Recent Parts Table with Search */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Parts</h2>
          
          {/* Search Box */}
          <div className="relative w-96">
            <input
              type="text"
              className="w-full bg-gray-900 text-white border border-gray-700 rounded-md px-10 py-2 
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by Pro No., Part Name, or Part Number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                onClick={() => setSearchTerm('')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pro No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Part Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Part Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Item Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredParts.map((part) => (
                <tr key={part.pro_no} className="hover:bg-gray-700">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-white">{part.pro_no}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{part.part_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{part.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{part.item_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      part.part_type === 'new' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {part.part_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{part.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{part.supplier}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      part.quantity <= 0 ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'
                    }`}>
                      {part.quantity}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-3 text-center text-gray-400">
                    {searchTerm ? 'No matching parts found' : 'No parts added yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AddPart;
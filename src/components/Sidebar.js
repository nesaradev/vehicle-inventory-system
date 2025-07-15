import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiPackage, 
  FiPlusSquare, 
  FiTruck, 
  FiFileText, 
  FiAlertTriangle,
  FiMoon,
  FiSun,
  FiClipboard,
  FiLayers,
  FiChevronDown,
  FiChevronRight,
  FiFileText as FiInvoice,
  FiDollarSign,
  FiShoppingCart,
  FiLogOut
} from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { logout } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: <FiHome className="w-5 h-5" />, label: 'Dashboard' },
    { path: '/inventory', icon: <FiPackage className="w-5 h-5" />, label: 'Inventory' },
    { path: '/add-part', icon: <FiPlusSquare className="w-5 h-5" />, label: 'Add Part' },
    { path: '/add-stock', icon: <FiLayers className="w-5 h-5" />, label: 'Add Stock' },
    { path: '/job-cards', icon: <FiClipboard className="w-5 h-5" />, label: 'Job Cards' },
    { path: '/stock-movement', icon: <FiTruck className="w-5 h-5" />, label: 'Stock History' },
    { path: '/low-stock', icon: <FiAlertTriangle className="w-5 h-5" />, label: 'Low Stock' },
    { path: '/reports', icon: <FiFileText className="w-5 h-5" />, label: 'Reports' },
  ];

  const dropdownMenus = [
    {
      key: 'sales',
      icon: <FiDollarSign className="w-5 h-5" />,
      label: 'Sales',
      items: [
        { path: '/estimates', icon: <FiInvoice className="w-4 h-4" />, label: 'Estimates' },
        { path: '/invoices', icon: <FiFileText className="w-4 h-4" />, label: 'Invoices' },
        { path: '/stock-receives', icon: <FiShoppingCart className="w-4 h-4" />, label: 'Stock Receives' },
        { path: '/stock-receive', icon: <FiShoppingCart className="w-4 h-4" />, label: 'New Stock Receive' },
      ]
    }
  ];

  // Auto-expand dropdowns when on child pages
  const getInitialDropdownState = () => {
    const state = {};
    dropdownMenus.forEach(dropdown => {
      const hasActiveChild = dropdown.items.some(item => location.pathname === item.path);
      if (hasActiveChild) {
        state[dropdown.key] = true;
      }
    });
    return state;
  };
  
  const [openDropdowns, setOpenDropdowns] = useState(getInitialDropdownState());

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Update dropdown state when location changes
  useEffect(() => {
    const newState = getInitialDropdownState();
    setOpenDropdowns(prev => ({ ...prev, ...newState }));
  }, [location.pathname]);

  return (
    <div className="w-64 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col animate-slide-in">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AutoParts Pro</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventory Management</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        {/* Regular Menu Items */}
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 group ${
              location.pathname === item.path
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className={`${location.pathname === item.path ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Dropdown Menu Items */}
        {dropdownMenus.map((dropdown) => {
          const isOpen = openDropdowns[dropdown.key];
          const hasActiveChild = dropdown.items.some(item => location.pathname === item.path);
          
          return (
            <div key={dropdown.key} className="mb-2">
              <button
                onClick={() => toggleDropdown(dropdown.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  hasActiveChild
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`${hasActiveChild ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>
                  {dropdown.icon}
                </span>
                <span className="font-medium flex-1 text-left">{dropdown.label}</span>
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${hasActiveChild ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  <FiChevronRight className="w-4 h-4" />
                </span>
              </button>
              
              {/* Dropdown Items */}
              <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="ml-6 mt-2 space-y-1">
                  {dropdown.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group ${
                        location.pathname === item.path
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <span className={`${location.pathname === item.path ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-500 dark:group-hover:text-primary-400'}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
        >
          {isDarkMode ? (
            <>
              <FiSun className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">Light Mode</span>
            </>
          ) : (
            <>
              <FiMoon className="w-5 h-5 text-gray-700" />
              <span className="font-medium">Dark Mode</span>
            </>
          )}
        </button>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-all duration-200"
        >
          <FiLogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
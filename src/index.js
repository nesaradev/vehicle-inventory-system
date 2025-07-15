import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log('🎯 React index.js loading - Starting React application');
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 Window object available:', !!window);
console.log('🔍 Document ready state:', document.readyState);
console.log('🔍 Root element exists:', !!document.getElementById('root'));

// Disable React's error overlay to prevent it from hiding our custom error display
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalError.apply(console, args);
  };
}

try {
  console.log('🚀 Creating React root...');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('✅ React root created successfully');
  
  console.log('🎨 Rendering React app...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('✅ React app rendered successfully');
} catch (error) {
  console.error('❌ Error during React initialization:', error);
  console.error('Stack trace:', error.stack);
}
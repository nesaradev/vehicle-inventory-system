import React from 'react';

const InvoicePrintHeader = ({ className = 'company-header' }) => (
  <div className={className}>
    <div className="company-name">EU Auto Parts</div>
    <div className="company-details">
      166/3, Kaolin Refinery Road, Werahera, Boralesgamuwa, Sri Lanka.<br />
      Tel: 0706333555
      <div style={{ textAlign: 'center', width: '100%' }}>
        E-mail: euautoparts@gmail.com
      </div>
    </div>
  </div>
);

export default InvoicePrintHeader;

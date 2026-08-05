import React from 'react';

const JobCardPrint = ({ jobData, selectedParts = [] }) => {
  const estimateItems = selectedParts.filter(item => item.source_type === 'estimate');

  return (
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '10px',
      color: 'black',
      boxSizing: 'border-box',
      padding: '10mm',
      margin: '0 auto'
    }}>
      
      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '8px',
        paddingBottom: '8px'
      }}>
        <h1 style={{
          margin: '0',
          fontSize: '18px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          lineHeight: '1.1'
        }}>
          Vishwa Motors Pvt Ltd
        </h1>
        <p style={{
          margin: '2px 0',
          fontSize: '8px',
          fontStyle: 'italic',
          lineHeight: '1.2'
        }}>
          186/3, Kaolin refinery, Road, Werahera, Boralesgamuwa Sri Lanka
        </p>
        <p style={{
          margin: '1px 0',
          fontSize: '8px',
          lineHeight: '1.2'
        }}>
          Tel: 070 633 3555
        </p>
        <p style={{
          margin: '1px 0',
          fontSize: '8px',
          lineHeight: '1.2'
        }}>
          E-mail: vishwa.motors@yahoo.com &nbsp;&nbsp;&nbsp;&nbsp; PV No. - 00204336
        </p>
      </div>

      {/* Service Advisor Section */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '8px',
        border: '1.5px solid #000',
        borderRadius: '4px'
      }}>
        {/* Left Column */}
        <div style={{ 
          flex: 1, 
          padding: '8px',
          borderRight: '1px solid #000'
        }}>
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>In Time</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.in_time || ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Mobile No.</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.mob_no || ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Vehicle No.</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.vehicle_no || ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Odometer</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.in_milage || ''}
          </div>
        </div>

        {/* Center Column */}
        <div style={{ 
          flex: 1, 
          padding: '8px',
          borderRight: '1px solid #000'
        }}>
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Date</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.job_date ? new Date(jobData.job_date).toLocaleDateString() : ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>Quotation No</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.job_no || ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>V Model</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.model || ''}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ 
          flex: 1, 
          padding: '8px'
        }}>
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>CheNo</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            marginBottom: '6px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.chassis_no || ''}
          </div>
          
          <div style={{ marginBottom: '3px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>TECHNICIAN</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.technician || ''}
          </div>
          
          <div style={{ marginBottom: '3px', marginTop: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '8px' }}>SERVICE ADVISOR</span>
          </div>
          <div style={{ 
            borderBottom: '1px solid #000', 
            paddingBottom: '2px',
            minHeight: '12px',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>
            {jobData.service_advisor || ''}
          </div>
        </div>
      </div>

      {/* Customer Section */}
      <div style={{ 
        marginBottom: '8px',
        border: '1.5px solid #000',
        padding: '6px',
        borderRadius: '4px'
      }}>
        <div style={{ marginBottom: '3px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '8px' }}>CUSTOMER</span>
        </div>
        <div style={{ 
          borderBottom: '1px solid #000', 
          paddingBottom: '3px',
          minHeight: '14px',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          {jobData.customer_name || ''}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ 
        border: '1.5px solid #000',
        marginBottom: '8px',
        borderRadius: '4px'
      }}>
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #000',
          backgroundColor: '#f8f8f8'
        }}>
          <div style={{ 
            flex: 4,
            padding: '4px',
            borderRight: '1px solid #000',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            ITEM DESCRIPTION
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            VALUE
          </div>
        </div>

        {/* Parts Items */}
        {Array.from({ length: Math.max(6, estimateItems.length) }, (_, index) => {
          const part = estimateItems[index];
          return (
            <div key={index} style={{ 
              display: 'flex',
              borderBottom: '1px solid #000',
              minHeight: '18px'
            }}>
              <div style={{ 
                flex: 4,
                padding: '3px',
                borderRight: '1px solid #000',
                fontSize: '8px'
              }}>
                {part ? `${part.type || ''} - ${part.description || ''}` : ''}
              </div>
              <div style={{ 
                flex: 1,
                padding: '3px',
                textAlign: 'right',
                fontSize: '8px'
              }}>
                {part ? part.quantity || '' : ''}
              </div>
            </div>
          );
        })}

        {/* Total Section */}
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #000',
          backgroundColor: '#f8f8f8'
        }}>
          <div style={{ 
            flex: 4,
            padding: '4px',
            borderRight: '1px solid #000',
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '9px'
          }}>
            TOTAL
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '9px'
          }}>
            &nbsp;
          </div>
        </div>

        {/* Tested Section */}
        <div style={{ 
          display: 'flex'
        }}>
          <div style={{ 
            flex: 3,
            padding: '4px',
            borderRight: '1px solid #000'
          }}>
            &nbsp;
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            borderRight: '1px solid #000'
          }}>
            &nbsp;
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            borderRight: '1px solid #000'
          }}>
            &nbsp;
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '10px'
          }}>
            TESTED
          </div>
        </div>
      </div>

      {/* Large Work Table */}
      <div style={{ 
        border: '1.5px solid #000',
        minHeight: '180px',
        borderRadius: '4px'
      }}>
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #000',
          backgroundColor: '#f8f8f8'
        }}>
          <div style={{ 
            flex: 2,
            padding: '4px',
            borderRight: '1px solid #000',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            JOB DESCRIPTION
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            borderRight: '1px solid #000',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            LABOUR
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            borderRight: '1px solid #000',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            NAME
          </div>
          <div style={{ 
            flex: 1,
            padding: '4px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '8px'
          }}>
            PARTS
          </div>
        </div>

        {/* Empty rows for manual entry */}
        {Array.from({ length: 15 }, (_, index) => (
          <div key={index} style={{ 
            display: 'flex',
            borderBottom: index === 14 ? 'none' : '1px solid #000',
            minHeight: '16px'
          }}>
            <div style={{ 
              flex: 2,
              padding: '2px',
              borderRight: '1px solid #000',
              fontSize: '8px'
            }}>
              &nbsp;
            </div>
            <div style={{ 
              flex: 1,
              padding: '2px',
              borderRight: '1px solid #000',
              fontSize: '8px'
            }}>
              &nbsp;
            </div>
            <div style={{ 
              flex: 1,
              padding: '2px',
              borderRight: '1px solid #000',
              fontSize: '8px'
            }}>
              &nbsp;
            </div>
            <div style={{ 
              flex: 1,
              padding: '2px',
              fontSize: '8px'
            }}>
              &nbsp;
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobCardPrint;

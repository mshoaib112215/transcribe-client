import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';

const AdminMappedBooksQueue = ({ data, wholeTransData, allUsers }) => {
  const [newData, setNewData] = useState([]);
  
  
  const columns = [
    {
      name: 'Book Name',
      selector: row => row.book_name,
      sortable: true,
    },
    {
      name: 'Status',
      cell: row => (
        <>
          {
            row.status === '' ?
              <p className='text-yellow-500'>
                Pending
              </p>
              :
              !row.status.toString().includes('100') && row.status !== 'Queue' ? (
                <div className='space-y-2'>
                  <p>
                    Process Status ({Number(row.status).toFixed(0)}%)
                  </p>
                  <div className='relative h-[10px] bg-gray-300 rounded-full'>
                    <div className='h-[10px] bg-blue-500 rounded-full' style={{ width: `${row.status}%` }}></div>
                  </div>
                </div>
              ) :
                row.status.includes('100') ?
                  <p className='text-green-500'>
                    Completed
                  </p>
                  :
                  row.status == 'Queue' ? <p className='text-yellow-500'>
                    Pending
                  </p>
                    : null
          }
        </>
      ),
      sortable: false,
    },
    {
      name: 'Action',
      cell: row => (
        <button
          onClick={() => {
            console.log(row)
            console.log(wholeTransData)
            console.log(allUsers)
          }}
          className="button"
        >
          View
        </button>
      ),
    },
  ];
  useEffect(() => {
    setNewData(wholeTransData.filter(d => !d.status.includes('100')));
  }, [wholeTransData]);

  return (
    <>
      <DataTable
        columns={columns}
        data={newData}
        highlightOnHover
        striped
        centered
        pagination
        responsive
      />
    </>
  );
};

export default AdminMappedBooksQueue;
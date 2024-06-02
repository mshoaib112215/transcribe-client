import React, { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';

const AdminMappedBook = ({ data, wholeTransData, allUsers }) => {
  const [newData, setNewData] = useState([]);
  
  
  const columns = [
    {
      name: 'Book Name',
      selector: row => row.book_name,
      sortable: true,
    },
    {
      name: 'Status',
      selector: row => (
        <p className='text-green-500'>
          Completed
        </p>
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
    setNewData(wholeTransData.filter(d => d.status.includes('100')));
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

export default AdminMappedBook;
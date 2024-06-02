import React from 'react'
import ManageUser from '../../components/ManageUser'
import DataTable from "react-data-table-component";

const AdminUsers = ({allUsers}) => {
  const [showModal, setShowModal] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [recordsPerPage] = React.useState(10)
  const handlePageChange = page => {
    setCurrentPage(page);
  };
  const paginatedUsers = allUsers.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  const columns = [
    {
      name: 'User Name',
      selector: row => row.name,
      sortable: true,
    },
    {
      name: 'User Email',
      selector: row => row.email,
      sortable: true,
    },
    {
      name: 'Action',
      cell: row => (
        <button
          onClick={() => {
            setShowModal(true)
          }}
          className="button"
        >
          Manage User
        </button>
      ),
    },
  ];
  return (
   <>
      <DataTable
        columns={columns}
        data={paginatedUsers}
        pagination
        paginationServer
        paginationTotalRows={allUsers.length}
        onChangePage={handlePageChange}
        highlightOnHover
        striped
        centered
        responsive

      />
    
      {showModal &&
        <ManageUser setShowModal={setShowModal} />
      }
      </>
  )
}

export default AdminUsers
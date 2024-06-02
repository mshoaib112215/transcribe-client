import React, { useEffect, useRef } from 'react'

const ManageUser = ({ setShowModal }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modalRef]);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center" id="manageuser-popupouter" onClick={() => setShowModal(false)}>
      <div className="bg-white p-6 rounded-lg w-1/2" ref={modalRef}>
        <header className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Manage User</h2>
          <button type="button" className="close" aria-label="Close" onClick={() => setShowModal(false)} id="manageuser-popupclose">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <div className="mt-4">
          <p>List of all users</p>
        </div>
      </div>
    </div>
  );
}

export default ManageUser
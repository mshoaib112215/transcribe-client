import React from 'react'

const FileInput = ({ handleFileChange, label, acceptedFileTypes, ref }) => {
    return (
        <div className='justify-between flex w-full items-center'>
            <label className='text-sm'> {label} </label>
            <input ref={ref} accept={acceptedFileTypes} type="file" onChange={handleFileChange} />
        </div>
    )
}

export default FileInput
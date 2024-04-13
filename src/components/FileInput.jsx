import React from 'react'

const FileInput = ({ handleFileChange, label, acceptedFileTypes, ref }) => {
    const fileInputRef = React.useRef();
    const [fileName, setFileName] = React.useState('');

    const openFileDialog = () => {
        fileInputRef.current.click();
    }

    const handleFileSelect = (event) => {
        setFileName(event.target.files[0].name);
        handleFileChange(event);
    }

    return (
        <div className='relative flex-1 whitespace-nowrap'>
            <label className='block w-full text-center border-2 border-dashed border-gray-400 rounded-lg p-4 cursor-pointer hover:border-gray-500' onClick={openFileDialog}>
                <span className='block text-gray-700 font-semibold'>{label}</span>
                <span className='block text-gray-500'>{fileName || 'No file chosen'}</span>
            </label>
            <input
                ref={(ref) => { fileInputRef.current = ref; if(ref) ref.setAttribute("style", "display:none;") }}
                accept={acceptedFileTypes}
                type="file"
                onChange={handleFileSelect}
            />
        </div>
    )
}

export default FileInput


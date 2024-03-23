import React, { useEffect, useState } from "react";
import { read, utils, write } from "xlsx";
import DataTable from "react-data-table-component";
import { saveAs } from "file-saver";
import Input from "postcss/lib/input";
import { toast } from "react-toastify";


const TimestampsFileInput = ({ handleFileChange, timestampsFile, setTimeStamps, timeStamps, transcription, searches, data, setData, setIsCaputed, isCaputed }) => {
    // transcription = ['testing1', 'testing2']

    useEffect(() => {
        if (timestampsFile && timeStamps.length === 0) {


            const readFile = () => {
                const workbook = read(timestampsFile, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = utils.sheet_to_json(sheet, { header: 1 });
                const timeStamps = rows
                    .filter(row => row[0] !== undefined)
                    .map(row => row[0]);

                setData(rows);
                setTimeStamps((prev) => [...prev, ...timeStamps])
                setIsCaputed(false)
            };


            readFile();
        }

        if (timeStamps?.length > 0) {
            console.log(timeStamps.map((t) => [t]))
            setData(timeStamps.map((t) => [!t.toString().includes(":") ? timeFormator(t) : t]))
        }
        try {
            let filteredSearches = searches.filter(search => search !== undefined || search !== "" || search !== null);
            let uniqueSearches = filteredSearches.filter((search, index, self) => self.indexOf(search) === index);
            console.log(searches)
            setData(prevData => prevData.map((subArray, index) => {
                return [...subArray, transcription[index]?.text == '' ? "Got empty string please see your audio and Timestamps combination" : transcription[index]?.text, (uniqueSearches[index]) || ""]
            }));
        }
        catch (err) {
            console.log(err)
        }
        // "edthem…andtheyflew.APOLLINAIREIt’s a Friday evening in New York in the early spring of 2006. I’m inmy combined60 Minutes and60 Minutes II office at 555 West 57th,across the street from the old renovated milk bar"


    }, [timeStamps, timestampsFile, transcription, searches]);


    const timeFormator = (time) => {
        try {

            return new Date(time * 1000).toISOString().substr(11, 8);
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }
    const downloadXLSX = () => {
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet(data);
        utils.book_append_sheet(workbook, sheet, "Sheet1");

        const wbout = write(workbook, { bookType: "xlsx", bookSST: true, type: "binary" });
        const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
        saveAs(blob, "timestamps.xlsx");
    };

    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }
    // useEffect(() => {
    //     // setData(()=>(prev) => prev.map((subArray, index) => [...subArray, transcription[index]?.text, (searches[index]) || ""]));
    //     console.log(transcription)
    // }, [data, transcription, searches])
    // Generate columns array based on data structure
    const columns = data && data[0] && Object.keys(data[0]).map((key) => {
        let colNum = parseInt(key) + 1;

        return {
            name: "Column #" + colNum,
            selector: (row) => row[key],
            cell: (cellProps) => (
                <div className="max-w-[fit-content] overflow-auto whitespace-wrap">
                    {cellProps[key]}
                </div>
            ),
        };
    });

    return (
        <div className="mx-auto w-fit p-5">
            <div className="flex gap-3 items-end justify-center">
                <div>

                    <label htmlFor="timestamps-file" className="block text-sm font-medium text-gray-700 mb-2">Upload Timestamps File</label>
                    <input
                        type="file"
                        id="timestamps-file"
                        accept=".xlsx, .xls"
                        disabled={isCaputed}
                        // value = {timestampsFile? timestampsFile : ""}
                        onChange={(e) => { handleFileChange(e) }}
                        className="p-2 rounded border border-gray-300 disabled:cursor-not-allowed "
                    />
                    {/* {console.log(timestampsFile)}
                    {console.log(timestampsFile?.sheet_to_json)} */}
                </div>
            </div>
            <div className="w-full mt-4">
                <h2 className="text-xl font-semibold mb-2">Table View</h2>
                <button
                    type="button"
                    onClick={downloadXLSX}
                    className="bg-blue-500 text-white py-2 px-4 rounded"
                >
                    Download as XLSX
                </button>
                <div className="w-[90vw] h-[50vh] mt-4">
                    <DataTable
                        columns={columns}
                        data={data}
                        responsive
                        pagination
                        className="rounded-lg overflow-hidden shadow-md"
                    />
                </div>
            </div>
        </div>
    );
};

export default TimestampsFileInput;
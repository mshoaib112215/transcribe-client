// Separate the logic for displaying data in the DataTable component

import kmp_matcher from "kmp-matcher";
import React, { useCallback, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import { utils, write } from "xlsx";

const DataTableDisplay = ({ data }) => {
    const [specificKeysData, setSpecificKeysData] = useState([]);
    const [loading, setLoading] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const rowsPerPage = 10;
    const timeFormator = (time) => {
        if (time.includes(':'))
            return time
        time = time.split(',')
        try {
            // push all times with time formate but with comman
            return time.map(t => new Date(t * 1000).toISOString().substr(11, 8)).join(', ')
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setSpecificKeysData([])
            for (const { timestamps, book_name, transcriptions, book_text } of data) {
                const timestampsArray = timestamps?.split(',');
                for (let i = 0; i < timestampsArray.length; i++) {
                    const timestamp = timestampsArray[i];
                    let searchTerm = JSON.parse(transcriptions)[i]?.text || "";
                    const pdfText = JSON.parse(book_text).map((page) => page.textInfo.replace(/<br>/g, " ")).join(' ');

                    let searchResult = searchPDF(pdfText, searchTerm);
                    searchTerm == "" ? searchResult = "" : searchResult;
                    const processedData = [book_name, timeFormator(timestamp), searchTerm, searchResult];
                    console.log(timestamp)
                    // Update state with the new processed data
                    console.log(specificKeysData)
                    setSpecificKeysData(prevData => {
                        const updatedData = prevData.some(d => timeFormator(d[1]) === processedData[1]) ?
                            prevData.map(d => timeFormator(d[1]) === processedData[1] ? processedData : d) :
                            [...prevData, processedData];

                        return updatedData;
                    });

                    // update loading bar's width %
                    setLoading(i / timestampsArray.length * 100);
                    // Pause for 300ms before processing the next timestamp
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [data]);
    // const specificKeysData = data.map(({ timestamps, book_name }) =  > [book_name, timestamps]);
    const columns = specificKeysData && specificKeysData[0] && Object.keys(specificKeysData[0]).map((key) => {
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
    const searchPDF = useCallback((pdfText, searchTerm) => {
        const searchResults = [];
        let starter = 0;
        let ender = 0;

        for (let i = 7; i >= 4; i--) {
            const firstWords = searchTerm.split(' ').slice(starter, i + starter).join(' ');
            let wordsToGet = "";
            const firstWordsIndices = kmp_matcher.kmp(pdfText, firstWords);

            for (const index of firstWordsIndices) {
                const slicedText = pdfText.slice(index)
                if (firstWordsIndices !== -1) {
                    if (starter !== 0) {
                        let j = 0;
                        let spaces = 1;
                        while (j < 30) {
                            if (index - j > 0) {
                                j++;

                                wordsToGet += pdfText[index - j];
                                if (pdfText[index - j] === ' ') {
                                    if (spaces <= (starter)) {
                                        spaces++;
                                    } else {
                                        break;
                                    }
                                }
                            } else {
                                break;
                            }
                        }
                        wordsToGet = wordsToGet.split('').reverse().join('');
                    }
                    for (let j = 7; j >= 5; j--) {
                        let lastWords = '';
                        if (ender == 0) {
                            lastWords = searchTerm.split(' ').slice(-j).join(' ');
                        }
                        else {
                            lastWords = searchTerm.split(' ').slice(-j - ender, ender).join(' ');
                        }
                        const lastWordIndexes = kmp_matcher.kmp(slicedText, lastWords);
                        if (lastWordIndexes.length > 0) {
                            const lastWordIndex = lastWordIndexes[0];
                            const extractedText = slicedText.slice(0, lastWordIndex + lastWords.length);
                            searchResults.push(wordsToGet + extractedText);
                            break;
                        }
                        if (j === 5 && lastWordIndexes.length === 0) {
                            j = 7;
                            ender--;
                        }
                    }
                }
            }

            if (searchResults.length > 0) {
                break;
            }
            if (i === 4) {
                i = 7;
                starter++;
            }
        }
        // console.log(searchResults)
        // console.log(searchTerm)
        // console.log(pdfText)

        return searchResults[0];
    }, []);
    const downloadXLSX = () => {
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet(specificKeysData);
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
    return (

        // loading ?
        //     <div>Loading...</div>
        //     :
        <>
            <div className="w-full mt-4">
                <h2 className="text-xl font-semibold mb-2">Table View</h2>
                <button
                    type="button"
                    onClick={downloadXLSX}
                    className="button"
                >
                    Download as XLSX
                </button>
                {loading && typeof loading === 'number' && loading !== 100 && (
                    <div>
                        Regenerating Notes ({loading.toFixed(0)}%)
                        <div className='relative h-[10px] bg-gray-300 rounded-full'>
                            <div className='h-[10px] bg-blue-500 rounded-full' style={{ width: `${loading}%` }}></div>
                        </div>
                    </div>
                )}

                <div className="w-full h-[50vh] mt-4">
                    <DataTable
                        columns={columns}
                        data={specificKeysData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)}
                        pagination
                        paginationServer
                        paginationTotalRows={data.length}
                        onChangePage={(currentPage) => setCurrentPage(currentPage)}
                        paginationRowsPerPageOptions={[10, 20, 30]}
                    />
                </div>
            </div>
        </>
    );

};

export default DataTableDisplay;
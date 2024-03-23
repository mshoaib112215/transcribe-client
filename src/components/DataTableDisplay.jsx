// Separate the logic for displaying data in the DataTable component

import kmp_matcher from "kmp-matcher";
import React, { useCallback, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import { utils, write } from "xlsx";

const DataTableDisplay = ({ data }) => {
    const [specificKeysData, setSpecificKeysData] = useState([]);


    const timeFormator = (time) => {
        if(time.includes(':'))
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
            const updatedData = await Promise.all(data?.map(async ({ timestamps, book_name, transcriptions, book_text }) => {
                const timestampsArray = timestamps.split(',');
                const updatedArray = timestampsArray.map(timestamp => {
                    const searchTerm = JSON.parse(transcriptions)[timestampsArray.indexOf(timestamp)].text;
                    const pdfText = JSON.parse(book_text).map((page) => page.textInfo.replace(/<br>/g, " ")).join(' ');

                    const searchResult =  searchPDF(pdfText, searchTerm);

                    return [book_name, timeFormator(timestamp), searchTerm, searchResult];
                });

                return updatedArray;
            }));
            console.log(updatedData)
            // updatedData making it AOA
            const AOAData = updatedData.reduce((acc, curr) => {
                return acc.concat(curr);
            })
            
            setSpecificKeysData(AOAData);
        };
        console.log(data)
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
    const searchPDF = useCallback( (pdfText, searchTerm) => {
        const searchResults = [];
        let starter = 0;
        let ender = 0;

        for (let i = 7; i >= 4; i--) {
            const firstWords = searchTerm.split(' ').slice(starter, i + starter).join(' ');
            let wordsToGet = "";
            const firstWordsIndices =    kmp_matcher.kmp(pdfText, firstWords);
            
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
        console.log(searchResults)
        
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
        <div className="w-full mt-4">
            <h2 className="text-xl font-semibold mb-2">Table View</h2>
            <button
                type="button"
                onClick={downloadXLSX}
                className="bg-blue-500 text-white py-2 px-4 rounded"
            >
                Download as XLSX
            </button>
            <div className="w-full h-[50vh] mt-4">
                <DataTable
                    columns={columns}
                    data={specificKeysData}
                    responsive
                    pagination
                    className="rounded-lg overflow-hidden shadow-md"
                />
            </div>
        </div>
    );
};

export default DataTableDisplay;
import kmp_matcher from 'kmp-matcher';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker URL for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFReader = ({ ebookFile, setSearches, transcription, searches, setAllDone, allDone, pdfText, setPdfText }) => {
    const [numPages, setNumPages] = useState(null);
    const [textInfo, setTextInfo] = useState([])
    const [orignalText, setOrignalText] = useState(null);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setAllDone(false)
    };

    const extractText = useCallback(async (pageIndex, page) => {
        const textContent = await page.getTextContent();
        // console.log(textContent)
        const textItems = textContent.items.map(item => {
            const { transform, str } = item;
            const x = transform[4];
            const y = transform[5];
            return {
                text: str == '' ? " " : str,
                location: { x, y }
            };
        });
        setTextInfo((prev) => [...prev, textItems])
        const pageText = textItems.flatMap((item) => item.text).join('');
        setPdfText(prevPdfText => [
            ...prevPdfText,
            {
                page: pageIndex,
                textInfo: pageText,
            }
        ]);
        // console.log(numPages, " ", pageIndex)
        if (pageIndex == numPages) {

            setAllDone(true)
            console.log(textInfo)

        }
    });
    const orignalTextRef = useRef(null);

    useEffect(() => {
        console.log(orignalText);
       
    }, [orignalText]);

    useEffect(() => {
        if (allDone) {
            setTimeout(() => {

                orignalTextRef.current = document.getElementsByClassName("markedContent");
                // setOrignalText(orignalTextRef);
                if (orignalTextRef.current) {
                    Array.from(orignalTextRef.current).forEach((s, i) => {
                        Array.from(s.getElementsByTagName("span")).forEach((ss, i) => {
                            const newSpans = highlightSearchTerm(ss.innerText, `other, Peter Grant, who, though not a `);
                            ss.innerHTML = newSpans;
                        });
                    });
                }
            }, 100);
        }
    }, [allDone]);

    function highlightSearchTerm(text, searchTerm) {
        const start = kmp_matcher.kmp(text, searchTerm.trim())
        const lenght = searchTerm.trim().length
        if (start.length > 0) {

            const word = text.slice(start[0], start[0] + lenght);
            const previousWords = text.slice(0, start[0])
            const lastWords = text.slice(start[0] + lenght)
            return `${previousWords}<span class="bg-yellow-200">${word}</span>${lastWords}`;
        }
        else {
            return text
        }
    }

    const searchPDF = async (pdfText, searchTerm) => {
        const searchResults = [];
        let starter = 0;
        let ender = 0;
        let limit = 20;

        for (let i = 7; i >= 4; i--) {
            limit--;
            // Take the first 2 words and the last 2 words
            const firstWords = searchTerm.split(' ').slice(starter, i + starter).join(' ');
            // Create a regular expression with the first and last words
            // console.log(firstWords);

            let wordsToGet = "";
            const firstWordsIndices = await kmp_matcher.kmp(pdfText, firstWords);

            console.log("firstWordsIndices = " + firstWordsIndices);

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
                                        console.log("spaces got " + spaces);
                                    } else {
                                        break;
                                    }
                                }
                            } else {
                                break;
                            }
                        }
                        console.log(wordsToGet);
                        wordsToGet = wordsToGet.split('').reverse().join('');
                        console.log(wordsToGet);
                    }
                    for (let j = 7; j >= 5; j--) {
                        console.log(index)

                        // Adjust the starting point for the last words
                        let lastWords = '';
                        if (ender == 0) {
                            lastWords = searchTerm.split(' ').slice(-j).join(' ');
                        }
                        else {
                            lastWords = searchTerm.split(' ').slice(-j - ender, ender).join(' ');
                        }
                        console.log("lastWords = " + lastWords)

                        // const adjustedIndex = index + firstWords.length;
                        const lastWordIndexes = kmp_matcher.kmp(slicedText, lastWords);
                        console.log("lastWordIndexes = ", lastWordIndexes)
                        if (lastWordIndexes.length > 0) {
                            // Assuming lastWordIndexes contains a single value, adjust accordingly
                            const lastWordIndex = lastWordIndexes[0];

                            // Extract text from first word's index to last word's index
                            const extractedText = slicedText.slice(0, lastWordIndex + lastWords.length);
                            console.log("Extracted Text = ", extractedText);

                            searchResults.push(wordsToGet + extractedText);
                            break;
                        }
                        if (j === 5 && lastWordIndexes.length === 0) {
                            j = 7;

                            ender--;
                        }
                    }

                }
                console.log(searchResults);

            }

            if (searchResults.length > 0) {
                break;
            }
            if (i === 4) {
                i = 7;
                starter++;
            }
            if (limit == 0) {
                return '';
            }
        }

        return searchResults[0];
    };

    return (
        <div className='w-fit flex justify-center'>
            <Document
                file={ebookFile}
                onLoadSuccess={onDocumentLoadSuccess}
            >
                {numPages && [...Array(numPages)].map((page, index) => (
                    <React.Fragment key={index}>
                        <p className=' text-[#808080b1] select-none'>
                            <div className='flex w-full gap-52 justify-evenly'>
                                <span className='absolute'>
                                    Page {index + 1} of {numPages}
                                </span>
                                <p>
                                    Book Pages Canvas
                                </p>
                                <p>
                                    Extracted text
                                </p>
                            </div>
                        </p>
                        <Page
                            pageNumber={index + 1}
                            renderAnnotationLayer={false}
                            onLoadSuccess={(page) => extractText(index + 1, page)}
                            className={"flex gap-2 items-center absolute my-3 justify-center md:flex-row flex-col text-xs shadow-[2px_2px_11px_1px_#0000004a] "}
                        />

                    </React.Fragment>
                ))}
            </Document>
            <p>{pdfText.text}</p>
        </div>
    );
};

export default PDFReader;

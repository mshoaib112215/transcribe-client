import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set worker URL for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFReader = ({ ebookFile, setSearches, transcription, searches, setAllDone, allDone, pdfText, setPdfText }) => {
    const [numPages, setNumPages] = useState(null);
    const [textInfo, setTextInfo] = useState([])

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setAllDone(false)
    };

    const extractText = async (pageIndex, page) => {
        const textContent = await page.getTextContent();
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

        // Extract search term occurrences
        const searchTermOccurrences = [];
        const searchTerm = 'Sohaib'; // Replace with the actual search term
        const regex = new RegExp(`(\\b${searchTerm}\\b)`, 'gi');
        const highlightedPageText = pageText.replace(regex, (match) => {
            const startIndex = pageText.indexOf(match);
            const endIndex = startIndex + match.length;
            searchTermOccurrences.push({
                startIndex,
                endIndex,
                text: match,
            });
            return `<span class="bg-yellow-200">${match}</span>`;
        });
        setPdfText(prevPdfText => [
            ...prevPdfText,
            {
                page: pageIndex,
                textInfo: highlightedPageText,
            }
        ]);

        // Add occurrences to textInfo
        setTextInfo((prev) => {
            const newTextInfo = [...prev];
            searchTermOccurrences.forEach((occurrence) => {
                const { startIndex, endIndex, text } = occurrence;
                newTextInfo[pageIndex - 1].push({
                    text,
                    location: {
                        x: textItems[startIndex].location.x,
                        y: textItems[startIndex].location.y,
                    },
                });
            });
            return newTextInfo;
        });

        if (pageIndex == numPages) {
            setAllDone(true)
            console.log(textInfo)
        }
    };

    function highlightSearchTerm(text, searchTerm) {

        const words = text.split(' ');
        const highlightedWords = words.map(word => {
            if (word.toLowerCase() === searchTerm.toLowerCase()) {
                return `<span class="bg-yellow-200">${word}</span>`;
            } else {
                return word;
            }
        });
        return highlightedWords.join(' ');
    }

    // useEffect(() => {
    //     console.log(transcription);
    //     if (allDone && pdfText.length > 0) {
    //         const allPageText = pdfText?.map((page) => page.text).join(' ');

    //         const searchPromises = transcription.map(async (searchTerm) => {
    //             console.log("searching....");
    //             const result = await searchPDF(allPageText, searchTerm.text);
    //             return result;
    //         });

    //         Promise.all(searchPromises)
    //             .then(results => {
    //                 setSearches((prev) => [...prev, ...results]);
    //             })
    //             .catch(error => {
    //                 console.error("Error during search:", error);
    //             });
    //     }
    // }, [transcription, allDone]);




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
                            console.log(ender)
                            ender--;
                        }
                    }

                    // for (let k = 5; k >= 3; k--) {
                    //     const lastWords = searchTerm.split(' ').slice(-k).join(' ');
                    //     const regex = new RegExp(`${firstWords}(\\S+\\s+){0,}(.*${lastWords})`, 'i');
                    //     const matches = pdfText.slice(adjustedIndex).match(regex);

                    //     if (matches?.length > 0) {
                    //         searchResults.push(matches[0]);
                    //     }
                    // }
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
                        <p>
                            Page {index + 1} of {numPages}
                            <div className='flex w-full justify-evenly'>
                                <p>
                                    Book Page Canvas
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
                            className={"flex gap-2 items-center justify-center md:flex-row flex-col text-xs shadow-md"}
                        />

                    </React.Fragment>
                ))}
            </Document>
            <p>{pdfText.text}</p>
        </div>
    );
};

export default PDFReader;

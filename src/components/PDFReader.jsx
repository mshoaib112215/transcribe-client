import kmp_matcher from 'kmp-matcher';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'react-toastify';

// Set worker URL for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFReader = ({ ebookFile, setSearches, transcription, searches, setAllDone, allDone, pdfText, setPdfText, segmentsText, playing, setNumPages, numPages }) => {

    const [show, setShow] = useState(true)

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setAllDone(false)
        setPdfText([])
    };

    const extractText = useCallback(async (pageIndex, page) => {
        const textContent = await page.getTextContent();
        // console.log(textContent)
        const textItems = textContent.items.map(item => {
            const { transform, str } = item;
            const x = transform[4];
            const y = transform[5];
            return {
                text: str == '' ? "<br>" : str,
                location: { x, y }
            };
        });

        // setTextInfo((prev) => [...prev, textItems])
        const pageText = textItems.flatMap((item) => item.text).join(' ');
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

        }
    });
    const orignalTextRef = useRef(null);



    useEffect(() => {
        if (allDone) {
            // setTimeout(() => {

            //     orignalTextRef.current = document.getElementsByClassName("markedContent");
            //     // setOrignalText(orignalTextRef);
            //     if (orignalTextRef.current) {
            //         Array.from(orignalTextRef.current).forEach((s, i) => {
            //             Array.from(s.getElementsByTagName("span")).forEach((ss, i) => {
            //                 const newSpans = highlightSearchTerm(ss.innerText, `Rockwell `);
            //                 ss.innerHTML = newSpans;
            //             });
            //         });
            //     }
            // }, 100);
            // segmentsText.map((obj) => {
            //     const current_time = obj.current_time
            //     obj?.text?.segments.forEach((seg) => {
            //         console.log(seg.start + current_time )
            //         console.log(seg.end + current_time )

            //         // orignalTextRef.current = document.getElementsByClassName("markedContent");

            //         // setOrignalText(orignalTextRef);
            //         // if (orignalTextRef.current) {
            //         //     Array.from(orignalTextRef.current).forEach((s, i) => {
            //         //         Array.from(s.getElementsByTagName("span")).forEach((ss, i) => {
            //         //             const newSpans = highlightSearchTerm(ss.innerText, `Rockwell `);
            //         //             ss.innerHTML = newSpans;
            //         //         });
            //         //     });
            //         // }
            //     })
            // })

        }
        else if (Array.from(segmentsText).length != 0) {

            toast.error('Still loading eBook!');
        }
    }, [segmentsText]);

    // useEffect(() => {
    //     if (playing != 0) {
    //         // console.log(playing)
    //         segmentsText && segmentsText?.map((obj) => {
    //             const current_time = obj.current_time
    //             obj?.text?.segments.forEach((seg) => {
    //                 console.log(seg.start + current_time)
    //                 console.log(seg.end + current_time)

    //                 // orignalTextRef.current = document.getElementsByClassName("markedContent");

    //                 // setOrignalText(orignalTextRef);
    //                 // if (orignalTextRef.current) {
    //                 //     Array.from(orignalTextRef.current).forEach((s, i) => {
    //                 //         Array.from(s.getElementsByTagName("span")).forEach((ss, i) => {
    //                 //             const newSpans = highlightSearchTerm(ss.innerText, `Rockwell `);
    //                 //             ss.innerHTML = newSpans;
    //                 //         });
    //                 //     });
    //                 // }
    //             })
    //         })
    //     }
    // }, [playing])



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
                        wordsToGet = wordsToGet.split('').reverse().join('');
                    }
                    for (let j = 7; j >= 5; j--) {
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
        <>
            <div className='w-fit flex flex-col justify-center '>
                <button onClick={() => setShow(!show)} className="bg-blue-500 text-white py-2 px-4 rounded w-full max-w-md m-auto">Hide/Show Book Canvas</button>
                <Document
                    file={ebookFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                >
                    {numPages && [...Array(numPages)].map((page, index) => (
                        <React.Fragment key={index}>
                            <p className=' text-[#808080b1] select-none'>
                                <div className='flex w-full gap-52 justify-evenly'>
                                    <span className='absolute '>
                                        Page {index + 1} of {numPages}
                                    </span>
                                    <p className={`${!show ? "" : "hidden"} text-nowrap`}>
                                        Book Pages Canvas
                                    </p>
                                    <p className='text-right w-full'>
                                        Extracted text
                                    </p>
                                </div>
                            </p>
                            <div className='flex gap-2 items-center justify-center md:flex-row flex-col shadow-[2px_2px_11px_1px_#0000004a]   my-3'>
                                <div className={`${!show ? "" : "hidden"}`}>

                                    <Page
                                        pageNumber={index + 1}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        onLoadSuccess={(page) => extractText(index + 1, page)}
                                        className={""}
                                    />
                                </div>


                                <p key={index} className=' w-fit p-3 textLayers text-sm' dangerouslySetInnerHTML={{ __html: (pdfText.length > 0 && pdfText.filter((page) => page.page === index + 1)[0]?.textInfo) == false ? "" : pdfText.length > 0 && pdfText.filter((page) => page.page === index + 1)[0]?.textInfo }}>

                                    {/* {pdfText.length > 0 && pdfText.filter((page) => page.page === index + 1)[0]?.textInfo} */}
                                </p>
                            </div>


                        </React.Fragment>
                    ))}
                </Document>
            </div>


        </>
    );
};

export default PDFReader;

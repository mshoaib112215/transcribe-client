import React from 'react'
import TimestampsFileInput from './TimestampsFileInput'

const Regenerate = ({data}) => {
    // const [data, setData] = useState([]);
    const [timestampsFile, setTimestampsFile] = useState(null);
    const [timeStamps, setTimeStamps] = useState([])
    const [transcription, setTranscription] = useState('');
    const [searches, setSearches] = useState([]);
    const [isCaputed, setIsCaputed] = useState(false);

    useEffect(() => {
        if ( data.pdfText.length > 0) {
            const allPageText = data.pdfText?.map((page) => page.textInfo).join(' ');
            if (data.transcription.length > 0) {
                const searchPromises = data.transcription?.map(async (searchTerm) => {
                    const result = await searchPDF(allPageText, searchTerm.text);
                    return result;
                });

                Promise.all(searchPromises)
                    .then(results => {
                        console.log(results)
                        setSearches(results);
                    })
                    .catch(error => {
                        console.error("Error during search:", error);
                    });
            }
        }
        // }, [ segmentsText]);
    }, [transcription, pdfText]);
    
    const searchPDF = useCallback(async (pdfText, searchTerm) => {
        const searchResults = [];
        let starter = 0;
        let ender = 0;

        for (let i = 7; i >= 4; i--) {
            const firstWords = searchTerm.split(' ').slice(starter, i + starter).join(' ');
            let wordsToGet = "";
            const firstWordsIndices = await kmp_matcher.kmp(pdfText, firstWords);

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


        return searchResults[0];
    }, []);

    const handleTimestampsFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const binaryStr = event.target.result;
                setData([])
                setTimestampsFile(binaryStr);
            };
            reader.readAsBinaryString(file);
        }
    };
    return (
        <>
            <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={data.transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} />
        </>
    )
}

export default Regenerate
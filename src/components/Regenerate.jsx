import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MappedTimestampInput from './MappedTimestampInput';
import kmp_matcher from 'kmp-matcher';
import AudioPlayer from "react-audio-player";
import FileInput from './FileInput';
import { toast } from 'react-toastify';

const Regenerate = ({ selectedData }) => {
    // const [selectedData, setselectedData] = useState([]);
    const [timestampsFile, setTimestampsFile] = useState(null);
    const [timeStamps, setTimeStamps] = useState([])
    const [transcription, setTranscription] = useState(selectedData.transcription);
    const [searches, setSearches] = useState([]);
    const [isCaputed, setIsCaputed] = useState(false);
    const [data, setData] = useState([]);

    function timestampToSeconds(timestamp) {
        // Check if the timestamp contains a colon (:) to determine if it's in the format "HH:MM:SS"
        if (timestamp.includes(':')) {
            // Split the timestamp into hours, minutes, and seconds
            const [sign, hours, minutes, seconds] = timestamp.split(':').map(Number);

            // Determine if the timestamp is negative
            const isNegative = sign === '-';

            // If the timestamp is in the format "HH:MM:SS", convert it to seconds
            if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
                const multiplier = isNegative ? -1 : 1;
                const totalSeconds = multiplier * (Math.abs(hours) * 3600 + Math.abs(minutes) * 60 + Math.abs(seconds));
                return totalSeconds;
            }
        }

        // If the timestamp is not in the format "HH:MM:SS" or contains a float/number, return it as is
        return timestamp;
    }

    const getTransSegs = (transcription) => {
        const transcriptions = [];

        timeStamps.forEach((startingTimestamp) => {
            const start = isCaputed ? startingTimestamp : timestampToSeconds(startingTimestamp);
            const duration = 50
            const end = start + parseFloat(duration);

            let startSegment = null;
            const endSegments = [];

            transcription.segments.forEach((seg) => {
                if (seg.start <= start && start <= seg.end) {
                    startSegment = seg;
                    return
                }
                if (start <= seg.start && seg.start <= end && end <= seg.end) {
                    endSegments.push(seg);
                }

                if (start <= seg.start && seg.start <= end) {
                    endSegments.push(seg);
                }

                if (start + parseFloat(duration) < seg.end) {
                    return;
                }

                if (startSegment) {
                    endSegments.push(seg);
                }
            });

            if (startSegment) {
                const segments = [];
                let text = "";

                segments.push(startSegment);
                text += startSegment.text;

                endSegments.forEach((segment) => {
                    segments.push(segment);
                    text += segment.text;
                });

                transcriptions.push({ start: start, text: text });
            } else {
                transcriptions.push({ start: start, text: "" });
            }
        });

        return transcriptions;
    };



    useEffect(() => {
        console.log(timeStamps.length)
        if (!timeStamps.length > 0) {
            return
        }
        // if (timestampsFile && timeStamps.length <= 0) {
        setSearches([])
        const trans = JSON.parse(selectedData[0].transcription)

        // if (selectedData.length > 0) {
        const allPageText = JSON.parse(selectedData[0].book_text)?.map((page) => page.textInfo).join(' ');
        // console.log(allPageText)

        // const searchPromises = trans?.map(async (searchTerm) => {

        //     return result;
        // });
        const seg = getTransSegs(trans)
        timeStamps.forEach((startingTimestamp, i) => {
            searchPDF(allPageText, seg[i].text)
                .then(resultText => {

                    setSearches(prev => [...prev, { searchTerm: seg[i].text, result: resultText }]);
                    console.log('got values of search')
                })
                .catch(error => {
                    console.error("Error during search:", error);
                });
        });
        // }
        // }
        // }, [ segmentsText]);
    }, [transcription, selectedData, timestampsFile, timeStamps]);
    // }, []);

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
    const handleAudioFileChange = (event) => {
        setAudioFile(event.target.files[0]);
    };
    const audioPlayerRef = useRef(null);
    const [timeStampsType, setTimeStampsType] = useState("end");
    const [audioFile, setAudioFile] = useState(null);
    const [capturedTimeStamps, setCapturedTimeStamps] = useState([]);
    const handleRadioChange = (event) => {
        setTimeStampsType(event.target.id);
    };
    const audioData = useMemo(() => {
        return audioFile != null ? URL.createObjectURL(audioFile) : null;
    }, [audioFile]);
    useEffect(() => {
        setTimeStamps((prev) => [...capturedTimeStamps]);
        setIsCaputed(true);
    }, [capturedTimeStamps]);
    const captureTimestamp = useCallback(() => {
        setCapturedTimeStamps((prev) => [...prev, audioPlayerRef?.current.audioEl.current.currentTime]);
        toast.success(audioPlayerRef.current?.audioEl.current.currentTime + " Added in the timestamps list");
    }, [audioPlayerRef.current?.audioEl.current.currentTime]);
    return (
        <>
            <div className='flex flex-col gap-4 max-w-md mx-auto mt-12'>

                <FileInput acceptedFileTypes=".mp3" label="Upload Audio File" handleFileChange={handleAudioFileChange} />
                <h2 className="text-l font-bold">TimeStamps Type</h2>

                <div>

                    <div className="flex gap-2 items-center">
                        <input
                            type="radio"
                            name="timeStamps_type"
                            id="end"
                            disabled={isCaputed}

                            checked={timeStampsType === 'end'}
                            onChange={handleRadioChange}
                        />
                        <label htmlFor="end" className={isCaputed ? "line-through" : ""}> Duration from the End</label>
                    </div>
                    <div className="flex gap-2 items-center">
                        <input
                            disabled={isCaputed}
                            type="radio"
                            name="timeStamps_type"
                            id="start"

                            checked={timeStampsType === 'start'}
                            onChange={handleRadioChange}
                        />
                        <label htmlFor="start" className={isCaputed ? "line-through" : ""}> Duration from the Start</label>
                    </div>
                </div>
                <AudioPlayer
                    ref={audioPlayerRef}
                    src={audioData}
                    controls={true}
                    listenInterval={100}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    className="sticky top-14 max-w-md z-50"
                    style={{ width: '100%' }}
                    customProgressBarSection={[
                        <div>
                            <span className="custom-time">0:00</span>
                        </div>,
                        <div>
                            <progress className="react-audio-player-progress" value={0} max={100} />
                        </div>,
                        <div>
                            <span className="custom-time">0:00</span>
                        </div>,
                    ]}
                />
                <button type="button" className="bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded" onClick={() => captureTimestamp()}>Capture Timestamp</button>
                <button type="button" className="bg-blue-500 text-white py-2 px-4 rounded w-full max-w-md" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false); setCapturedTimeStamps([]) }}>Clear Data Table</button>

            </div>
            <MappedTimestampInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={data.transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} />
        </>
    )
}

export default Regenerate
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MappedTimestampInput from './MappedTimestampInput';
import kmp_matcher from 'kmp-matcher';
import AudioPlayer from "react-audio-player";
import FileInput from './FileInput';
import { toast } from 'react-toastify';

const Regenerate = ({ selectedData }) => {
    // const [selectedData, setselectedData] = useState([]);
    const [timestampsFile, setTimestampsFile] = useState(null);
    const [timeStampsType, setTimeStampsType] = useState("end");

    const [timeStamps, setTimeStamps] = useState([])
    const [transcription, setTranscription] = useState(selectedData.transcription);
    const [searches, setSearches] = useState([]);
    const [isCaputed, setIsCaputed] = useState(false);
    const [data, setData] = useState([]);
    const audioPlayerRef = useRef(null);
    const [audioFile, setAudioFile] = useState(null);
    const [duration, setDuration] = useState(0);
    const [capturedTimeStamps, setCapturedTimeStamps] = useState([]);

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
        if (duration == 0) {

            toast.info("Audio file isn't selected so cannot find duration accuratly")
        }

        timeStamps.forEach((startingTimestamp) => {
            let start;
            const limit = 50;
            console.log(isCaputed)
            console.log(timeStampsType)
            if (isCaputed == false) {

                if (timeStampsType === "end") {
                    start = Math.abs(timestampToSeconds(startingTimestamp) - parseFloat(duration))
                } else {
                    start = Math.abs(timestampToSeconds(startingTimestamp))
                }

            }
            else {

                start = Math.abs(timestampToSeconds(startingTimestamp))
            }
            const end = start + parseFloat(limit);
            let startSegment = null;
            const endSegments = [];

            transcription?.segments?.forEach((seg) => {
                if (seg.start <= start && start <= seg.end) {
                    startSegment = seg;
                    return
                }
                if (start <= seg.start && seg.start <= end && end <= seg.end) {
                    endSegments.push(seg);
                    return
                }

                if (start <= seg.start && seg.start <= end) {
                    endSegments.push(seg);
                }

                if (start + parseFloat(limit) < seg.end) {
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
        console.log(seg[0])
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
    }, [transcription, selectedData, timestampsFile, timeStamps, timeStampsType, audioFile]);
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
        const audioFile = event.target.files[0];

        const audioElement = document.createElement('audio');
        audioElement.src = URL.createObjectURL(audioFile);

        audioElement.onloadedmetadata = function () {
            setDuration(audioElement.duration);
        };
        // setDuration(event.target.files[0].duration);

    };

    const handleRadioChange = (event) => {
        setTimeStampsType(event.target.id);
    };
    const audioData = useMemo(() => {
        return audioFile != null ? URL.createObjectURL(audioFile) : null;
    }, [audioFile]);
    useEffect(() => {
        setTimeStamps((prev) => [...capturedTimeStamps]);
        if (capturedTimeStamps.length > 0) {
            setIsCaputed(true);
        }
        else {
            setIsCaputed(false);

        }
    }, [capturedTimeStamps]);
    const captureTimestamp = useCallback(() => {
        setCapturedTimeStamps((prev) => [...prev, audioPlayerRef?.current.audioEl.current.currentTime]);
        toast.success(audioPlayerRef.current?.audioEl.current.currentTime + " Added in the timestamps list");
    }, [audioPlayerRef.current?.audioEl.current.currentTime]);
    return (
        <>
            <div className='flex flex-col gap-4 max-w-md mx-auto mt-12'>

                <FileInput acceptedFileTypes=".mp3" label="Upload Audio File" handleFileChange={handleAudioFileChange} />
                <h2 className="text-l font-bold mb-1">TimeStamps Type</h2>

                <div className="flex gap-2 items-center ">
                    <label htmlFor="start" className={`${timeStampsType === 'start' ? 'bg-gray-900 text-white' : 'bg-gray-100'} group flex items-center px-2 py-2 text-base font-medium rounded-md hover:bg-gray-600  hover:text-white text-gray-900 transition border border-black duration-[250ms] ease-in-out mr-2 cursor-pointer ${isCaputed ? 'cursor-not-allowed bg-gray-300 line-through hover:bg-gray-300 hover:text-gray-900' : ''}`}
                        onClick={() => isCaputed ? setTimeStampsType(null) : setTimeStampsType('start')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="ml-1">Duration from Start</span>
                    </label>

                    <label htmlFor="end" className={`${timeStampsType === 'end' ? 'bg-gray-900 text-white' : 'bg-gray-100'} group flex items-center px-2 py-2 text-base font-medium rounded-md border hover:bg-gray-600 hover:text-white text-gray-900 transition  border-black duration-[250ms] ease-in-out cursor-pointer ${isCaputed ? 'cursor-not-allowed bg-gray-300 line-through hover:bg-gray-300 hover:text-gray-900' : ' '}`}
                        onClick={() => isCaputed ? setTimeStampsType(null) : setTimeStampsType('end')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>

                        <span className="ml-1">Duration from End</span>
                    </label>
                </div>
                <AudioPlayer
                    ref={audioPlayerRef}
                    src={audioData}
                    controls={true}
                    listenInterval={100}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    className=""
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
                <button type="button" className="button" onClick={() => captureTimestamp()}>Capture Timestamp</button>
                <button type="button" className="button" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false); setCapturedTimeStamps([]) }}>Clear Data Table</button>

            </div>
            <MappedTimestampInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={data.transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} timeStampsType={timeStampsType} />
        </>
    )
}

export default Regenerate
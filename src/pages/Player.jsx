import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AudioPlayer from "react-audio-player";
import FileInput from "../components/FileInput";
import TimestampsFileInput from "../components/TimestampsFileInput";
import mp3Slice from "mp3-slice";
import audioBufferSlice from 'audiobuffer-slice';
import io from 'socket.io-client';
import kmp_matcher from 'kmp-matcher';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom"
import PDFReader from "../components/PDFReader";
import MemorizedAudioPlayer from "../components/MemorizedAudioPlayer";

function Player() {

    const [audioFile, setAudioFile] = useState(null);
    const [timestampsFile, setTimestampsFile] = useState(null);
    const [ebookFile, setEbookFile] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [transcription, setTranscription] = useState('');
    const [timeStamps, setTimeStamps] = useState([])
    const [offset, setOffset] = useState(0)
    const [duration, setDuration] = useState(50)
    const [timeStampsType, setTimeStampsType] = useState("end");
    const [searches, setSearches] = useState([]);
    const [allDone, setAllDone] = useState(false)
    const [audioDuration, setAudioDuration] = useState(null);
    const [pdfText, setPdfText] = useState('');
    const [socket, setSocket] = useState(null);
    const [currentTimes, setCurrentTimes] = useState([]);
    const [isCaputed, setIsCaputed] = useState(false);
    const [data, setData] = useState([]);
    const [segmentsText, setSegmentsText] = useState([]);
    const [numPages, setNumPages] = useState(null);
    const [newSocket, setNewSocket] = useState(null);
    const [playing, setPlaying] = useState(false)
    const socketURL = "http://127.0.0.1:5111"
    // const socketURL = "http://16.171.42.93:5111"

    let currentTime = 0;
    const [capturedTimeStamps, setCapturedTimeStamps] = useState([]);
    var seekedTime = 0;

    const audioPlayerRef = useRef(null);
    const orignalTextRef = useRef(null);
    const currentTimeRef = useRef(0);
    let battleSize = 5;
    let startPage = 1; 
    let endPage = battleSize;
    let processedSeg = useMemo(() => [], []);
    currentTime = audioPlayerRef && audioPlayerRef?.current?.audioEl.current.currentTime
    const handleTimeUpdate = useCallback((time) => {
        
        if (!segmentsText || segmentsText.length === 0) return;
        for (const obj of segmentsText) {
            const current_time = obj.current_time;
            const relevantSegment = obj?.result?.segments.find(({ start, end }) =>
                currentTime >= (start + current_time) && currentTime <= (end + current_time)
            );
            // console.log(obj?.result?.segments.find(({ start, end }) => {
            //     console.log(currentTime >= (start + current_time) && currentTime <= (end + current_time), " for ", (start + current_time), " ", end)
            //     return currentTime >= (start + current_time) && currentTime <= (end + current_time)
            // }))

            if (relevantSegment) {
                if (processedSeg.some(seg => seg.time.start === relevantSegment.start + current_time && seg.highlighted)) {
                    continue;
                }

                orignalTextRef.current = document.getElementsByClassName("textLayers");
                Array.from(orignalTextRef.current).forEach(element => {
                    const spans = element.querySelectorAll("span.bg-yellow-200");
                    spans.forEach(span => {
                        span.classList.remove("bg-yellow-200");
                    });
                });

                let founded = false;
                for (const p of orignalTextRef.current) {
                    const pageNumber = Array.from(orignalTextRef.current).indexOf(p) + 1;

                    if (pageNumber <= endPage && pageNumber >= startPage) {

                        if (pageNumber > endPage) {
                            founded = false;
                        }


                        p.innerHTML = p.innerHTML.replace(/<span class="bg-yellow-200" id="see"><\/span>(.*?)<\/span>/g, "$1");
                        p.innerHTML = p.innerHTML.replace(`id="see"`, "")
                        const newSpans = highlightSearchTerm(p.innerText, relevantSegment.text);
                        if (newSpans !== p.innerText) {
                            p.innerHTML = newSpans;
                            processedSeg = [{ time: { start: relevantSegment.start + current_time, end: relevantSegment.end + current_time }, highlighted: true, pageNumber: pageNumber }];
                            console.log(processedSeg)
                            founded = true
                            console.log("founded for the this time: ", relevantSegment.text, pageNumber)
                            // break;
                        }

                    }
                    if (pageNumber >= endPage && !founded) {
                        startPage += battleSize;
                        endPage += battleSize;
                    }
                    if (pageNumber === numPages) {
                        startPage = 1;
                        endPage = battleSize;
                    }
                    if (pageNumber > endPage) {
                        break;
                    }
                }
            }
            else {
                // audioFile && toast.info("Still server processing on it, again submit Highlight text request to get the result forcefully");
                // audioPlayerRef.current.audioEl.current.pause();
            }
        }

    }, [segmentsText]);

    const highlightSearchTerm = useCallback((text, searchTerm) => {
        let normalizedSearchTerm = searchTerm.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
        let normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
        if (normalizedSearchTerm === '' || normalizedText == '') return text
        let words = normalizedSearchTerm.trim().split(' ').filter((word) => word != '');
        let matchFound = false;
        let start = [];
        let length = 0;

        let starter = 1;
        while (!matchFound && words.length >= starter) {
            let currentSubset = words.slice(starter - 1).join(' ');
            start = kmp_matcher.kmp(normalizedText, currentSubset);
            if (start.length != 0) {

                console.log(start)
            }
            if (start.length > 0) {
                matchFound = true;
                length = currentSubset.length;
            } else {
                if (words.slice(starter - 1).length > 3) {
                    words.pop();
                } else {
                    starter++;
                    words = normalizedSearchTerm.trim().split(' ').filter((word) => word != '').slice(starter - 1);
                }
            }
        }

        if (matchFound) {
            const matchedString = text.substring(start[0], start[0] + length);
            const highlightedText = text.substring(0, start[0]) + `<span class="bg-yellow-200" id = "see">${matchedString}</span>` + text.substring(start[0] + length);
            return highlightedText;
        } else {
            return text; // Return original text if no match found
        }
    }, []);

    const captureTimestamp = useCallback(() => {
        setCapturedTimeStamps((prev) => [...prev, audioPlayerRef.current.audioEl.current.currentTime]);
        toast.success(currentTime + " Added in the timestamps list");
    }, [currentTime]);

    useEffect(() => {
        setTimeStamps((prev) => [...capturedTimeStamps]);
        setIsCaputed(true);
    }, [capturedTimeStamps]);

    const handleSeeked = useCallback((time) => {

    }, []);
    const handlePlaying = useCallback((time) => {
        setPlaying(true)
    }, []);
    const handlePause = useCallback((time) => {
        setPlaying(false)
    }, []);

    const scropScrolling = useCallback(async () => {
        const res = await fetch(socketURL + "/stop-scroll", {
            method: "POST"    
        })
        const result = await res.json()
        console.log(result)
        if (result.message == 'Scroll process stopped'){
            toast.success('process stoped')
        }
        else{
            toast.error('Internal server error')

        }
    })
    const scrollToText = useCallback(async () => {

        const formData = new FormData();
        formData.append('file', audioFile);

        const checkFileFormData = new FormData();
        checkFileFormData.append('fileName', audioFile.name);

        const checkFileRes = await toast.promise(
            fetch(socketURL + "/is-audio-exists",
                {
                    method: "POST",
                    body: checkFileFormData
                }
            ),
            {
                pending: 'Checking if audio file exists...',
                success: 'Checking successful!',
                error: 'Checking failed!'
            }
        );
        const response = await checkFileRes.json()
        if (response.exists) {
            toast.info("Audio file already exists, let's start transcription...")

            audioPlayerRef.current.audioEl.current.pause();
            newSocket.emit('scroll-to-text', {
                current_time: audioPlayerRef.current.audioEl.current.currentTime,
                audio_duration: audioDuration,
                file_name: audioFile.name
            });
            toast.success(`Processing... We'll play audio once get response from server`);
        }
        else {
            toast.info("Audio file isn't exist, uploading...")
            const uploadingToast = await toast.promise(
                fetch(socketURL + "/store-audio", {
                    method: "POST",
                    body: formData
                })
                ,
                {
                    pending: 'Uploading...',
                    success: 'processing completed!',
                    error: 'Upload failed!'
                }

            )
            const res = uploadingToast.json();
            console.log(uploadingToast)
            if (res.status === 200) {
                toast.success("Audio file uploaded successfully")

                audioPlayerRef.current.audioEl.current.pause();
                newSocket.emit('scroll-to-text', {
                    current_time: currentTime,
                    audio_duration: audioDuration,
                    file_name: audioFile.name
                });
                toast.success(`Processing... We'll play audio once get response from server`);
            }
            else {
                toast.error("Failed to upload audio file")
            }
        }
    }, [currentTime, audioDuration, audioFile]);

    const audioData = useMemo(() => {
        setSegmentsText([])
        return audioFile != null ? URL.createObjectURL(audioFile) : null;
    }, [audioFile]);

    useEffect(() => {
        setNewSocket(io(socketURL));
    }, [])
    useEffect(() => {
        if (newSocket) {
            newSocket.on('connect', () => {
                toast.success('Connected to server');
            });
            newSocket.on('connect_error', () => {
                toast.error('Error connecting to server, retrying in 3 seconds...');
            });
            newSocket.on('disconnect', () => {
                toast.warning('Disconnected from server');
            });

            const handleTranscriptionUpdate = (data) => {
                const updatedTranscription = data.transcription;
                setTranscription((prev) => [...prev, updatedTranscription]);
            };

            newSocket.on('transcription_update', handleTranscriptionUpdate);

            newSocket.on('scroll_update', (data) => {
                const { current_time, result } = data;
                setSegmentsText(prevState => {


                    const existingIndex = prevState.findIndex(prev => prev.current_time === current_time);
                    if (existingIndex === -1) {
                        if (prevState.length == 0) {
                            audioPlayerRef.current.audioEl.current.play();
                            toast.success('Got response from server, playing audio...');

                        }
                        return [...prevState, { current_time, ...result }];
                    } else {
                        return prevState.map((item, index) =>
                            index === existingIndex ? { ...item, ...result } : item
                        );
                    }
                });

            });

            // Cleanup when the component is unmounted
            return () => {
                newSocket.off('message', handleTranscriptionUpdate);
                newSocket.off('transcription_update', handleTranscriptionUpdate);
            };
        }

    }, [newSocket])
    useEffect(() => {
        const uniqueSegments = segmentsText.reduce((acc, current) => {
            const x = acc.find(item => item.current_time === current.current_time);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, []);
        console.log(uniqueSegments);
    }, [segmentsText])

    useEffect(() => {
        if (audioFile) {
            const audio = new Audio(URL.createObjectURL(audioFile));

            audio.addEventListener('loadedmetadata', () => {
                const durationInSeconds = audio.duration;
                setAudioDuration(durationInSeconds);

            });

            // Load the audio file to trigger the 'loadedmetadata' event
            audio.src = URL.createObjectURL(audioFile);

            // Cleanup event listener on component unmount
            return () => {
                audio.removeEventListener('loadedmetadata', () => { });
            };
        }
    }, [audioFile]);

    useEffect(() => {
        if (allDone && pdfText.length > 0) {
            const allPageText = pdfText?.map((page) => page.text).join(' ');
            if (transcription.length > 0) {
                const searchPromises = transcription?.map(async (searchTerm) => {
                    const result = await searchPDF(allPageText, searchTerm.text);
                    return result;
                });

                Promise.all(searchPromises)
                    .then(results => {
                        setSearches(results);
                    })
                    .catch(error => {
                        console.error("Error during search:", error);
                    });
            }
        }
    }, [transcription, allDone, pdfText]);

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

    const handleAudioFileChange = (event) => {
        setAudioFile(event.target.files[0]);
    };
    const scrollToHighlight = () => {
        const element = document.getElementById('see');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };


    const handleEbookFileChange = async (event) => {
        setEbookFile(URL.createObjectURL(event.target.files[0]));
    };

    const handleTimestampsFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const binaryStr = event.target.result;
                setTimestampsFile(binaryStr);
            };
            reader.readAsBinaryString(file);
        }
    };
    const handleRadioChange = (event) => {
        setTimeStampsType(event.target.id);
    };

    const transcribe = useCallback(async () => {
        if (audioFile) {
            if (timeStamps.length === 0) {
                toast.error("Please add time stamps")
                return
            }
            const formData = new FormData();

            formData.append('fileName', audioFile.name);
            formData.append('timeStamps', timeStamps);
            formData.append('audioDuration', audioDuration);
            formData.append('offset', offset);
            formData.append('duration', duration);
            formData.append('timeStampsType', timeStampsType);
            formData.append('capturedTime', isCaputed);

            const checkFileFormData = new FormData();
            checkFileFormData.append('fileName', audioFile.name);

            try {
                const checkFileRes = await toast.promise(
                    fetch(socketURL + "/is-audio-exists",
                        {
                            method: "POST",
                            body: checkFileFormData
                        }
                    ),
                    {
                        pending: 'Checking if audio file exists...',
                        success: 'Checking successful!',
                        error: 'Checking failed!'
                    }
                );
                const response = await checkFileRes.json()
                if (response.exists) {
                    toast.info("Audio file already exists, let's start transcription...")
                }
                else {
                    toast.info("Audio file isn't exist, uploading...")
                    formData.append('file', audioFile);

                }
                try {
                    const result = await toast.promise(
                        fetch(socketURL + "/upload",
                            {
                                method: "POST",
                                body: formData
                            }
                        ),
                        {
                            pending: 'Processing Transcription...',
                            success: 'Processing Completed!',
                            error: 'Processing Failed!'
                        }
                    );


                    if (result.ok) {
                        toast.success('Transcription successful!');
                    } else {
                        toast.error('Transcription failed!');
                    }
                } catch (error) {
                    toast.error('Error during transcription:', error);
                }

            } catch (error) {
                toast.error("Error while checking if audio exists " + error)
            }
        }
        else {
            toast.error("Please select an audio file first")
        }


    }, [audioFile, timeStamps, audioDuration, offset, duration, timeStampsType, isCaputed, socketURL]);

    const playAllChunks = () => {
        const audioElements = chunks.map((chunk, index) => (
            <audio key={index} controls>
                <source src={URL.createObjectURL(chunk)} type="audio/mp3" />
            </audio>
        ));

        return (
            <div>
                {audioElements}
            </div>
        );
    };
    return (
        <>
            <ToastContainer />
            <Link to="/" className="text-white   bg-blue-500 px-4 py-2  "> Go to Home</Link>
            <div className="flex flex-col items-center justify-center gap-6 w-full mx-auto mt-10">
                <h1 className="text-3xl font-bold">Audio to Text</h1>

                <form className="flex flex-col gap-6 w-full max-w-md h-fit" style={{ position: 'relative' }}>

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

                    <div className="flex flex-col gap-6 w-full">
                        <div className="flex w-full justify-between items-center">
                            <label className="text-sm">Offset from timestamps (sec)</label>
                            <input type="number" value={offset} onChange={(e) => setOffset(e.target.value)} className="p-2 rounded border border-gray-300 outline-none appearance-none" placeholder="Offset from timestamps" />
                        </div>

                        <div className="flex w-full justify-between items-center">
                            <label className="text-sm">Duration of each TimeStamps (sec)</label>
                            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="p-2 rounded border border-gray-300 outline-none appearance-none" placeholder="Duration" />
                        </div>
                    </div>

                    <FileInput acceptedFileTypes=".pdf" label="Upload ebook File" handleFileChange={handleEbookFileChange} />


                </form>
                <button type="button" onClick={() => scrollToHighlight()} className="bg-blue-500 text-white py-2 px-4 rounded sticky top-3 max-w-md w-full">Scroll to highlight</button>

                <AudioPlayer
                    ref={audioPlayerRef}
                    src={audioData}
                    controls={true}
                    listenInterval={100}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    onListen={handleTimeUpdate}
                    onSeeked={handleSeeked}
                    onPlay={handlePlaying}
                    onPause={handlePause}
                    className="sticky top-14 max-w-md"
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
                <div className="max-w-md flex flex-col  gap-3 w-full">

                    <button type="button"  onClick={() => scrollToText()} className="bg-blue-500 text-white py-2 px-4 rounded w-full disabled:bg-blue-300 disabled:cursor-not-allowed">Start scrolling process</button>
                    <button type="button"  onClick={() => scropScrolling()} className="bg-blue-500 text-white py-2 px-4 rounded w-full disabled:bg-blue-300 disabled:cursor-not-allowed">Stop server for scrolling process</button>
                    <button type="button" className="bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded" onClick={() => captureTimestamp()}>Capture Timestamp</button>
                    <button type="button" className="bg-blue-500 text-white py-2 px-4 rounded w-full" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false) }}>Clear Data Table</button>
                </div>
                <PDFReader ebookFile={ebookFile} setSearches={setSearches} searches={searches} transcription={transcription} allDone={allDone} setAllDone={setAllDone} pdfText={pdfText} setPdfText={setPdfText} segmentsText={segmentsText} setNumPages={setNumPages} numPages={numPages} />

                <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} isCaputed={isCaputed} />
            </div>
        </>
    );
}

export default Player;

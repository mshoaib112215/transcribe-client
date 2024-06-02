import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AudioPlayer from "react-audio-player";
import mp3Slice from "mp3-slice";
import audioBufferSlice from 'audiobuffer-slice';
import io from 'socket.io-client';
import kmp_matcher from 'kmp-matcher';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom"
import FileInput from "../../components/FileInput";
import TimestampsFileInput from "../../components/TimestampsFileInput";
import PDFReader from "../../components/PDFReader";

function AdminPlayer({ user }) {
    
    const [audioFile, setAudioFile] = useState(null);
    const [timestampsFile, setTimestampsFile] = useState(null);
    const [ebookFile, setEbookFile] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [transcription, setTranscription] = useState('');
    const [timeStamps, setTimeStamps] = useState([])
    const [offset, setOffset] = useState(0)
    const [duration, setDuration] = useState(50)
    const [timeStampsType, setTimeStampsType] = useState(null);
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
    const [bookName, setBookName] = useState();


    const socketURL = "http://13.49.185.239:5111"
    // const socketURL = "http://127.0.0.1:5111"
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
        toast.success(audioPlayerRef.current.audioEl.current.currentTime + " Added in the timestamps list");
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

    const stopScrolling = useCallback(async () => {
        const res = await fetch(socketURL + "/stop-scroll", {
            method: "POST"
        })
        const result = await res.json()
        console.log(result)
        if (result.message == 'Scroll process stopped') {
            toast.success('process stoped')
        }
        else {
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
                // toast.success('Connected to server');
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
            const allPageText = pdfText?.map((page) => page.textInfo).join(' ');
            if (transcription.length > 0) {
                const searchPromises = transcription?.map(async (searchTerm) => {
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
        setBookName(event.target.files[0].name)
        console.log(event.target.files[0].name)

    };

    useEffect(() => {
        console.log(bookName)
    }, [bookName])
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
    const handleRadioChange = (event) => {
        setTimeStampsType(event.target.id);
    };

    const transcribe = useCallback(async () => {

        if (audioFile) {

            if (bookName == null) {
                console.log(bookName)
                toast.error("Cannot get Book name")
                return
            }
            if (timeStamps.length === 0) {
                toast.success("Your Files sending for Entire Mapping Process!")

            }
            if (!isCaputed && timeStampsType == null) {
                toast.error("Please select timestamps type")
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
            formData.append('userId', user.id);
            formData.append('pdfText', JSON.stringify(pdfText || []));
            formData.append('bookName', bookName);
            if (JSON.stringify(pdfText || []) == []) {
                toast.error("Please upload a pdf file")
                return
            }

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
                            pending: 'Adding in Queue...',
                            success: 'Processing Completed!',
                            error: 'Processing Failed!'
                        }
                    );


                    if (result.ok) {
                        toast.success('Process added in Queue successful!');
                    } else {
                        toast.error('Process added in Queue failed!');
                    }
                } catch (error) {
                    toast.error('Error during queuing:', error);
                }

            } catch (error) {
                toast.error("Error while checking if audio exists " + error)
            }
        }
        else {
            toast.error("Please select an audio file first")
        }


    }, [audioFile, timeStamps, audioDuration, offset, duration, timeStampsType, isCaputed, socketURL, bookName, pdfText]);

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
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);


    useEffect(() => {
        const container = containerRef.current;

        const handleWheelScroll = (event) => {
            // Adjust the scrollLeft property of the container based on the wheel delta
            container.scrollLeft += event.deltaY;
            // Prevent the default vertical scrolling behavior
            event.preventDefault();
        };

        // Add wheel event listener to the container
        container.addEventListener('wheel', handleWheelScroll, { passive: false });

        // Cleanup function to remove the event listener
        return () => {
            container.removeEventListener('wheel', handleWheelScroll);
        };
    }, []);
    return (
        <>

            <div className="flex flex-col items-start justify-center gap-6 w-full mx-auto mt-10">


                <h1 className="text-3xl font-bold">Admin Player</h1>
                <div className="flex gap-3 w-full flex-wrap">

                    <FileInput acceptedFileTypes=".mp3" label="Upload Audio File" handleFileChange={handleAudioFileChange} />
                    <FileInput acceptedFileTypes=".pdf" label="Upload ebook File" handleFileChange={handleEbookFileChange} />
                    <FileInput
                        label="Upload Timestamps File"
                        handleFileChange={handleTimestampsFileChange}
                        acceptedFileTypes=".xlsx, .xls"
                        ref={fileInputRef}
                    />
                </div>

                <form className="flex flex-col gap-6 w-full max-w-md h-fit mx-auto" style={{ position: 'relative' }}>

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
                    <div className="flex flex-col gap-6 w-full mt-6 border-t border-gray-300">
                        <div className="flex items-center justify-between p-4 border-b border-gray-300">
                            <label className="text-sm font-medium text-gray-800">Offset from timestamps (sec)</label>
                            <input type="number" value={offset} onChange={(e) => setOffset(e.target.value)} className="w-24 px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600" />
                        </div>

                        <div className="flex items-center justify-between p-4 border-b border-gray-300">
                            <label className="text-sm font-medium text-gray-800">Duration of each TimeStamps (sec)</label>
                            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-24 px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-1 focus:ring-blue-600 focus:border-blue-600" />
                        </div>
                    </div>



                </form>



                <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} />
                <PDFReader ebookFile={ebookFile} setSearches={setSearches} searches={searches} transcription={transcription} allDone={allDone} setAllDone={setAllDone} pdfText={pdfText} setPdfText={setPdfText} segmentsText={segmentsText} setNumPages={setNumPages} numPages={numPages} />

            </div>
            <div
                ref={containerRef}
                className="flex flex-col whitespace-nowrap sticky bottom-0 rounded-2xl bg-white h-fit p-3 right-0 gap-3 w-full overflow-auto custom-shadow hidden-scroll"
                style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}
            >

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
                    className=" max-w-md z-50 sticky left-1/2 transform -translate-x-1/2"
                    style={{ width: '100%', background: "white" }}
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
                <div className="flex flex-row gap-3 w-fit">

                    <button type="button" className="button" onClick={() => captureTimestamp()}>
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="ml-2">Capture Timestamp</span>
                        </span>
                    </button>
                    <button type="button" disabled={!allDone} className="button" onClick={() => { transcribe() }}>
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="ml-2">Start Transcription</span>
                        </span>
                    </button>
                    <button type="button" onClick={() => scrollToText()} className="button">
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="ml-2">Start scrolling process</span>
                        </span>
                    </button>
                    <button type="button" onClick={() => scrollToHighlight()} className="button">
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="ml-2">Scroll to highlighted Text</span>
                        </span>
                    </button>
                    <button type="button" onClick={() => stopScrolling()} className="button">
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="ml-2">Stop server for scrolling process</span>
                        </span>
                    </button>
                    <button type="button" className="button" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false); setCapturedTimeStamps([]); }}>
                        <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="ml-2">Clear Data Table</span>
                        </span>
                    </button>
                </div>

            </div>
        </>
    );
}

export default AdminPlayer;
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    const [playing, setPlaying] = useState(0);
    const [numPages, setNumPages] = useState(null);


    const socketURL = "http://127.0.0.1:5111"
    // const socketURL = "http://13.51.205.166:5111"


    const capture = document.getElementById('capture')


    const capturedTimestamps = document.getElementById('capturedTimestamps')
    // capture && (capture.disabled = true) && (capturedTimestamps.innerHTML = "Nothing Captured");

    // var currentTime = 0;
    // const [currentTime, setCurrentTime] = useState(0);
    let currentTime = 0;
    const [capturedTimeStamps, setCapturedTimeStamps] = useState([]);
    const [counter, setCounter] = useState(1)
    var seekedTime = 0;

    // var capturedTimeStamps = [];
    const [orignalText, setOrignalText] = useState(null);

    const audioPlayerRef = useRef(null);
    const orignalTextRef = useRef(null);
    const currentTimeRef = useRef(0);

    const handleTimeUpdate = (time) => {
        currentTime = time;
        setPlaying(prev => prev + 1);

        if (!segmentsText || segmentsText.length === 0) return;

        for (const obj of segmentsText) {
            const current_time = obj.current_time;
            const relevantSegment = obj?.result?.segments.find(({ start, end }) =>
                currentTime >= (start + current_time) && currentTime <= (end + current_time)
            );

            if (relevantSegment) {
                orignalTextRef.current = document.getElementsByClassName("textLayer");
                setOrignalText(orignalTextRef.current);

                if (orignalTextRef.current) {
                    for (const s of orignalTextRef.current) {
                        const ss = s.querySelectorAll("span[role='presentation']");
                        // Array.from(ss).forEach((sss) => {
                        let foundHighlight = false;
                        // continue
                        Array.from(ss).forEach((sss) => {
                            // Remove all existing highlights before adding new ones
                            console.log(sss)
                            sss.innerHTML = sss.innerHTML.replace(/<span class="bg-yellow-200">(.*?)<\/span>/g, "$1");
                            // console.log(sss.innerText)
                            const newSpans = highlightSearchTerm(sss.innerText, relevantSegment.text);
                            if (newSpans !== sss.innerText) {
                                sss.innerHTML = newSpans;
                                foundHighlight = true;
                                // break; // Exit after first highlight to optimize
                                return
                            }
                        })

                        // if (foundHighlight) break; // Added to stop the loop when a highlight is found


                    }

                }


            }
            // break; // Exit loop after processing the first relevant segment to optimize
        }
    }

    function highlightSearchTerm(text, searchTerm) {
        // Normalize both search term and text for consistent matching
        let normalizedSearchTerm = searchTerm.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
        let normalizedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ");
        console.log(normalizedSearchTerm)
        console.log(normalizedText)
        if (normalizedSearchTerm === '' || normalizedText == '') return text
        // Split the search term into words for individual matching
        let words = normalizedSearchTerm.trim().split(' ').filter((word) => word != '');
        let matchFound = false;
        let start = [];
        let length = 0;

        // Attempt to find a match for the search term within the text
        let starter = 1;
        while (!matchFound && words.length >= starter) {
            // Attempt to match using current subset of words
            let currentSubset = words.slice(starter - 1).join(' ');
            start = kmp_matcher.kmp(normalizedText, currentSubset);
            if (start.length > 0) {
                matchFound = true;
                length = currentSubset.length;
            } else {
                // If not found, try removing the last word and try again
                if (words.slice(starter - 1).length > 3) {
                    words.pop();
                } else {
                    // If only one word left, move the starter index forward and reset words array
                    starter++;
                    words = normalizedSearchTerm.trim().split(' ').filter((word) => word != '').slice(starter - 1);
                }
            }
        }

        // If a match is found, highlight the matching text
        if (matchFound) {
            const matchedString = text.substring(start[0], start[0] + length);
            const highlightedText = text.substring(0, start[0]) + `<span class="bg-yellow-200">${matchedString}</span>` + text.substring(start[0] + length);
            return highlightedText;
        } else {
            return text; // Return original text if no match found
        }
    }
    const handleSeeked = (time) => {
        console.log(currentTimeRef.current)
        seekedTime = time;
        console.log(time)
        // setCurrentTimes((prev) => [...prev, time])
    };
    const captureTimestamp = () => {
        setCapturedTimeStamps((prev) => [...prev, currentTime]);
        toast.success(currentTime + " Added in the timestamps list")
    }
    useEffect(() => {
        setTimeStamps((prev) => [...capturedTimeStamps]);
        setIsCaputed(true)
    }, [capturedTimeStamps])

    const handlePlaying = () => {
        capture.disabled = false
        setPlaying(prev => prev++)
    }
    const handlePause = () => {
        capture.disabled = true

        setPlaying(0)
    }
    const timeFormator = (time) => {
        try {

            return new Date(time * 1000).toISOString().substr(11, 8);
        }
        catch (er) {
            toast.error("Error will converting time " + er + time)
        }
    }
    const [newSocket, setNewSocket] = useState(null)
    useEffect(() => {// Establish socket connection
        setNewSocket(io(socketURL, { reconnection: true }))
    }, []);
    const audioData = useMemo(() => {
        return audioFile != null ? URL.createObjectURL(audioFile) : null;
    }, [audioFile]);
    useEffect(() => {
        // Event listener for 'connect' event
        if (newSocket) {

            newSocket.on('connect', () => {
                toast.success('Connected to server');
            });
            // Event listener for 'connect_error' event
            newSocket.on('connect_error', () => {
                toast.error('Error connecting to server, retrying in 3 seconds...');
            });

            // Event listener for 'disconnect' event
            newSocket.on('disconnect', () => {
                toast.warning('Disconnected from server');
            });

            // Event listener for 'message' event
            const handleMessage = (data) => {
                // setTranscription((prev) => [...prev, updatedTranscription]);
            };

            newSocket.on('message', handleMessage);

            // Event listener for 'transcription_update' event
            const handleTranscriptionUpdate = (data) => {
                const updatedTranscription = data.transcription;
                console.log(data)
                setTranscription((prev) => [...prev, updatedTranscription]);
            };

            newSocket.on('transcription_update', handleTranscriptionUpdate);

            newSocket.on('scroll_update', (data) => {
                const { current_time, result } = data;

                setSegmentsText(prevState => {
                    const isNew = !prevState.some(prev => prev.current_time === current_time);
                    if (isNew) {
                        return [...prevState, result]

                    }
                    else {
                        return prevState
                    }
                });

            });

            // Cleanup when the component is unmounted
            return () => {
                // newSocket.disconnect();
                newSocket.off('message', handleTranscriptionUpdate);
                newSocket.off('transcription_update', handleTranscriptionUpdate);
            };
        }

    }, [newSocket])
    useEffect(() => {
        console.log(segmentsText)
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
                // Map each transcription to a search promise
                const searchPromises = transcription?.map(async (searchTerm) => {
                    console.log("searching....");
                    const result = await searchPDF(allPageText, searchTerm.text);
                    return result;
                });

                // Use Promise.all to wait for all search promises to resolve
                Promise.all(searchPromises)
                    .then(results => {
                        setSearches(results); // Update searches with all results
                    })
                    .catch(error => {
                        console.error("Error during search:", error);
                    });
            }
        }
    }, [transcription, allDone, pdfText]);

    const scrollToText = async () => {
        let time = currentTime
        setCounter(1)
        setSegmentsText([

            // setSegmentsText([
            {
                "result": {
                    "text": " Chapter 1 Ancestry, Birth, Boyhood My family is American and has been for generations in all its branches, direct and collateral. Matthew Grant, the founder of the branch in America, of which I am a descendant, reached Dorchester, Massachusetts in May 1630. In 1635 he moved to what is now Windsor, Connecticut, and was the surveyor for that colony for more than 40 years.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 7.04,
                            "text": " Chapter 1 Ancestry, Birth, Boyhood",
                            "tokens": [
                                50364,
                                18874,
                                502,
                                1107,
                                66,
                                47433,
                                11,
                                24299,
                                11,
                                9486,
                                3809,
                                50716
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.2599179257628738,
                            "compression_ratio": 1.5,
                            "no_speech_prob": 0.09073512256145477
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 7.04,
                            "end": 13.22,
                            "text": " My family is American and has been for generations in all its branches, direct and collateral.",
                            "tokens": [
                                50716,
                                1222,
                                1605,
                                307,
                                2665,
                                293,
                                575,
                                668,
                                337,
                                10593,
                                294,
                                439,
                                1080,
                                14770,
                                11,
                                2047,
                                293,
                                41875,
                                13,
                                51025
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.2599179257628738,
                            "compression_ratio": 1.5,
                            "no_speech_prob": 0.09073512256145477
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 13.22,
                            "end": 18.240000000000002,
                            "text": " Matthew Grant, the founder of the branch in America, of which I am a descendant, reached",
                            "tokens": [
                                51025,
                                12434,
                                17529,
                                11,
                                264,
                                14917,
                                295,
                                264,
                                9819,
                                294,
                                3374,
                                11,
                                295,
                                597,
                                286,
                                669,
                                257,
                                16333,
                                394,
                                11,
                                6488,
                                51276
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.2599179257628738,
                            "compression_ratio": 1.5,
                            "no_speech_prob": 0.09073512256145477
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.240000000000002,
                            "end": 22.98,
                            "text": " Dorchester, Massachusetts in May 1630.",
                            "tokens": [
                                51276,
                                13643,
                                17022,
                                11,
                                19979,
                                294,
                                1891,
                                3165,
                                3446,
                                13,
                                51513
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.2599179257628738,
                            "compression_ratio": 1.5,
                            "no_speech_prob": 0.09073512256145477
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 22.98,
                            "end": 28.98,
                            "text": " In 1635 he moved to what is now Windsor, Connecticut, and was the surveyor for that colony for more",
                            "tokens": [
                                51513,
                                682,
                                3165,
                                8794,
                                415,
                                4259,
                                281,
                                437,
                                307,
                                586,
                                43082,
                                284,
                                11,
                                29433,
                                11,
                                293,
                                390,
                                264,
                                11463,
                                2454,
                                337,
                                300,
                                23028,
                                337,
                                544,
                                51813
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.2599179257628738,
                            "compression_ratio": 1.5,
                            "no_speech_prob": 0.09073512256145477
                        },
                        {
                            "id": 5,
                            "seek": 2898,
                            "start": 28.98,
                            "end": 29.98,
                            "text": " than 40 years.",
                            "tokens": [
                                50364,
                                813,
                                3356,
                                924,
                                13,
                                50414
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.49871574129377094,
                            "compression_ratio": 0.6363636363636364,
                            "no_speech_prob": 0.1735864281654358
                        }
                    ],
                    "language": "en"
                },
                "current_time": 0
            },
            {
                "result": {
                    "text": " He was also, for many years of the time, town clerk. He was a married man when he arrived at Dorchester, but his children were all born in this country. His elder son Samuel took lands on the east side of the Connecticut River, opposite Windsor, which have been held and occupied by descendants of his to this day. I am of the 8th generation from Matthew Grant and 7th from Samuel. Matthew Grant's first wife.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 7.88,
                            "text": " He was also, for many years of the time, town clerk. He was a married man when he arrived",
                            "tokens": [
                                50364,
                                634,
                                390,
                                611,
                                11,
                                337,
                                867,
                                924,
                                295,
                                264,
                                565,
                                11,
                                3954,
                                31402,
                                13,
                                634,
                                390,
                                257,
                                5259,
                                587,
                                562,
                                415,
                                6678,
                                50758
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17065083611871779,
                            "compression_ratio": 1.5551020408163265,
                            "no_speech_prob": 0.1412522941827774
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 7.88,
                            "end": 14,
                            "text": " at Dorchester, but his children were all born in this country. His elder son Samuel took",
                            "tokens": [
                                50758,
                                412,
                                13643,
                                17022,
                                11,
                                457,
                                702,
                                2227,
                                645,
                                439,
                                4232,
                                294,
                                341,
                                1941,
                                13,
                                2812,
                                12995,
                                1872,
                                23036,
                                1890,
                                51064
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17065083611871779,
                            "compression_ratio": 1.5551020408163265,
                            "no_speech_prob": 0.1412522941827774
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 14,
                            "end": 18.96,
                            "text": " lands on the east side of the Connecticut River, opposite Windsor, which have been held",
                            "tokens": [
                                51064,
                                5949,
                                322,
                                264,
                                10648,
                                1252,
                                295,
                                264,
                                29433,
                                8640,
                                11,
                                6182,
                                43082,
                                284,
                                11,
                                597,
                                362,
                                668,
                                5167,
                                51312
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17065083611871779,
                            "compression_ratio": 1.5551020408163265,
                            "no_speech_prob": 0.1412522941827774
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.96,
                            "end": 23,
                            "text": " and occupied by descendants of his to this day.",
                            "tokens": [
                                51312,
                                293,
                                19629,
                                538,
                                31693,
                                295,
                                702,
                                281,
                                341,
                                786,
                                13,
                                51514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17065083611871779,
                            "compression_ratio": 1.5551020408163265,
                            "no_speech_prob": 0.1412522941827774
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 23,
                            "end": 28.92,
                            "text": " I am of the 8th generation from Matthew Grant and 7th from Samuel.",
                            "tokens": [
                                51514,
                                286,
                                669,
                                295,
                                264,
                                1649,
                                392,
                                5125,
                                490,
                                12434,
                                17529,
                                293,
                                1614,
                                392,
                                490,
                                23036,
                                13,
                                51810
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17065083611871779,
                            "compression_ratio": 1.5551020408163265,
                            "no_speech_prob": 0.1412522941827774
                        },
                        {
                            "id": 5,
                            "seek": 2892,
                            "start": 28.92,
                            "end": 30.92,
                            "text": " Matthew Grant's first wife.",
                            "tokens": [
                                50364,
                                12434,
                                17529,
                                311,
                                700,
                                3836,
                                13,
                                50464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.4405064847734239,
                            "compression_ratio": 0.7714285714285715,
                            "no_speech_prob": 0.47809043526649475
                        }
                    ],
                    "language": "en"
                },
                "current_time": 30
            },
            {
                "result": {
                    "text": " died a few years after their settlement in Windsor, and he soon after married the widow Rockwell, who with her first husband had been fellow passengers with him and his first wife on the ship Mary and John from Dorchester, England in 1630. Mrs. Rockwell had several children by her first marriage and others by her second. By intermarriage, two or three generations later, I am descended from both the wives of Matthew Grant. In the fifth descent",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 4.96,
                            "text": " died a few years after their settlement in Windsor, and he soon after married the widow",
                            "tokens": [
                                50364,
                                4539,
                                257,
                                1326,
                                924,
                                934,
                                641,
                                18130,
                                294,
                                43082,
                                284,
                                11,
                                293,
                                415,
                                2321,
                                934,
                                5259,
                                264,
                                37207,
                                50612
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.10575585954644706,
                            "compression_ratio": 1.5897435897435896,
                            "no_speech_prob": 0.014185121282935143
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 4.96,
                            "end": 10.24,
                            "text": " Rockwell, who with her first husband had been fellow passengers with him and his first wife",
                            "tokens": [
                                50612,
                                6922,
                                6326,
                                11,
                                567,
                                365,
                                720,
                                700,
                                5213,
                                632,
                                668,
                                7177,
                                18436,
                                365,
                                796,
                                293,
                                702,
                                700,
                                3836,
                                50876
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.10575585954644706,
                            "compression_ratio": 1.5897435897435896,
                            "no_speech_prob": 0.014185121282935143
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 10.24,
                            "end": 17.52,
                            "text": " on the ship Mary and John from Dorchester, England in 1630. Mrs. Rockwell had several children",
                            "tokens": [
                                50876,
                                322,
                                264,
                                5374,
                                6059,
                                293,
                                2619,
                                490,
                                13643,
                                17022,
                                11,
                                8196,
                                294,
                                3165,
                                3446,
                                13,
                                9814,
                                13,
                                6922,
                                6326,
                                632,
                                2940,
                                2227,
                                51240
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.10575585954644706,
                            "compression_ratio": 1.5897435897435896,
                            "no_speech_prob": 0.014185121282935143
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 17.52,
                            "end": 25.36,
                            "text": " by her first marriage and others by her second. By intermarriage, two or three generations later,",
                            "tokens": [
                                51240,
                                538,
                                720,
                                700,
                                7194,
                                293,
                                2357,
                                538,
                                720,
                                1150,
                                13,
                                3146,
                                728,
                                6209,
                                6200,
                                11,
                                732,
                                420,
                                1045,
                                10593,
                                1780,
                                11,
                                51632
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.10575585954644706,
                            "compression_ratio": 1.5897435897435896,
                            "no_speech_prob": 0.014185121282935143
                        },
                        {
                            "id": 4,
                            "seek": 2536,
                            "start": 25.36,
                            "end": 32.32,
                            "text": " I am descended from both the wives of Matthew Grant. In the fifth descent",
                            "tokens": [
                                50364,
                                286,
                                669,
                                41311,
                                490,
                                1293,
                                264,
                                24936,
                                295,
                                12434,
                                17529,
                                13,
                                682,
                                264,
                                9266,
                                23475,
                                50712
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.428627888361613,
                            "compression_ratio": 1.028169014084507,
                            "no_speech_prob": 0.056593358516693115
                        }
                    ],
                    "language": "en"
                },
                "current_time": 60
            },
            {
                "result": {
                    "text": " Standing generation, my great-grandfather, Noah Grant and his younger brother Solomon, held commissions in the English Army in 1756, in the war against the French and Indians. Both were killed that year. My grandfather, also named Noah, was then but nine years old. At the breaking out of the war of the revolution, after the battles of Concord and Lexington, he went with a Connecticut company to join the continent.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.8,
                            "text": " Standing generation, my great-grandfather, Noah Grant and his younger brother Solomon,",
                            "tokens": [
                                50364,
                                33655,
                                5125,
                                11,
                                452,
                                869,
                                12,
                                32902,
                                11541,
                                11,
                                20895,
                                17529,
                                293,
                                702,
                                7037,
                                3708,
                                32209,
                                11,
                                50654
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24441534749577554,
                            "compression_ratio": 1.5341880341880343,
                            "no_speech_prob": 0.029639584943652153
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.8,
                            "end": 13.4,
                            "text": " held commissions in the English Army in 1756, in the war against the French and Indians.",
                            "tokens": [
                                50654,
                                5167,
                                38912,
                                294,
                                264,
                                3669,
                                9583,
                                294,
                                3282,
                                18317,
                                11,
                                294,
                                264,
                                1516,
                                1970,
                                264,
                                5522,
                                293,
                                23838,
                                13,
                                51034
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24441534749577554,
                            "compression_ratio": 1.5341880341880343,
                            "no_speech_prob": 0.029639584943652153
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 13.4,
                            "end": 15.68,
                            "text": " Both were killed that year.",
                            "tokens": [
                                51034,
                                6767,
                                645,
                                4652,
                                300,
                                1064,
                                13,
                                51148
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24441534749577554,
                            "compression_ratio": 1.5341880341880343,
                            "no_speech_prob": 0.029639584943652153
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 15.68,
                            "end": 20.68,
                            "text": " My grandfather, also named Noah, was then but nine years old.",
                            "tokens": [
                                51148,
                                1222,
                                14754,
                                11,
                                611,
                                4926,
                                20895,
                                11,
                                390,
                                550,
                                457,
                                4949,
                                924,
                                1331,
                                13,
                                51398
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24441534749577554,
                            "compression_ratio": 1.5341880341880343,
                            "no_speech_prob": 0.029639584943652153
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 20.68,
                            "end": 27.080000000000002,
                            "text": " At the breaking out of the war of the revolution, after the battles of Concord and Lexington,",
                            "tokens": [
                                51398,
                                1711,
                                264,
                                7697,
                                484,
                                295,
                                264,
                                1516,
                                295,
                                264,
                                8894,
                                11,
                                934,
                                264,
                                14648,
                                295,
                                18200,
                                765,
                                293,
                                24086,
                                20251,
                                11,
                                51718
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24441534749577554,
                            "compression_ratio": 1.5341880341880343,
                            "no_speech_prob": 0.029639584943652153
                        },
                        {
                            "id": 5,
                            "seek": 2708,
                            "start": 27.08,
                            "end": 30.08,
                            "text": " he went with a Connecticut company to join the continent.",
                            "tokens": [
                                50364,
                                415,
                                1437,
                                365,
                                257,
                                29433,
                                2237,
                                281,
                                3917,
                                264,
                                18932,
                                13,
                                50514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.30214170047215055,
                            "compression_ratio": 0.9344262295081968,
                            "no_speech_prob": 0.027676071971654892
                        }
                    ],
                    "language": "en"
                },
                "current_time": 90
            }])

        // newSocket.emit('scroll-to-text', {
        //     current_time: time,
        //     audio_duration: audioDuration,
        //     file_name: audioFile.name
        // });
    }
    const searchPDF = async (pdfText, searchTerm) => {
        const searchResults = [];
        let starter = 0;
        let ender = 0;

        for (let i = 7; i >= 4; i--) {
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
        }

        return searchResults[0];
    };



    const handleAudioFileChange = (event) => {
        setAudioFile(event.target.files[0]);

    };

    const handleEbookFileChange = async (event) => {
        setEbookFile(URL.createObjectURL(event.target.files[0]));

    };

    const handleTimestampsFileChange = (event) => {
        // console.log(event.target.files[0].name)
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


    const transcribe = async () => {
        if (audioFile) {
            if (timeStamps.length === 0) {
                toast.error("Please add time stamps")
                return
            }
            console.log(timeStampsType);
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
            // const res = await fetch('http://13.51.205.166:5111/upload', {
            // const res = await fetch('http://127.0.0.1:5000/upload', {
            setTranscription([])
            setSearches([])

            // Show uploading toast


            // Use toast.promise for cleaner handling of promises and toasts
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
                // return
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


                    // Handle the result as needed
                    if (result.ok) {
                        toast.success('Transcription successful!');
                        // Additional handling for success
                    } else {
                        toast.error('Transcription failed!');
                        // Additional handling for failure
                    }
                } catch (error) {
                    toast.error('Error during transcription:', error);
                    // Additional error handling
                }

            } catch (error) {
                toast.error("Error while checking if audio exists " + error)
            }
        }
        else {
            toast.error("Please select an audio file first")
        }


    }


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

                <form className="flex flex-col gap-6 w-full max-w-md">

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
                                // scp -i ./firstEC2.pem -r E:\Develpements\Soft Enterprise Tasks\Freelancer's tasks\Audiobook to text notes\whisper transcription flask ubuntu@51.20.183.130:/home/ubuntu/
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
                    {/* <xpdfTextExtractor PdfViewer={ebookFile} /> */}
                    <AudioPlayer
                        ref={audioPlayerRef}
                        src={audioData}
                        controls={true}
                        listenInterval={100}
                        showJumpControls={false}
                        customAdditionalControls={[]}
                        onListen={handleTimeUpdate}
                        onSeeked={handleSeeked}
                        time={currentTime}
                        onPlay={handlePlaying}
                        onPause={handlePause}
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
                    {/* <MemorizedAudioPlayer audioFile={audioFile} handlePause  = {handlePause} handlePlaying = {handlePlaying} handleSeeked = {handleSeeked} handleTimeUpdate = {handleTimeUpdate} /> */}
                    <button type="button" onClick={() => scrollToText()} className="bg-blue-500 text-white py-2 px-4 rounded">Scroll To Text</button>
                    <button type="button" id="capture" className="bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded" onClick={() => captureTimestamp()}>Capture Timestamp</button>
                    {/* <button type="button" id="load" className="bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded" onClick={() => showTimestamps()}>Load Captured Timestamps</button> */}

                    <ol id="capturedTimestamps" className="list-decimal flex items-center flex-col">

                    </ol>
                    <button type="button" onClick={() => transcribe()} className="bg-blue-500 text-white py-2 px-4 rounded">Transcribe audio</button>
                    <button type="button" className="bg-blue-500 text-white py-2 px-4 rounded" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false) }}>Clear Data Table</button>

                </form>
                <PDFReader ebookFile={ebookFile} setSearches={setSearches} searches={searches} transcription={transcription} allDone={allDone} setAllDone={setAllDone} pdfText={pdfText} setPdfText={setPdfText} segmentsText={segmentsText} playing={playing} setNumPages={setNumPages} numPages={numPages} />

                {/* <ToastContainer /> */}
            </div>

            <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} isCaputed={isCaputed} />
        </>

    );
}

export default Player;



// 
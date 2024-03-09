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

    const socketURL = "http://127.0.0.1:5111"

    let currentTime = 0;
    const [capturedTimeStamps, setCapturedTimeStamps] = useState([]);
    const [counter, setCounter] = useState(1)
    var seekedTime = 0;

    const audioPlayerRef = useRef(null);
    const orignalTextRef = useRef(null);
    const currentTimeRef = useRef(0);
    let battleSize = 5;
    let startPage = 1;
    let endPage = battleSize;
    let processedSeg = useMemo(() => [], []);
    const handleTimeUpdate = useCallback((time) => {
        currentTime = time;

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

                orignalTextRef.current = document.getElementsByClassName("textLayer");
                Array.from(orignalTextRef.current).forEach(element => {
                    const spans = element.querySelectorAll("span.bg-yellow-200");
                    spans.forEach(span => {
                        span.classList.remove("bg-yellow-200");
                    });
                });

                let founded = false;
                for (const s of orignalTextRef.current) {
                    const pageNumber = Array.from(orignalTextRef.current).indexOf(s) + 1;

                    if (pageNumber <= endPage && pageNumber >= startPage) {
                        console.log(pageNumber)

                        if (pageNumber > endPage) {
                            founded = false;
                        }

                        const ss = s.querySelectorAll("span[role='presentation']");

                        for (const sss of ss) {
                            const index = Array.from(ss).indexOf(sss) + pageNumber;
                            // console.log(sss)
                            sss.innerHTML = sss.innerHTML.replace(/<span class="bg-yellow-200" id="see"><\/span>(.*?)<\/span>/g, "$1");
                            sss.innerHTML = sss.innerHTML.replace(`id="see"`, "")
                            const newSpans = highlightSearchTerm(sss.innerText, relevantSegment.text);
                            if (newSpans !== sss.innerText) {
                                sss.innerHTML = newSpans;
                                processedSeg.push({ time: { start: relevantSegment.start + current_time, end: relevantSegment.end + current_time }, highlighted: true, pageNumber: pageNumber });
                                founded = true
                                console.log("founded for the this time: ", relevantSegment.text, pageNumber)
                                // break;
                            }
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
                        break; // Exit loop if reached endPage
                    }
                }
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
        setCapturedTimeStamps((prev) => [...prev, currentTime]);
        toast.success(currentTime + " Added in the timestamps list");
    }, [currentTime]);

    useEffect(() => {
        setTimeStamps((prev) => [...capturedTimeStamps]);
        setIsCaputed(true);
    }, [capturedTimeStamps]);

    const handleSeeked = useCallback((time) => {
        seekedTime = time;
    }, []);

    const scrollToText = useCallback(async () => {
        let time = currentTime;
        setCounter(1);
        setSegmentsText([
            {
                "current_time": 8138.50217,
                "result": {
                    "text": " see that we'd misled him, and that he too thought the documents had been forged. Killian's son, Gary, assured the press that his late father would never have kept a CYA file. This despite having told us before the segment aired, that he knew very little about his father's career in the National Guard. On September 15th, Mary accompanied 86-year-old Marion Carr Knox, who had been Killian's secretary from Texas to New York to be interviewed about...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.22,
                            "text": " see that we'd misled him, and that he too thought the documents had been forged.",
                            "tokens": [
                                50364,
                                536,
                                300,
                                321,
                                1116,
                                3346,
                                1493,
                                796,
                                11,
                                293,
                                300,
                                415,
                                886,
                                1194,
                                264,
                                8512,
                                632,
                                668,
                                40226,
                                13,
                                50675
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.22,
                            "end": 10.9,
                            "text": " Killian's son, Gary, assured the press that his late father would never have kept a",
                            "tokens": [
                                50675,
                                17526,
                                952,
                                311,
                                1872,
                                11,
                                13788,
                                11,
                                23426,
                                264,
                                1886,
                                300,
                                702,
                                3469,
                                3086,
                                576,
                                1128,
                                362,
                                4305,
                                257,
                                50909
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 10.9,
                            "end": 12.92,
                            "text": " CYA file.",
                            "tokens": [
                                50909,
                                383,
                                34349,
                                3991,
                                13,
                                51010
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.92,
                            "end": 17.7,
                            "text": " This despite having told us before the segment aired, that he knew very little about his father's",
                            "tokens": [
                                51010,
                                639,
                                7228,
                                1419,
                                1907,
                                505,
                                949,
                                264,
                                9469,
                                34503,
                                11,
                                300,
                                415,
                                2586,
                                588,
                                707,
                                466,
                                702,
                                3086,
                                311,
                                51249
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 17.7,
                            "end": 20.580000000000002,
                            "text": " career in the National Guard.",
                            "tokens": [
                                51249,
                                3988,
                                294,
                                264,
                                4862,
                                11549,
                                13,
                                51393
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 20.580000000000002,
                            "end": 27.48,
                            "text": " On September 15th, Mary accompanied 86-year-old Marion Carr Knox, who had been Killian's secretary",
                            "tokens": [
                                51393,
                                1282,
                                7216,
                                2119,
                                392,
                                11,
                                6059,
                                24202,
                                26687,
                                12,
                                5294,
                                12,
                                2641,
                                49270,
                                17715,
                                48510,
                                11,
                                567,
                                632,
                                668,
                                17526,
                                952,
                                311,
                                15691,
                                51738
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23300891656142014,
                            "compression_ratio": 1.5247148288973384,
                            "no_speech_prob": 0.004506645258516073
                        },
                        {
                            "id": 6,
                            "seek": 2748,
                            "start": 27.48,
                            "end": 29.98,
                            "text": " from Texas to New York to be interviewed about...",
                            "tokens": [
                                50364,
                                490,
                                7885,
                                281,
                                1873,
                                3609,
                                281,
                                312,
                                19770,
                                466,
                                485,
                                50489
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.472597232231727,
                            "compression_ratio": 0.9074074074074074,
                            "no_speech_prob": 0.11526786535978317
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8168.50217,
                "result": {
                    "text": " the memos. Neither Mary nor anyone on our team had found, Mrs. Knox, the associated press had found her after our program aired. If we'd found her beforehand, we would have used her.\" She told us, quote, I know that I didn't type them, however, the information in those is correct. She said that what was in them squared with what Killian thought of Lieutenant Bush. Killian and the other officers would, snicker about what Bush was getting away with, unquote.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.08,
                            "text": " the memos. Neither Mary nor anyone on our team had found, Mrs. Knox, the associated press",
                            "tokens": [
                                50364,
                                264,
                                1334,
                                329,
                                13,
                                23956,
                                6059,
                                6051,
                                2878,
                                322,
                                527,
                                1469,
                                632,
                                1352,
                                11,
                                9814,
                                13,
                                48510,
                                11,
                                264,
                                6615,
                                1886,
                                50668
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22678675234896464,
                            "compression_ratio": 1.6095617529880477,
                            "no_speech_prob": 0.04346334561705589
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.08,
                            "end": 11.08,
                            "text": " had found her after our program aired. If we'd found her beforehand, we would have used",
                            "tokens": [
                                50668,
                                632,
                                1352,
                                720,
                                934,
                                527,
                                1461,
                                34503,
                                13,
                                759,
                                321,
                                1116,
                                1352,
                                720,
                                22893,
                                11,
                                321,
                                576,
                                362,
                                1143,
                                50918
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22678675234896464,
                            "compression_ratio": 1.6095617529880477,
                            "no_speech_prob": 0.04346334561705589
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 11.08,
                            "end": 14.58,
                            "text": " her.\" She told us, quote, I know that I didn't",
                            "tokens": [
                                50918,
                                720,
                                889,
                                1240,
                                1907,
                                505,
                                11,
                                6513,
                                11,
                                286,
                                458,
                                300,
                                286,
                                994,
                                380,
                                51093
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22678675234896464,
                            "compression_ratio": 1.6095617529880477,
                            "no_speech_prob": 0.04346334561705589
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 14.58,
                            "end": 20.48,
                            "text": " type them, however, the information in those is correct. She said that what was in them",
                            "tokens": [
                                51093,
                                2010,
                                552,
                                11,
                                4461,
                                11,
                                264,
                                1589,
                                294,
                                729,
                                307,
                                3006,
                                13,
                                1240,
                                848,
                                300,
                                437,
                                390,
                                294,
                                552,
                                51388
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22678675234896464,
                            "compression_ratio": 1.6095617529880477,
                            "no_speech_prob": 0.04346334561705589
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 20.48,
                            "end": 25.84,
                            "text": " squared with what Killian thought of Lieutenant Bush. Killian and the other officers would,",
                            "tokens": [
                                51388,
                                8889,
                                365,
                                437,
                                17526,
                                952,
                                1194,
                                295,
                                28412,
                                15782,
                                13,
                                17526,
                                952,
                                293,
                                264,
                                661,
                                9199,
                                576,
                                11,
                                51656
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22678675234896464,
                            "compression_ratio": 1.6095617529880477,
                            "no_speech_prob": 0.04346334561705589
                        },
                        {
                            "id": 5,
                            "seek": 2584,
                            "start": 25.84,
                            "end": 29.6,
                            "text": " snicker about what Bush was getting away with, unquote.",
                            "tokens": [
                                50364,
                                2406,
                                33804,
                                466,
                                437,
                                15782,
                                390,
                                1242,
                                1314,
                                365,
                                11,
                                37557,
                                13,
                                50552
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.46821791330973306,
                            "compression_ratio": 0.9016393442622951,
                            "no_speech_prob": 0.14473506808280945
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8198.50217,
                "result": {
                    "text": " She clearly remembered the Colonel being angry at Bush's refusal of a direct order to take his flight physical and at his attitude of entitlement. She also acknowledged that Killian had started what she called a, quote, cover-your-back file, dealing with problems such as these. That was the positive. The negative was that she said she had not typed the memos. What emerged in the press thereafter was only about the negative. There was nothing about Bush refusing a-",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 8,
                            "text": " She clearly remembered the Colonel being angry at Bush's refusal of a direct order to take his flight physical and at his attitude of entitlement.",
                            "tokens": [
                                50364,
                                1240,
                                4448,
                                13745,
                                264,
                                28478,
                                885,
                                6884,
                                412,
                                15782,
                                311,
                                48948,
                                295,
                                257,
                                2047,
                                1668,
                                281,
                                747,
                                702,
                                7018,
                                4001,
                                293,
                                412,
                                702,
                                10157,
                                295,
                                14789,
                                3054,
                                13,
                                50764
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1524448167710077,
                            "compression_ratio": 1.5627705627705628,
                            "no_speech_prob": 0.005965732038021088
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 8,
                            "end": 17,
                            "text": " She also acknowledged that Killian had started what she called a, quote, cover-your-back file, dealing with problems such as these.",
                            "tokens": [
                                50764,
                                1240,
                                611,
                                27262,
                                300,
                                17526,
                                952,
                                632,
                                1409,
                                437,
                                750,
                                1219,
                                257,
                                11,
                                6513,
                                11,
                                2060,
                                12,
                                23093,
                                12,
                                3207,
                                3991,
                                11,
                                6260,
                                365,
                                2740,
                                1270,
                                382,
                                613,
                                13,
                                51214
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1524448167710077,
                            "compression_ratio": 1.5627705627705628,
                            "no_speech_prob": 0.005965732038021088
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 17,
                            "end": 23,
                            "text": " That was the positive. The negative was that she said she had not typed the memos.",
                            "tokens": [
                                51214,
                                663,
                                390,
                                264,
                                3353,
                                13,
                                440,
                                3671,
                                390,
                                300,
                                750,
                                848,
                                750,
                                632,
                                406,
                                33941,
                                264,
                                1334,
                                329,
                                13,
                                51514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1524448167710077,
                            "compression_ratio": 1.5627705627705628,
                            "no_speech_prob": 0.005965732038021088
                        },
                        {
                            "id": 3,
                            "seek": 2300,
                            "start": 23,
                            "end": 30,
                            "text": " What emerged in the press thereafter was only about the negative. There was nothing about Bush refusing a-",
                            "tokens": [
                                50364,
                                708,
                                20178,
                                294,
                                264,
                                1886,
                                38729,
                                390,
                                787,
                                466,
                                264,
                                3671,
                                13,
                                821,
                                390,
                                1825,
                                466,
                                15782,
                                37289,
                                257,
                                12,
                                50714
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.09755505686220915,
                            "compression_ratio": 1.1777777777777778,
                            "no_speech_prob": 0.40121355652809143
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8228.50217,
                "result": {
                    "text": " wrecked order, and everything about Mrs. Knox saying she didn't type them, so therefore it was concluded the memos weren't genuine. At Andrew Hayward's direction Mary set up a conference call with Bill Burkett. One huge question was how the memos had found their way to him. He had previously given us the name of George Khan as the source, but as Andrew began to question him more intently, he changed his story completely.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.78,
                            "text": " wrecked order, and everything about Mrs. Knox saying she didn't type them, so therefore",
                            "tokens": [
                                50364,
                                21478,
                                292,
                                1668,
                                11,
                                293,
                                1203,
                                466,
                                9814,
                                13,
                                48510,
                                1566,
                                750,
                                994,
                                380,
                                2010,
                                552,
                                11,
                                370,
                                4412,
                                50653
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17647698105022472,
                            "compression_ratio": 1.5188284518828452,
                            "no_speech_prob": 0.0011154443491250277
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.78,
                            "end": 11.32,
                            "text": " it was concluded the memos weren't genuine.",
                            "tokens": [
                                50653,
                                309,
                                390,
                                22960,
                                264,
                                1334,
                                329,
                                4999,
                                380,
                                16699,
                                13,
                                50930
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17647698105022472,
                            "compression_ratio": 1.5188284518828452,
                            "no_speech_prob": 0.0011154443491250277
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 11.32,
                            "end": 16.240000000000002,
                            "text": " At Andrew Hayward's direction Mary set up a conference call with Bill Burkett.",
                            "tokens": [
                                50930,
                                1711,
                                10110,
                                8721,
                                1007,
                                311,
                                3513,
                                6059,
                                992,
                                493,
                                257,
                                7586,
                                818,
                                365,
                                5477,
                                7031,
                                74,
                                3093,
                                13,
                                51176
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17647698105022472,
                            "compression_ratio": 1.5188284518828452,
                            "no_speech_prob": 0.0011154443491250277
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 16.240000000000002,
                            "end": 20.36,
                            "text": " One huge question was how the memos had found their way to him.",
                            "tokens": [
                                51176,
                                1485,
                                2603,
                                1168,
                                390,
                                577,
                                264,
                                1334,
                                329,
                                632,
                                1352,
                                641,
                                636,
                                281,
                                796,
                                13,
                                51382
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17647698105022472,
                            "compression_ratio": 1.5188284518828452,
                            "no_speech_prob": 0.0011154443491250277
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 20.36,
                            "end": 25.68,
                            "text": " He had previously given us the name of George Khan as the source, but as Andrew began to",
                            "tokens": [
                                51382,
                                634,
                                632,
                                8046,
                                2212,
                                505,
                                264,
                                1315,
                                295,
                                7136,
                                18136,
                                382,
                                264,
                                4009,
                                11,
                                457,
                                382,
                                10110,
                                4283,
                                281,
                                51648
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.17647698105022472,
                            "compression_ratio": 1.5188284518828452,
                            "no_speech_prob": 0.0011154443491250277
                        },
                        {
                            "id": 5,
                            "seek": 2568,
                            "start": 25.68,
                            "end": 29.98,
                            "text": " question him more intently, he changed his story completely.",
                            "tokens": [
                                50364,
                                1168,
                                796,
                                544,
                                560,
                                2276,
                                11,
                                415,
                                3105,
                                702,
                                1657,
                                2584,
                                13,
                                50579
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.31087347666422527,
                            "compression_ratio": 0.9375,
                            "no_speech_prob": 0.3370404541492462
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8258.50217,
                "result": {
                    "text": " admitted that Khan had nothing to do with it. Betzy West, Mary, Hayward and I were all astonished when he said that a woman named Lucy Ramirez, whom he'd never mentioned before, had had a dark-skinned man deliver the papers to him at the Houston livestock show. This came entirely out of the blue, and it was dreadful news. What Burkett probably did not realize was that when a source lies about anything, he completely loses all credibility. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman. He's not a woman.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 2.8000000000000003,
                            "text": " admitted that Khan had nothing to do with it.",
                            "tokens": [
                                50364,
                                14920,
                                300,
                                18136,
                                632,
                                1825,
                                281,
                                360,
                                365,
                                309,
                                13,
                                50504
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 2.8000000000000003,
                            "end": 9.24,
                            "text": " Betzy West, Mary, Hayward and I were all astonished when he said that a woman named Lucy Ramirez,",
                            "tokens": [
                                50504,
                                6279,
                                1229,
                                4055,
                                11,
                                6059,
                                11,
                                8721,
                                1007,
                                293,
                                286,
                                645,
                                439,
                                25687,
                                4729,
                                562,
                                415,
                                848,
                                300,
                                257,
                                3059,
                                4926,
                                22698,
                                9078,
                                50231,
                                11,
                                50826
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 9.24,
                            "end": 14.280000000000001,
                            "text": " whom he'd never mentioned before, had had a dark-skinned man deliver the papers to him",
                            "tokens": [
                                50826,
                                7101,
                                415,
                                1116,
                                1128,
                                2835,
                                949,
                                11,
                                632,
                                632,
                                257,
                                2877,
                                12,
                                5161,
                                45508,
                                587,
                                4239,
                                264,
                                10577,
                                281,
                                796,
                                51078
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 14.280000000000001,
                            "end": 17.240000000000002,
                            "text": " at the Houston livestock show.",
                            "tokens": [
                                51078,
                                412,
                                264,
                                18717,
                                31768,
                                855,
                                13,
                                51226
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 17.240000000000002,
                            "end": 21.76,
                            "text": " This came entirely out of the blue, and it was dreadful news.",
                            "tokens": [
                                51226,
                                639,
                                1361,
                                7696,
                                484,
                                295,
                                264,
                                3344,
                                11,
                                293,
                                309,
                                390,
                                22236,
                                906,
                                2583,
                                13,
                                51452
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 21.76,
                            "end": 27.6,
                            "text": " What Burkett probably did not realize was that when a source lies about anything, he completely",
                            "tokens": [
                                51452,
                                708,
                                7031,
                                74,
                                3093,
                                1391,
                                630,
                                406,
                                4325,
                                390,
                                300,
                                562,
                                257,
                                4009,
                                9134,
                                466,
                                1340,
                                11,
                                415,
                                2584,
                                51744
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 27.6,
                            "end": 29.96,
                            "text": " loses all credibility.",
                            "tokens": [
                                51744,
                                18293,
                                439,
                                28852,
                                13,
                                51862
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21025223110033117,
                            "compression_ratio": 1.556338028169014,
                            "no_speech_prob": 0.005526924040168524
                        },
                        {
                            "id": 7,
                            "seek": 2996,
                            "start": 29.96,
                            "end": 30.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50364,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50414
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 8,
                            "seek": 2996,
                            "start": 30.96,
                            "end": 31.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50414,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 9,
                            "seek": 2996,
                            "start": 31.96,
                            "end": 32.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50464,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 10,
                            "seek": 2996,
                            "start": 32.96,
                            "end": 33.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50514,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50564
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 11,
                            "seek": 2996,
                            "start": 33.96,
                            "end": 34.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50564,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50614
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 12,
                            "seek": 2996,
                            "start": 34.96,
                            "end": 35.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50614,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50664
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 13,
                            "seek": 2996,
                            "start": 35.96,
                            "end": 36.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50664,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50714
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 14,
                            "seek": 2996,
                            "start": 36.96,
                            "end": 37.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50714,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50764
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 15,
                            "seek": 2996,
                            "start": 37.96,
                            "end": 38.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50764,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50814
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 16,
                            "seek": 2996,
                            "start": 38.96,
                            "end": 39.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50814,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50864
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 17,
                            "seek": 2996,
                            "start": 39.96,
                            "end": 40.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50864,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50914
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 18,
                            "seek": 2996,
                            "start": 40.96,
                            "end": 41.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50914,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                50964
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 19,
                            "seek": 2996,
                            "start": 41.96,
                            "end": 42.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                50964,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51014
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 20,
                            "seek": 2996,
                            "start": 42.96,
                            "end": 43.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51014,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51064
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 21,
                            "seek": 2996,
                            "start": 43.96,
                            "end": 44.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51064,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51114
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 22,
                            "seek": 2996,
                            "start": 44.96,
                            "end": 45.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51114,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51164
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 23,
                            "seek": 2996,
                            "start": 45.96,
                            "end": 46.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51164,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51214
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 24,
                            "seek": 2996,
                            "start": 46.96,
                            "end": 47.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51214,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51264
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 25,
                            "seek": 2996,
                            "start": 47.96,
                            "end": 48.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51264,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51314
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 26,
                            "seek": 2996,
                            "start": 48.96,
                            "end": 49.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51314,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51364
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 27,
                            "seek": 2996,
                            "start": 49.96,
                            "end": 50.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51364,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51414
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 28,
                            "seek": 2996,
                            "start": 50.96,
                            "end": 51.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51414,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 29,
                            "seek": 2996,
                            "start": 51.96,
                            "end": 52.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51464,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 30,
                            "seek": 2996,
                            "start": 52.96,
                            "end": 53.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51514,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51564
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 31,
                            "seek": 2996,
                            "start": 53.96,
                            "end": 54.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51564,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51614
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 32,
                            "seek": 2996,
                            "start": 54.96,
                            "end": 55.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51614,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51664
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 33,
                            "seek": 2996,
                            "start": 55.96,
                            "end": 56.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51664,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51714
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        },
                        {
                            "id": 34,
                            "seek": 2996,
                            "start": 56.96,
                            "end": 57.96,
                            "text": " He's not a woman.",
                            "tokens": [
                                51714,
                                634,
                                311,
                                406,
                                257,
                                3059,
                                13,
                                51764
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16263326009114584,
                            "compression_ratio": 16.225806451612904,
                            "no_speech_prob": 0.8816848397254944
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8288.50217,
                "result": {
                    "text": " handed potent new ammunition to those who were already screaming the documents were false. He also handed Andrew Hayward a get-out-of-jail-free card for distancing himself and everyone above him from the crisis. After the call ended, Hayward directed Mary to get Berkett on camera. Shortly thereafter, Andrew Hayward ordered Mary to stop working on the story, even by phone, even from her own home. Professionally, she was placed under house...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6,
                            "text": " handed potent new ammunition to those who were already screaming the documents were false.",
                            "tokens": [
                                50364,
                                16013,
                                27073,
                                777,
                                32251,
                                281,
                                729,
                                567,
                                645,
                                1217,
                                12636,
                                264,
                                8512,
                                645,
                                7908,
                                13,
                                50664
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6,
                            "end": 13.14,
                            "text": " He also handed Andrew Hayward a get-out-of-jail-free card for distancing himself and everyone above",
                            "tokens": [
                                50664,
                                634,
                                611,
                                16013,
                                10110,
                                8721,
                                1007,
                                257,
                                483,
                                12,
                                346,
                                12,
                                2670,
                                12,
                                73,
                                864,
                                12,
                                10792,
                                2920,
                                337,
                                18567,
                                3647,
                                293,
                                1518,
                                3673,
                                51021
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 13.14,
                            "end": 15.36,
                            "text": " him from the crisis.",
                            "tokens": [
                                51021,
                                796,
                                490,
                                264,
                                5869,
                                13,
                                51132
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 15.36,
                            "end": 19.68,
                            "text": " After the call ended, Hayward directed Mary to get Berkett on camera.",
                            "tokens": [
                                51132,
                                2381,
                                264,
                                818,
                                4590,
                                11,
                                8721,
                                1007,
                                12898,
                                6059,
                                281,
                                483,
                                5637,
                                74,
                                3093,
                                322,
                                2799,
                                13,
                                51348
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 19.68,
                            "end": 24.400000000000002,
                            "text": " Shortly thereafter, Andrew Hayward ordered Mary to stop working on the story, even by",
                            "tokens": [
                                51348,
                                40109,
                                38729,
                                11,
                                10110,
                                8721,
                                1007,
                                8866,
                                6059,
                                281,
                                1590,
                                1364,
                                322,
                                264,
                                1657,
                                11,
                                754,
                                538,
                                51584
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 24.400000000000002,
                            "end": 27.48,
                            "text": " phone, even from her own home.",
                            "tokens": [
                                51584,
                                2593,
                                11,
                                754,
                                490,
                                720,
                                1065,
                                1280,
                                13,
                                51738
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22627817153930663,
                            "compression_ratio": 1.6244897959183673,
                            "no_speech_prob": 0.004027873743325472
                        },
                        {
                            "id": 6,
                            "seek": 2748,
                            "start": 27.48,
                            "end": 29.98,
                            "text": " Professionally, she was placed under house...",
                            "tokens": [
                                50364,
                                6039,
                                4311,
                                379,
                                11,
                                750,
                                390,
                                7074,
                                833,
                                1782,
                                485,
                                50489
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.5279370454641489,
                            "compression_ratio": 0.8490566037735849,
                            "no_speech_prob": 0.8193845152854919
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8318.50217,
                "result": {
                    "text": " rest. Then CBS forbade anyone from working on the story in any way shape or form, including me. In effect, we were ordered to surrender, and for the life of me I couldn't understand why. I went to Hayward to complain. I told him, this is madness. We are under unrelenting attack on a story that you and I both know is true.\" He said, that's not the point, Dan. I tried to hide my amazement, unsuccessfully I suspect. The...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 7.44,
                            "text": " rest. Then CBS forbade anyone from working on the story in any way shape or form, including",
                            "tokens": [
                                50364,
                                1472,
                                13,
                                1396,
                                35856,
                                16603,
                                762,
                                2878,
                                490,
                                1364,
                                322,
                                264,
                                1657,
                                294,
                                604,
                                636,
                                3909,
                                420,
                                1254,
                                11,
                                3009,
                                50736
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1737076345116201,
                            "compression_ratio": 1.5254237288135593,
                            "no_speech_prob": 0.04016986861824989
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 7.44,
                            "end": 13.56,
                            "text": " me. In effect, we were ordered to surrender, and for the life of me I couldn't understand",
                            "tokens": [
                                50736,
                                385,
                                13,
                                682,
                                1802,
                                11,
                                321,
                                645,
                                8866,
                                281,
                                22185,
                                11,
                                293,
                                337,
                                264,
                                993,
                                295,
                                385,
                                286,
                                2809,
                                380,
                                1223,
                                51042
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1737076345116201,
                            "compression_ratio": 1.5254237288135593,
                            "no_speech_prob": 0.04016986861824989
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 13.56,
                            "end": 19.88,
                            "text": " why. I went to Hayward to complain. I told him, this is madness. We are under unrelenting",
                            "tokens": [
                                51042,
                                983,
                                13,
                                286,
                                1437,
                                281,
                                8721,
                                1007,
                                281,
                                11024,
                                13,
                                286,
                                1907,
                                796,
                                11,
                                341,
                                307,
                                28736,
                                13,
                                492,
                                366,
                                833,
                                517,
                                4419,
                                49265,
                                51358
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1737076345116201,
                            "compression_ratio": 1.5254237288135593,
                            "no_speech_prob": 0.04016986861824989
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 19.88,
                            "end": 25.8,
                            "text": " attack on a story that you and I both know is true.\" He said, that's not the point, Dan.",
                            "tokens": [
                                51358,
                                2690,
                                322,
                                257,
                                1657,
                                300,
                                291,
                                293,
                                286,
                                1293,
                                458,
                                307,
                                2074,
                                889,
                                634,
                                848,
                                11,
                                300,
                                311,
                                406,
                                264,
                                935,
                                11,
                                3394,
                                13,
                                51654
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1737076345116201,
                            "compression_ratio": 1.5254237288135593,
                            "no_speech_prob": 0.04016986861824989
                        },
                        {
                            "id": 4,
                            "seek": 2580,
                            "start": 25.8,
                            "end": 29.96,
                            "text": " I tried to hide my amazement, unsuccessfully I suspect. The...",
                            "tokens": [
                                50364,
                                286,
                                3031,
                                281,
                                6479,
                                452,
                                669,
                                921,
                                1712,
                                11,
                                40501,
                                2277,
                                286,
                                9091,
                                13,
                                440,
                                485,
                                50572
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.3083423564308568,
                            "compression_ratio": 0.9117647058823529,
                            "no_speech_prob": 0.16895350813865662
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8348.50217,
                "result": {
                    "text": " President of CBS News was telling me directly that defending the truth didn't matter. Why not? Quote, because the documents have been made the focal point. I said, Andrew, anyone who has studied combat knows that you don't let the enemy choose the ground whether decisive battle is to be fought. It didn't register. I might as well have been speaking Martian. He said, flatly, Dan, you don't understand. No more.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6,
                            "text": " President of CBS News was telling me directly that defending the truth didn't matter.",
                            "tokens": [
                                50364,
                                3117,
                                295,
                                35856,
                                7987,
                                390,
                                3585,
                                385,
                                3838,
                                300,
                                21377,
                                264,
                                3494,
                                994,
                                380,
                                1871,
                                13,
                                50664
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6,
                            "end": 7,
                            "text": " Why not?",
                            "tokens": [
                                50664,
                                1545,
                                406,
                                30,
                                50714
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 7,
                            "end": 11.76,
                            "text": " Quote, because the documents have been made the focal point.",
                            "tokens": [
                                50714,
                                2326,
                                1370,
                                11,
                                570,
                                264,
                                8512,
                                362,
                                668,
                                1027,
                                264,
                                26592,
                                935,
                                13,
                                50952
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 11.76,
                            "end": 16.6,
                            "text": " I said, Andrew, anyone who has studied combat knows that you don't let the enemy choose",
                            "tokens": [
                                50952,
                                286,
                                848,
                                11,
                                10110,
                                11,
                                2878,
                                567,
                                575,
                                9454,
                                8361,
                                3255,
                                300,
                                291,
                                500,
                                380,
                                718,
                                264,
                                5945,
                                2826,
                                51194
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 16.6,
                            "end": 20.36,
                            "text": " the ground whether decisive battle is to be fought.",
                            "tokens": [
                                51194,
                                264,
                                2727,
                                1968,
                                34998,
                                4635,
                                307,
                                281,
                                312,
                                11391,
                                13,
                                51382
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 20.36,
                            "end": 22.04,
                            "text": " It didn't register.",
                            "tokens": [
                                51382,
                                467,
                                994,
                                380,
                                7280,
                                13,
                                51466
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 22.04,
                            "end": 24.6,
                            "text": " I might as well have been speaking Martian.",
                            "tokens": [
                                51466,
                                286,
                                1062,
                                382,
                                731,
                                362,
                                668,
                                4124,
                                5807,
                                952,
                                13,
                                51594
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 7,
                            "seek": 0,
                            "start": 24.6,
                            "end": 28.8,
                            "text": " He said, flatly, Dan, you don't understand.",
                            "tokens": [
                                51594,
                                634,
                                848,
                                11,
                                4962,
                                356,
                                11,
                                3394,
                                11,
                                291,
                                500,
                                380,
                                1223,
                                13,
                                51804
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22069253654123466,
                            "compression_ratio": 1.555984555984556,
                            "no_speech_prob": 0.007058780174702406
                        },
                        {
                            "id": 8,
                            "seek": 2880,
                            "start": 28.8,
                            "end": 29.8,
                            "text": " No more.",
                            "tokens": [
                                50364,
                                883,
                                544,
                                13,
                                50414
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.5473693211873373,
                            "compression_ratio": 0.5,
                            "no_speech_prob": 0.8375763893127441
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8378.50217,
                "result": {
                    "text": " I said, Andrew, that's unacceptable. And with that I went back to my desk. I thought about it briefly and then headed back to his office. I said, Andrew, you've completely shut down CBS News from investigating this any further. To me that's just wrong. We can't just thrill our hands and surrender. Above all in the story we noted me true. I feel so strongly about this that I'm going to hire an investigator on my own with money from my own pocket. Andrew tried to keep a poker face.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 4,
                            "text": " I said, Andrew, that's unacceptable.",
                            "tokens": [
                                50364,
                                286,
                                848,
                                11,
                                10110,
                                11,
                                300,
                                311,
                                31812,
                                13,
                                50564
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 4,
                            "end": 5.72,
                            "text": " And with that I went back to my desk.",
                            "tokens": [
                                50564,
                                400,
                                365,
                                300,
                                286,
                                1437,
                                646,
                                281,
                                452,
                                10026,
                                13,
                                50650
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 5.72,
                            "end": 9.44,
                            "text": " I thought about it briefly and then headed back to his office.",
                            "tokens": [
                                50650,
                                286,
                                1194,
                                466,
                                309,
                                10515,
                                293,
                                550,
                                12798,
                                646,
                                281,
                                702,
                                3398,
                                13,
                                50836
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 9.44,
                            "end": 15.280000000000001,
                            "text": " I said, Andrew, you've completely shut down CBS News from investigating this any further.",
                            "tokens": [
                                50836,
                                286,
                                848,
                                11,
                                10110,
                                11,
                                291,
                                600,
                                2584,
                                5309,
                                760,
                                35856,
                                7987,
                                490,
                                22858,
                                341,
                                604,
                                3052,
                                13,
                                51128
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 15.280000000000001,
                            "end": 16.6,
                            "text": " To me that's just wrong.",
                            "tokens": [
                                51128,
                                1407,
                                385,
                                300,
                                311,
                                445,
                                2085,
                                13,
                                51194
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 16.6,
                            "end": 19.400000000000002,
                            "text": " We can't just thrill our hands and surrender.",
                            "tokens": [
                                51194,
                                492,
                                393,
                                380,
                                445,
                                32935,
                                527,
                                2377,
                                293,
                                22185,
                                13,
                                51334
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 19.400000000000002,
                            "end": 21.88,
                            "text": " Above all in the story we noted me true.",
                            "tokens": [
                                51334,
                                32691,
                                439,
                                294,
                                264,
                                1657,
                                321,
                                12964,
                                385,
                                2074,
                                13,
                                51458
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 7,
                            "seek": 0,
                            "start": 21.88,
                            "end": 26.36,
                            "text": " I feel so strongly about this that I'm going to hire an investigator on my own with money",
                            "tokens": [
                                51458,
                                286,
                                841,
                                370,
                                10613,
                                466,
                                341,
                                300,
                                286,
                                478,
                                516,
                                281,
                                11158,
                                364,
                                38330,
                                322,
                                452,
                                1065,
                                365,
                                1460,
                                51682
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 8,
                            "seek": 0,
                            "start": 26.36,
                            "end": 28.72,
                            "text": " from my own pocket.",
                            "tokens": [
                                51682,
                                490,
                                452,
                                1065,
                                8963,
                                13,
                                51800
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21068492605666483,
                            "compression_ratio": 1.6446886446886446,
                            "no_speech_prob": 0.11603854596614838
                        },
                        {
                            "id": 9,
                            "seek": 2872,
                            "start": 28.72,
                            "end": 30,
                            "text": " Andrew tried to keep a poker face.",
                            "tokens": [
                                50364,
                                10110,
                                3031,
                                281,
                                1066,
                                257,
                                36863,
                                1851,
                                13,
                                50428
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.47771159085360443,
                            "compression_ratio": 0.8095238095238095,
                            "no_speech_prob": 0.28726470470428467
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8408.50217,
                "result": {
                    "text": " But his eyes registered alarm. I really knew I'd gotten his attention because he insisted there must be surely a clause in my contract that would prevent me from doing that. I had just lined up a former New York City homicide detective to begin my investigation when Hayward came back to me with a different proposal. CBS he said was going to hire its own outside investigative team. At first the indicated they were looking at CROLE incorporated.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 3.6,
                            "text": " But his eyes registered alarm.",
                            "tokens": [
                                50364,
                                583,
                                702,
                                2575,
                                13968,
                                14183,
                                13,
                                50544
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 3.6,
                            "end": 8.34,
                            "text": " I really knew I'd gotten his attention because he insisted there must be surely a clause",
                            "tokens": [
                                50544,
                                286,
                                534,
                                2586,
                                286,
                                1116,
                                5768,
                                702,
                                3202,
                                570,
                                415,
                                28456,
                                456,
                                1633,
                                312,
                                11468,
                                257,
                                25925,
                                50781
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 8.34,
                            "end": 12.040000000000001,
                            "text": " in my contract that would prevent me from doing that.",
                            "tokens": [
                                50781,
                                294,
                                452,
                                4364,
                                300,
                                576,
                                4871,
                                385,
                                490,
                                884,
                                300,
                                13,
                                50966
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.040000000000001,
                            "end": 17.48,
                            "text": " I had just lined up a former New York City homicide detective to begin my investigation",
                            "tokens": [
                                50966,
                                286,
                                632,
                                445,
                                17189,
                                493,
                                257,
                                5819,
                                1873,
                                3609,
                                4392,
                                49411,
                                25571,
                                281,
                                1841,
                                452,
                                9627,
                                51238
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 17.48,
                            "end": 21.28,
                            "text": " when Hayward came back to me with a different proposal.",
                            "tokens": [
                                51238,
                                562,
                                8721,
                                1007,
                                1361,
                                646,
                                281,
                                385,
                                365,
                                257,
                                819,
                                11494,
                                13,
                                51428
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 21.28,
                            "end": 26.32,
                            "text": " CBS he said was going to hire its own outside investigative team.",
                            "tokens": [
                                51428,
                                35856,
                                415,
                                848,
                                390,
                                516,
                                281,
                                11158,
                                1080,
                                1065,
                                2380,
                                45495,
                                1469,
                                13,
                                51680
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16355157702156667,
                            "compression_ratio": 1.538152610441767,
                            "no_speech_prob": 0.06355153769254684
                        },
                        {
                            "id": 6,
                            "seek": 2632,
                            "start": 26.32,
                            "end": 29.92,
                            "text": " At first the indicated they were looking at CROLE incorporated.",
                            "tokens": [
                                50364,
                                1711,
                                700,
                                264,
                                16176,
                                436,
                                645,
                                1237,
                                412,
                                383,
                                7142,
                                2634,
                                21654,
                                13,
                                50544
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.7408490180969238,
                            "compression_ratio": 0.9692307692307692,
                            "no_speech_prob": 0.4539657235145569
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8438.50217,
                "result": {
                    "text": " large and prestigious New York-based investigative firm, but he backed away from that quickly saying that Crowe had wanted too much money. The company they turned to instead was Safer Resette, a security firm that was run by Howard Safer. I immediately expressed my skepticism. Even if they were competent, this hardly sounded to me like a disinterested outfit. Howard Safer had been Rudy Giuliani's police commissioner. Safer's firm, job-downphe assignment, to a",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 3.7,
                            "text": " large and prestigious New York-based investigative firm, but he",
                            "tokens": [
                                50364,
                                2416,
                                293,
                                33510,
                                1873,
                                3609,
                                12,
                                6032,
                                45495,
                                6174,
                                11,
                                457,
                                415,
                                50549
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 3.7,
                            "end": 6.8,
                            "text": " backed away from that quickly saying that Crowe had wanted too much",
                            "tokens": [
                                50549,
                                20391,
                                1314,
                                490,
                                300,
                                2661,
                                1566,
                                300,
                                27072,
                                68,
                                632,
                                1415,
                                886,
                                709,
                                50704
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 6.8,
                            "end": 12.48,
                            "text": " money. The company they turned to instead was Safer Resette, a security",
                            "tokens": [
                                50704,
                                1460,
                                13,
                                440,
                                2237,
                                436,
                                3574,
                                281,
                                2602,
                                390,
                                6299,
                                612,
                                5015,
                                3007,
                                11,
                                257,
                                3825,
                                50988
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.48,
                            "end": 16.8,
                            "text": " firm that was run by Howard Safer. I immediately expressed my",
                            "tokens": [
                                50988,
                                6174,
                                300,
                                390,
                                1190,
                                538,
                                17626,
                                6299,
                                612,
                                13,
                                286,
                                4258,
                                12675,
                                452,
                                51204
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 16.8,
                            "end": 21.32,
                            "text": " skepticism. Even if they were competent, this hardly sounded to me",
                            "tokens": [
                                51204,
                                19128,
                                26356,
                                13,
                                2754,
                                498,
                                436,
                                645,
                                29998,
                                11,
                                341,
                                13572,
                                17714,
                                281,
                                385,
                                51430
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 21.32,
                            "end": 25.64,
                            "text": " like a disinterested outfit. Howard Safer had been Rudy Giuliani's",
                            "tokens": [
                                51430,
                                411,
                                257,
                                717,
                                5106,
                                21885,
                                11263,
                                13,
                                17626,
                                6299,
                                612,
                                632,
                                668,
                                38690,
                                38679,
                                21309,
                                311,
                                51646
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23172382432587293,
                            "compression_ratio": 1.5465116279069768,
                            "no_speech_prob": 0.0005634613917209208
                        },
                        {
                            "id": 6,
                            "seek": 2564,
                            "start": 25.64,
                            "end": 29.64,
                            "text": " police commissioner. Safer's firm, job-downphe assignment, to a",
                            "tokens": [
                                50364,
                                3804,
                                33678,
                                13,
                                6299,
                                612,
                                311,
                                6174,
                                11,
                                1691,
                                12,
                                5093,
                                79,
                                675,
                                15187,
                                11,
                                281,
                                257,
                                50564
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.594210147857666,
                            "compression_ratio": 0.9130434782608695,
                            "no_speech_prob": 0.10424832254648209
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8468.50217,
                "result": {
                    "text": " or FBI investigator named Eric Riggler. Word came back pretty quickly that Riggler had run up against stone walls everywhere. He never got any further than Bill Burkett. On September 18th, a reporter for the Los Angeles Times, Peter Walshden, broke what should have been a major development when he outed Buckhead as Harry McDougold and Atlanta attorney. In the wake of the Monica Lewinsky affair, Harry McDougold had helped draft the motion",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 3.56,
                            "text": " or FBI investigator named Eric Riggler.",
                            "tokens": [
                                50364,
                                420,
                                17441,
                                38330,
                                4926,
                                9336,
                                497,
                                6249,
                                1918,
                                13,
                                50542
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 3.56,
                            "end": 8.64,
                            "text": " Word came back pretty quickly that Riggler had run up against stone walls everywhere.",
                            "tokens": [
                                50542,
                                8725,
                                1361,
                                646,
                                1238,
                                2661,
                                300,
                                497,
                                6249,
                                1918,
                                632,
                                1190,
                                493,
                                1970,
                                7581,
                                7920,
                                5315,
                                13,
                                50796
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 8.64,
                            "end": 12.200000000000001,
                            "text": " He never got any further than Bill Burkett.",
                            "tokens": [
                                50796,
                                634,
                                1128,
                                658,
                                604,
                                3052,
                                813,
                                5477,
                                7031,
                                74,
                                3093,
                                13,
                                50974
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.200000000000001,
                            "end": 17.36,
                            "text": " On September 18th, a reporter for the Los Angeles Times, Peter Walshden, broke what should have",
                            "tokens": [
                                50974,
                                1282,
                                7216,
                                2443,
                                392,
                                11,
                                257,
                                19152,
                                337,
                                264,
                                7632,
                                12292,
                                11366,
                                11,
                                6508,
                                343,
                                1124,
                                71,
                                1556,
                                11,
                                6902,
                                437,
                                820,
                                362,
                                51232
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 17.36,
                            "end": 24.28,
                            "text": " been a major development when he outed Buckhead as Harry McDougold and Atlanta attorney.",
                            "tokens": [
                                51232,
                                668,
                                257,
                                2563,
                                3250,
                                562,
                                415,
                                484,
                                292,
                                22006,
                                1934,
                                382,
                                9378,
                                4050,
                                35,
                                513,
                                2641,
                                293,
                                20225,
                                13469,
                                13,
                                51578
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 24.28,
                            "end": 29.42,
                            "text": " In the wake of the Monica Lewinsky affair, Harry McDougold had helped draft the motion",
                            "tokens": [
                                51578,
                                682,
                                264,
                                6634,
                                295,
                                264,
                                25363,
                                14542,
                                44153,
                                22987,
                                11,
                                9378,
                                4050,
                                35,
                                513,
                                2641,
                                632,
                                4254,
                                11206,
                                264,
                                5394,
                                51835
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.267838110003555,
                            "compression_ratio": 1.494915254237288,
                            "no_speech_prob": 0.015482590533792973
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8498.50217,
                "result": {
                    "text": " and saw Supreme Court asking that former President Clinton be disbarred in his home state. But even this startling revelation that Buckhead was not a typography expert but a conservative activist with strong ties to the Republican Party did nothing to Dureovi, quote, phony documents, joggernaut. By this time the story had taken on a life of its own, instead of broadcasting the news, he had become the news, which is every journalist",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.3,
                            "text": " and saw Supreme Court asking that former President Clinton be disbarred in his home state.",
                            "tokens": [
                                50364,
                                293,
                                1866,
                                11032,
                                7873,
                                3365,
                                300,
                                5819,
                                3117,
                                15445,
                                312,
                                717,
                                5356,
                                986,
                                294,
                                702,
                                1280,
                                1785,
                                13,
                                50679
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23853342156661184,
                            "compression_ratio": 1.5277777777777777,
                            "no_speech_prob": 0.010957969352602959
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.3,
                            "end": 11.620000000000001,
                            "text": " But even this startling revelation that Buckhead was not a typography expert but a conservative",
                            "tokens": [
                                50679,
                                583,
                                754,
                                341,
                                722,
                                1688,
                                23456,
                                300,
                                22006,
                                1934,
                                390,
                                406,
                                257,
                                2125,
                                5820,
                                5844,
                                457,
                                257,
                                13780,
                                50945
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23853342156661184,
                            "compression_ratio": 1.5277777777777777,
                            "no_speech_prob": 0.010957969352602959
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 11.620000000000001,
                            "end": 18.92,
                            "text": " activist with strong ties to the Republican Party did nothing to Dureovi, quote, phony documents,",
                            "tokens": [
                                50945,
                                24836,
                                365,
                                2068,
                                14039,
                                281,
                                264,
                                10937,
                                8552,
                                630,
                                1825,
                                281,
                                413,
                                540,
                                78,
                                4917,
                                11,
                                6513,
                                11,
                                903,
                                2526,
                                8512,
                                11,
                                51310
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23853342156661184,
                            "compression_ratio": 1.5277777777777777,
                            "no_speech_prob": 0.010957969352602959
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.92,
                            "end": 21.32,
                            "text": " joggernaut.",
                            "tokens": [
                                51310,
                                9464,
                                1321,
                                629,
                                325,
                                13,
                                51430
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23853342156661184,
                            "compression_ratio": 1.5277777777777777,
                            "no_speech_prob": 0.010957969352602959
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 21.32,
                            "end": 27.14,
                            "text": " By this time the story had taken on a life of its own, instead of broadcasting the news,",
                            "tokens": [
                                51430,
                                3146,
                                341,
                                565,
                                264,
                                1657,
                                632,
                                2726,
                                322,
                                257,
                                993,
                                295,
                                1080,
                                1065,
                                11,
                                2602,
                                295,
                                30024,
                                264,
                                2583,
                                11,
                                51721
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23853342156661184,
                            "compression_ratio": 1.5277777777777777,
                            "no_speech_prob": 0.010957969352602959
                        },
                        {
                            "id": 5,
                            "seek": 2714,
                            "start": 27.14,
                            "end": 30.02,
                            "text": " he had become the news, which is every journalist",
                            "tokens": [
                                50364,
                                415,
                                632,
                                1813,
                                264,
                                2583,
                                11,
                                597,
                                307,
                                633,
                                17277,
                                50508
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.25376758208641637,
                            "compression_ratio": 0.875,
                            "no_speech_prob": 0.1531781107187271
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8528.50217,
                "result": {
                    "text": " were Snipemare. The night before I was to interview Birkett, Andrew Hayward convened a meeting without my knowledge with some of his top staff and a few of the colleagues in the New York Broadcast Center. A person who was in the room revealed to me several years later, that Hayward told those in attendance that under no circumstances was I to learn what was discussed, or even that there had been a meeting at all. The purpose of the clandestine gathering was to strategize and plan.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.12,
                            "text": " were Snipemare. The night before I was to interview Birkett, Andrew Hayward convened a meeting",
                            "tokens": [
                                50364,
                                645,
                                318,
                                3722,
                                494,
                                15455,
                                13,
                                440,
                                1818,
                                949,
                                286,
                                390,
                                281,
                                4049,
                                7145,
                                74,
                                3093,
                                11,
                                10110,
                                8721,
                                1007,
                                7158,
                                292,
                                257,
                                3440,
                                50670
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21152438436235702,
                            "compression_ratio": 1.6148409893992932,
                            "no_speech_prob": 0.015487448312342167
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.12,
                            "end": 11.040000000000001,
                            "text": " without my knowledge with some of his top staff and a few of the colleagues in the New",
                            "tokens": [
                                50670,
                                1553,
                                452,
                                3601,
                                365,
                                512,
                                295,
                                702,
                                1192,
                                3525,
                                293,
                                257,
                                1326,
                                295,
                                264,
                                7734,
                                294,
                                264,
                                1873,
                                50916
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21152438436235702,
                            "compression_ratio": 1.6148409893992932,
                            "no_speech_prob": 0.015487448312342167
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 11.040000000000001,
                            "end": 16.72,
                            "text": " York Broadcast Center. A person who was in the room revealed to me several years later,",
                            "tokens": [
                                50916,
                                3609,
                                14074,
                                3734,
                                5169,
                                13,
                                316,
                                954,
                                567,
                                390,
                                294,
                                264,
                                1808,
                                9599,
                                281,
                                385,
                                2940,
                                924,
                                1780,
                                11,
                                51200
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21152438436235702,
                            "compression_ratio": 1.6148409893992932,
                            "no_speech_prob": 0.015487448312342167
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 16.72,
                            "end": 21.56,
                            "text": " that Hayward told those in attendance that under no circumstances was I to learn what was",
                            "tokens": [
                                51200,
                                300,
                                8721,
                                1007,
                                1907,
                                729,
                                294,
                                24337,
                                300,
                                833,
                                572,
                                9121,
                                390,
                                286,
                                281,
                                1466,
                                437,
                                390,
                                51442
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21152438436235702,
                            "compression_ratio": 1.6148409893992932,
                            "no_speech_prob": 0.015487448312342167
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 21.56,
                            "end": 28.16,
                            "text": " discussed, or even that there had been a meeting at all. The purpose of the clandestine gathering",
                            "tokens": [
                                51442,
                                7152,
                                11,
                                420,
                                754,
                                300,
                                456,
                                632,
                                668,
                                257,
                                3440,
                                412,
                                439,
                                13,
                                440,
                                4334,
                                295,
                                264,
                                596,
                                474,
                                377,
                                533,
                                13519,
                                51772
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.21152438436235702,
                            "compression_ratio": 1.6148409893992932,
                            "no_speech_prob": 0.015487448312342167
                        },
                        {
                            "id": 5,
                            "seek": 2816,
                            "start": 28.16,
                            "end": 30,
                            "text": " was to strategize and plan.",
                            "tokens": [
                                50364,
                                390,
                                281,
                                5464,
                                1125,
                                293,
                                1393,
                                13,
                                50456
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.4992805480957031,
                            "compression_ratio": 0.7714285714285715,
                            "no_speech_prob": 0.23409686982631683
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8558.50217,
                "result": {
                    "text": " for the Berkett interview. I had been ordered to conduct the interview, but the purpose was not disclosed to me. I had been informed that the intention was to give Berkett a chance to explain himself and to give his side of the story. I was also told that it would be put on the air, quote, at some length. But that was not the real agenda. On September 18th, I flew to Dallas to meet with Mary and do the interview with Berkett. Betty West was assigned to come with...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.68,
                            "text": " for the Berkett interview. I had been ordered to conduct the interview, but the purpose",
                            "tokens": [
                                50364,
                                337,
                                264,
                                5637,
                                74,
                                3093,
                                4049,
                                13,
                                286,
                                632,
                                668,
                                8866,
                                281,
                                6018,
                                264,
                                4049,
                                11,
                                457,
                                264,
                                4334,
                                50648
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.14701356385883532,
                            "compression_ratio": 1.7510204081632652,
                            "no_speech_prob": 0.043901924043893814
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.68,
                            "end": 10.72,
                            "text": " was not disclosed to me. I had been informed that the intention was to give Berkett a chance",
                            "tokens": [
                                50648,
                                390,
                                406,
                                17092,
                                1744,
                                281,
                                385,
                                13,
                                286,
                                632,
                                668,
                                11740,
                                300,
                                264,
                                7789,
                                390,
                                281,
                                976,
                                5637,
                                74,
                                3093,
                                257,
                                2931,
                                50900
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.14701356385883532,
                            "compression_ratio": 1.7510204081632652,
                            "no_speech_prob": 0.043901924043893814
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 10.72,
                            "end": 16.240000000000002,
                            "text": " to explain himself and to give his side of the story. I was also told that it would be put",
                            "tokens": [
                                50900,
                                281,
                                2903,
                                3647,
                                293,
                                281,
                                976,
                                702,
                                1252,
                                295,
                                264,
                                1657,
                                13,
                                286,
                                390,
                                611,
                                1907,
                                300,
                                309,
                                576,
                                312,
                                829,
                                51176
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.14701356385883532,
                            "compression_ratio": 1.7510204081632652,
                            "no_speech_prob": 0.043901924043893814
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 16.240000000000002,
                            "end": 23.68,
                            "text": " on the air, quote, at some length. But that was not the real agenda.",
                            "tokens": [
                                51176,
                                322,
                                264,
                                1988,
                                11,
                                6513,
                                11,
                                412,
                                512,
                                4641,
                                13,
                                583,
                                300,
                                390,
                                406,
                                264,
                                957,
                                9829,
                                13,
                                51548
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.14701356385883532,
                            "compression_ratio": 1.7510204081632652,
                            "no_speech_prob": 0.043901924043893814
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 23.68,
                            "end": 28.32,
                            "text": " On September 18th, I flew to Dallas to meet with Mary and do the interview with Berkett.",
                            "tokens": [
                                51548,
                                1282,
                                7216,
                                2443,
                                392,
                                11,
                                286,
                                15728,
                                281,
                                22923,
                                281,
                                1677,
                                365,
                                6059,
                                293,
                                360,
                                264,
                                4049,
                                365,
                                5637,
                                74,
                                3093,
                                13,
                                51780
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.14701356385883532,
                            "compression_ratio": 1.7510204081632652,
                            "no_speech_prob": 0.043901924043893814
                        },
                        {
                            "id": 5,
                            "seek": 2832,
                            "start": 28.32,
                            "end": 30.32,
                            "text": " Betty West was assigned to come with...",
                            "tokens": [
                                50364,
                                30270,
                                4055,
                                390,
                                13279,
                                281,
                                808,
                                365,
                                485,
                                50464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.42945254932750354,
                            "compression_ratio": 0.8297872340425532,
                            "no_speech_prob": 0.16716210544109344
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8588.50217,
                "result": {
                    "text": " me, bringing a specific list of questions I was to ask. She didn't tell me at the time, but the list had come from Andrew Hayward. Earlier I had asked Hayward to go with me for the interview. He had refused. He was heavily into his distancing mode, but I wasn't smart enough to see it then. I still trusted him. As I later learned, he had given Betsy the job of making sure I got what management needed out of Birkett, which was for him to say that he had lied.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.2,
                            "text": " me, bringing a specific list of questions I was to ask. She didn't tell me at the time,",
                            "tokens": [
                                50364,
                                385,
                                11,
                                5062,
                                257,
                                2685,
                                1329,
                                295,
                                1651,
                                286,
                                390,
                                281,
                                1029,
                                13,
                                1240,
                                994,
                                380,
                                980,
                                385,
                                412,
                                264,
                                565,
                                11,
                                50674
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1231145498887548,
                            "compression_ratio": 1.5826771653543308,
                            "no_speech_prob": 0.013207072392106056
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.2,
                            "end": 11.1,
                            "text": " but the list had come from Andrew Hayward. Earlier I had asked Hayward to go with me for",
                            "tokens": [
                                50674,
                                457,
                                264,
                                1329,
                                632,
                                808,
                                490,
                                10110,
                                8721,
                                1007,
                                13,
                                24552,
                                286,
                                632,
                                2351,
                                8721,
                                1007,
                                281,
                                352,
                                365,
                                385,
                                337,
                                50919
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1231145498887548,
                            "compression_ratio": 1.5826771653543308,
                            "no_speech_prob": 0.013207072392106056
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 11.1,
                            "end": 18.18,
                            "text": " the interview. He had refused. He was heavily into his distancing mode, but I wasn't smart",
                            "tokens": [
                                50919,
                                264,
                                4049,
                                13,
                                634,
                                632,
                                14654,
                                13,
                                634,
                                390,
                                10950,
                                666,
                                702,
                                18567,
                                4391,
                                11,
                                457,
                                286,
                                2067,
                                380,
                                4069,
                                51273
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1231145498887548,
                            "compression_ratio": 1.5826771653543308,
                            "no_speech_prob": 0.013207072392106056
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.18,
                            "end": 21.84,
                            "text": " enough to see it then. I still trusted him.",
                            "tokens": [
                                51273,
                                1547,
                                281,
                                536,
                                309,
                                550,
                                13,
                                286,
                                920,
                                16034,
                                796,
                                13,
                                51456
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1231145498887548,
                            "compression_ratio": 1.5826771653543308,
                            "no_speech_prob": 0.013207072392106056
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 21.84,
                            "end": 26.84,
                            "text": " As I later learned, he had given Betsy the job of making sure I got what management needed",
                            "tokens": [
                                51456,
                                1018,
                                286,
                                1780,
                                3264,
                                11,
                                415,
                                632,
                                2212,
                                49352,
                                88,
                                264,
                                1691,
                                295,
                                1455,
                                988,
                                286,
                                658,
                                437,
                                4592,
                                2978,
                                51706
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1231145498887548,
                            "compression_ratio": 1.5826771653543308,
                            "no_speech_prob": 0.013207072392106056
                        },
                        {
                            "id": 5,
                            "seek": 2684,
                            "start": 26.84,
                            "end": 29.92,
                            "text": " out of Birkett, which was for him to say that he had lied.",
                            "tokens": [
                                50364,
                                484,
                                295,
                                7145,
                                74,
                                3093,
                                11,
                                597,
                                390,
                                337,
                                796,
                                281,
                                584,
                                300,
                                415,
                                632,
                                20101,
                                13,
                                50518
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.37834630012512205,
                            "compression_ratio": 0.9354838709677419,
                            "no_speech_prob": 0.4350876808166504
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8618.50217,
                "result": {
                    "text": " about the chain of custody of the documents and to say it on camera. That's all they wanted out of him. I came to realize that it was never their intention to broadcast at some length. Midway through, Betsy gave me a few extra questions. I knew these had come from Hayward as well, because she had just gotten off the phone with him. The questions turned the interview into a grueling interrogation, forcing Birkett to state over and over that he lied. The interview lasted.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5,
                            "text": " about the chain of custody of the documents and to say it on camera.",
                            "tokens": [
                                50364,
                                466,
                                264,
                                5021,
                                295,
                                26976,
                                295,
                                264,
                                8512,
                                293,
                                281,
                                584,
                                309,
                                322,
                                2799,
                                13,
                                50614
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5,
                            "end": 7.44,
                            "text": " That's all they wanted out of him.",
                            "tokens": [
                                50614,
                                663,
                                311,
                                439,
                                436,
                                1415,
                                484,
                                295,
                                796,
                                13,
                                50736
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 7.44,
                            "end": 11.32,
                            "text": " I came to realize that it was never their intention to broadcast",
                            "tokens": [
                                50736,
                                286,
                                1361,
                                281,
                                4325,
                                300,
                                309,
                                390,
                                1128,
                                641,
                                7789,
                                281,
                                9975,
                                50930
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 11.32,
                            "end": 13.32,
                            "text": " at some length.",
                            "tokens": [
                                50930,
                                412,
                                512,
                                4641,
                                13,
                                51030
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 13.32,
                            "end": 17.16,
                            "text": " Midway through, Betsy gave me a few extra questions.",
                            "tokens": [
                                51030,
                                7033,
                                676,
                                807,
                                11,
                                49352,
                                88,
                                2729,
                                385,
                                257,
                                1326,
                                2857,
                                1651,
                                13,
                                51222
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 17.16,
                            "end": 20.48,
                            "text": " I knew these had come from Hayward as well, because she had just gotten",
                            "tokens": [
                                51222,
                                286,
                                2586,
                                613,
                                632,
                                808,
                                490,
                                8721,
                                1007,
                                382,
                                731,
                                11,
                                570,
                                750,
                                632,
                                445,
                                5768,
                                51388
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 20.48,
                            "end": 22.12,
                            "text": " off the phone with him.",
                            "tokens": [
                                51388,
                                766,
                                264,
                                2593,
                                365,
                                796,
                                13,
                                51470
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 7,
                            "seek": 0,
                            "start": 22.12,
                            "end": 25.6,
                            "text": " The questions turned the interview into a grueling interrogation,",
                            "tokens": [
                                51470,
                                440,
                                1651,
                                3574,
                                264,
                                4049,
                                666,
                                257,
                                677,
                                3483,
                                278,
                                24871,
                                399,
                                11,
                                51644
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 8,
                            "seek": 0,
                            "start": 25.6,
                            "end": 29.12,
                            "text": " forcing Birkett to state over and over that he lied.",
                            "tokens": [
                                51644,
                                19030,
                                7145,
                                74,
                                3093,
                                281,
                                1785,
                                670,
                                293,
                                670,
                                300,
                                415,
                                20101,
                                13,
                                51820
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.1955218985061015,
                            "compression_ratio": 1.6142857142857143,
                            "no_speech_prob": 0.038850244134664536
                        },
                        {
                            "id": 9,
                            "seek": 2912,
                            "start": 29.12,
                            "end": 30.12,
                            "text": " The interview lasted.",
                            "tokens": [
                                50364,
                                440,
                                4049,
                                21116,
                                13,
                                50414
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.5479021753583636,
                            "compression_ratio": 0.7241379310344828,
                            "no_speech_prob": 0.4112829267978668
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8648.50217,
                "result": {
                    "text": " the better part of three hours. After finishing with Birkett, I went to see my daughter in grandson in Texas, while there I was told to report to Andrew Hayward's office at eight p.m. Sunday night. This was the first, the only time any CBS news president had ever given me a direct order. I was due back in New York at 9 a.m. the following morning, but I was told that was not soon enough. I flew back to New York from my command performance. I was told to report to the director of the office at eight p.m. the following morning. I was told to report to the director of the office at eight p.m. the following morning. I was told to report to the director of the office at eight p.m. the following morning. I was told to report to the director of the office at eight p.m. the following morning.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 3.2,
                            "text": " the better part of three hours.",
                            "tokens": [
                                50364,
                                264,
                                1101,
                                644,
                                295,
                                1045,
                                2496,
                                13,
                                50524
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 3.2,
                            "end": 7.28,
                            "text": " After finishing with Birkett, I went to see my daughter in grandson in Texas, while there",
                            "tokens": [
                                50524,
                                2381,
                                12693,
                                365,
                                7145,
                                74,
                                3093,
                                11,
                                286,
                                1437,
                                281,
                                536,
                                452,
                                4653,
                                294,
                                31657,
                                294,
                                7885,
                                11,
                                1339,
                                456,
                                50728
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 7.28,
                            "end": 12.56,
                            "text": " I was told to report to Andrew Hayward's office at eight p.m. Sunday night.",
                            "tokens": [
                                50728,
                                286,
                                390,
                                1907,
                                281,
                                2275,
                                281,
                                10110,
                                8721,
                                1007,
                                311,
                                3398,
                                412,
                                3180,
                                280,
                                13,
                                76,
                                13,
                                7776,
                                1818,
                                13,
                                50992
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.56,
                            "end": 19.04,
                            "text": " This was the first, the only time any CBS news president had ever given me a direct order.",
                            "tokens": [
                                50992,
                                639,
                                390,
                                264,
                                700,
                                11,
                                264,
                                787,
                                565,
                                604,
                                35856,
                                2583,
                                3868,
                                632,
                                1562,
                                2212,
                                385,
                                257,
                                2047,
                                1668,
                                13,
                                51316
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 19.04,
                            "end": 24.12,
                            "text": " I was due back in New York at 9 a.m. the following morning, but I was told that was not soon",
                            "tokens": [
                                51316,
                                286,
                                390,
                                3462,
                                646,
                                294,
                                1873,
                                3609,
                                412,
                                1722,
                                257,
                                13,
                                76,
                                13,
                                264,
                                3480,
                                2446,
                                11,
                                457,
                                286,
                                390,
                                1907,
                                300,
                                390,
                                406,
                                2321,
                                51570
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 24.12,
                            "end": 25.32,
                            "text": " enough.",
                            "tokens": [
                                51570,
                                1547,
                                13,
                                51630
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 25.32,
                            "end": 29.76,
                            "text": " I flew back to New York from my command performance.",
                            "tokens": [
                                51630,
                                286,
                                15728,
                                646,
                                281,
                                1873,
                                3609,
                                490,
                                452,
                                5622,
                                3389,
                                13,
                                51852
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19559239158945635,
                            "compression_ratio": 1.5729537366548043,
                            "no_speech_prob": 0.0019491743296384811
                        },
                        {
                            "id": 7,
                            "seek": 2976,
                            "start": 29.76,
                            "end": 39.760000000000005,
                            "text": " I was told to report to the director of the office at eight p.m. the following morning.",
                            "tokens": [
                                50364,
                                286,
                                390,
                                1907,
                                281,
                                2275,
                                281,
                                264,
                                5391,
                                295,
                                264,
                                3398,
                                412,
                                3180,
                                280,
                                13,
                                76,
                                13,
                                264,
                                3480,
                                2446,
                                13,
                                50864
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.46908354251942735,
                            "compression_ratio": 4.228915662650603,
                            "no_speech_prob": 0.8483805656433105
                        },
                        {
                            "id": 8,
                            "seek": 2976,
                            "start": 39.760000000000005,
                            "end": 45.760000000000005,
                            "text": " I was told to report to the director of the office at eight p.m. the following morning.",
                            "tokens": [
                                50864,
                                286,
                                390,
                                1907,
                                281,
                                2275,
                                281,
                                264,
                                5391,
                                295,
                                264,
                                3398,
                                412,
                                3180,
                                280,
                                13,
                                76,
                                13,
                                264,
                                3480,
                                2446,
                                13,
                                51164
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.46908354251942735,
                            "compression_ratio": 4.228915662650603,
                            "no_speech_prob": 0.8483805656433105
                        },
                        {
                            "id": 9,
                            "seek": 2976,
                            "start": 45.760000000000005,
                            "end": 51.760000000000005,
                            "text": " I was told to report to the director of the office at eight p.m. the following morning.",
                            "tokens": [
                                51164,
                                286,
                                390,
                                1907,
                                281,
                                2275,
                                281,
                                264,
                                5391,
                                295,
                                264,
                                3398,
                                412,
                                3180,
                                280,
                                13,
                                76,
                                13,
                                264,
                                3480,
                                2446,
                                13,
                                51464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.46908354251942735,
                            "compression_ratio": 4.228915662650603,
                            "no_speech_prob": 0.8483805656433105
                        },
                        {
                            "id": 10,
                            "seek": 2976,
                            "start": 51.760000000000005,
                            "end": 57.760000000000005,
                            "text": " I was told to report to the director of the office at eight p.m. the following morning.",
                            "tokens": [
                                51464,
                                286,
                                390,
                                1907,
                                281,
                                2275,
                                281,
                                264,
                                5391,
                                295,
                                264,
                                3398,
                                412,
                                3180,
                                280,
                                13,
                                76,
                                13,
                                264,
                                3480,
                                2446,
                                13,
                                51764
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.46908354251942735,
                            "compression_ratio": 4.228915662650603,
                            "no_speech_prob": 0.8483805656433105
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8678.50217,
                "result": {
                    "text": " Colman arrived, he would tell me that CBS was going to apologize for the documents, and that they expected me to apologize personally as well. I asked, are you going to retract the story? No he said, but we're going to apologize. Said I, well, what exactly are we apologizing about? It was a gentlemanly discussion, but I took the severity of it very seriously. Robert then gave me another loyalty pep talk.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.12,
                            "text": " Colman arrived, he would tell me that CBS was going to apologize for the documents, and",
                            "tokens": [
                                50364,
                                4004,
                                1601,
                                6678,
                                11,
                                415,
                                576,
                                980,
                                385,
                                300,
                                35856,
                                390,
                                516,
                                281,
                                12328,
                                337,
                                264,
                                8512,
                                11,
                                293,
                                50620
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.12,
                            "end": 9.24,
                            "text": " that they expected me to apologize personally as well.",
                            "tokens": [
                                50620,
                                300,
                                436,
                                5176,
                                385,
                                281,
                                12328,
                                5665,
                                382,
                                731,
                                13,
                                50826
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 9.24,
                            "end": 13.24,
                            "text": " I asked, are you going to retract the story?",
                            "tokens": [
                                50826,
                                286,
                                2351,
                                11,
                                366,
                                291,
                                516,
                                281,
                                41107,
                                264,
                                1657,
                                30,
                                51026
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 13.24,
                            "end": 17.16,
                            "text": " No he said, but we're going to apologize.",
                            "tokens": [
                                51026,
                                883,
                                415,
                                848,
                                11,
                                457,
                                321,
                                434,
                                516,
                                281,
                                12328,
                                13,
                                51222
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 17.16,
                            "end": 21.64,
                            "text": " Said I, well, what exactly are we apologizing about?",
                            "tokens": [
                                51222,
                                26490,
                                286,
                                11,
                                731,
                                11,
                                437,
                                2293,
                                366,
                                321,
                                9472,
                                3319,
                                466,
                                30,
                                51446
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 21.64,
                            "end": 27.28,
                            "text": " It was a gentlemanly discussion, but I took the severity of it very seriously.",
                            "tokens": [
                                51446,
                                467,
                                390,
                                257,
                                15761,
                                356,
                                5017,
                                11,
                                457,
                                286,
                                1890,
                                264,
                                35179,
                                295,
                                309,
                                588,
                                6638,
                                13,
                                51728
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.277278659218236,
                            "compression_ratio": 1.6044444444444443,
                            "no_speech_prob": 0.013443546369671822
                        },
                        {
                            "id": 6,
                            "seek": 2728,
                            "start": 27.28,
                            "end": 29.96,
                            "text": " Robert then gave me another loyalty pep talk.",
                            "tokens": [
                                50364,
                                7977,
                                550,
                                2729,
                                385,
                                1071,
                                22831,
                                520,
                                79,
                                751,
                                13,
                                50498
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.562585500570444,
                            "compression_ratio": 0.8823529411764706,
                            "no_speech_prob": 0.658682644367218
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8708.50217,
                "result": {
                    "text": " He said, Dan, we need to stick together. You have always shown great allegiance to the institution, and this is about saving the institution. The company wants CBS News to come out of this as well as we can, and we want you to come out of this as well as you can too. Surely you must regret what has happened. I said, of course, I regret that we're under attack, and that it's giving us a mountain of bad publicity. That's why it's so important to defend this story.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 3.7,
                            "text": " He said, Dan, we need to stick together.",
                            "tokens": [
                                50364,
                                634,
                                848,
                                11,
                                3394,
                                11,
                                321,
                                643,
                                281,
                                2897,
                                1214,
                                13,
                                50549
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 3.7,
                            "end": 8.620000000000001,
                            "text": " You have always shown great allegiance to the institution, and this is about saving the",
                            "tokens": [
                                50549,
                                509,
                                362,
                                1009,
                                4898,
                                869,
                                44706,
                                281,
                                264,
                                7818,
                                11,
                                293,
                                341,
                                307,
                                466,
                                6816,
                                264,
                                50795
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 8.620000000000001,
                            "end": 10.3,
                            "text": " institution.",
                            "tokens": [
                                50795,
                                7818,
                                13,
                                50879
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 10.3,
                            "end": 14.9,
                            "text": " The company wants CBS News to come out of this as well as we can, and we want you to come",
                            "tokens": [
                                50879,
                                440,
                                2237,
                                2738,
                                35856,
                                7987,
                                281,
                                808,
                                484,
                                295,
                                341,
                                382,
                                731,
                                382,
                                321,
                                393,
                                11,
                                293,
                                321,
                                528,
                                291,
                                281,
                                808,
                                51109
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 14.9,
                            "end": 17.900000000000002,
                            "text": " out of this as well as you can too.",
                            "tokens": [
                                51109,
                                484,
                                295,
                                341,
                                382,
                                731,
                                382,
                                291,
                                393,
                                886,
                                13,
                                51259
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 17.900000000000002,
                            "end": 19.82,
                            "text": " Surely you must regret what has happened.",
                            "tokens": [
                                51259,
                                29803,
                                291,
                                1633,
                                10879,
                                437,
                                575,
                                2011,
                                13,
                                51355
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 19.82,
                            "end": 25.060000000000002,
                            "text": " I said, of course, I regret that we're under attack, and that it's giving us a mountain",
                            "tokens": [
                                51355,
                                286,
                                848,
                                11,
                                295,
                                1164,
                                11,
                                286,
                                10879,
                                300,
                                321,
                                434,
                                833,
                                2690,
                                11,
                                293,
                                300,
                                309,
                                311,
                                2902,
                                505,
                                257,
                                6937,
                                51617
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 7,
                            "seek": 0,
                            "start": 25.060000000000002,
                            "end": 27.3,
                            "text": " of bad publicity.",
                            "tokens": [
                                51617,
                                295,
                                1578,
                                37264,
                                13,
                                51729
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20034975710168348,
                            "compression_ratio": 1.6938775510204083,
                            "no_speech_prob": 0.19024042785167694
                        },
                        {
                            "id": 8,
                            "seek": 2730,
                            "start": 27.3,
                            "end": 29.3,
                            "text": " That's why it's so important to defend this story.",
                            "tokens": [
                                50364,
                                663,
                                311,
                                983,
                                309,
                                311,
                                370,
                                1021,
                                281,
                                8602,
                                341,
                                1657,
                                13,
                                50464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.332905642191569,
                            "compression_ratio": 0.9259259259259259,
                            "no_speech_prob": 0.45832160115242004
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8738.50217,
                "result": {
                    "text": " He said, we're asking you to apologize. You need to do this for the good of CBS News and for your own good. Hayward also told me that the network was going to announce the establishment of an outside commission to investigate what happened. I told him immediately that this was a bad idea. We hadn't done it during the McCarthy era, during our civil rights broadcast, or after sustaining heavy criticism about either the selling of the Pentagon or",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.6000000000000005,
                            "text": " He said, we're asking you to apologize. You need to do this for the good of CBS News",
                            "tokens": [
                                50364,
                                634,
                                848,
                                11,
                                321,
                                434,
                                3365,
                                291,
                                281,
                                12328,
                                13,
                                509,
                                643,
                                281,
                                360,
                                341,
                                337,
                                264,
                                665,
                                295,
                                35856,
                                7987,
                                50694
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16642957205300804,
                            "compression_ratio": 1.5222672064777327,
                            "no_speech_prob": 0.057980120182037354
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.6000000000000005,
                            "end": 9,
                            "text": " and for your own good.",
                            "tokens": [
                                50694,
                                293,
                                337,
                                428,
                                1065,
                                665,
                                13,
                                50814
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16642957205300804,
                            "compression_ratio": 1.5222672064777327,
                            "no_speech_prob": 0.057980120182037354
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 9,
                            "end": 13.68,
                            "text": " Hayward also told me that the network was going to announce the establishment of an outside",
                            "tokens": [
                                50814,
                                8721,
                                1007,
                                611,
                                1907,
                                385,
                                300,
                                264,
                                3209,
                                390,
                                516,
                                281,
                                7478,
                                264,
                                20971,
                                295,
                                364,
                                2380,
                                51048
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16642957205300804,
                            "compression_ratio": 1.5222672064777327,
                            "no_speech_prob": 0.057980120182037354
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 13.68,
                            "end": 20.080000000000002,
                            "text": " commission to investigate what happened. I told him immediately that this was a bad idea.",
                            "tokens": [
                                51048,
                                9221,
                                281,
                                15013,
                                437,
                                2011,
                                13,
                                286,
                                1907,
                                796,
                                4258,
                                300,
                                341,
                                390,
                                257,
                                1578,
                                1558,
                                13,
                                51368
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16642957205300804,
                            "compression_ratio": 1.5222672064777327,
                            "no_speech_prob": 0.057980120182037354
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 20.080000000000002,
                            "end": 25.48,
                            "text": " We hadn't done it during the McCarthy era, during our civil rights broadcast, or after",
                            "tokens": [
                                51368,
                                492,
                                8782,
                                380,
                                1096,
                                309,
                                1830,
                                264,
                                44085,
                                4249,
                                11,
                                1830,
                                527,
                                5605,
                                4601,
                                9975,
                                11,
                                420,
                                934,
                                51638
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.16642957205300804,
                            "compression_ratio": 1.5222672064777327,
                            "no_speech_prob": 0.057980120182037354
                        },
                        {
                            "id": 5,
                            "seek": 2548,
                            "start": 25.48,
                            "end": 29.96,
                            "text": " sustaining heavy criticism about either the selling of the Pentagon or",
                            "tokens": [
                                50364,
                                49097,
                                4676,
                                15835,
                                466,
                                2139,
                                264,
                                6511,
                                295,
                                264,
                                36371,
                                420,
                                50588
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.20830018179757254,
                            "compression_ratio": 1.0144927536231885,
                            "no_speech_prob": 0.6514343023300171
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8768.50217,
                "result": {
                    "text": " The Uncounted Enemy. The Uncounted Enemy was a documentary that aired at the beginning of 1982. It had been put together by Mike Wallace and George Quail, two excellent reporters, but it was revealed that had some ethics and editing issues. At the time, CBS News conducted its own internal investigation in that case. While investigators said the reporting and editing process had flaws, the story was true.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 2.68,
                            "text": " The Uncounted Enemy.",
                            "tokens": [
                                50364,
                                440,
                                1156,
                                26050,
                                292,
                                48886,
                                13,
                                50498
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 2.68,
                            "end": 7.8,
                            "text": " The Uncounted Enemy was a documentary that aired at the beginning of 1982.",
                            "tokens": [
                                50498,
                                440,
                                1156,
                                26050,
                                292,
                                48886,
                                390,
                                257,
                                15674,
                                300,
                                34503,
                                412,
                                264,
                                2863,
                                295,
                                31352,
                                13,
                                50754
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 7.8,
                            "end": 12.48,
                            "text": " It had been put together by Mike Wallace and George Quail, two excellent reporters, but",
                            "tokens": [
                                50754,
                                467,
                                632,
                                668,
                                829,
                                1214,
                                538,
                                6602,
                                32626,
                                293,
                                7136,
                                2326,
                                864,
                                11,
                                732,
                                7103,
                                26249,
                                11,
                                457,
                                50988
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 12.48,
                            "end": 16.76,
                            "text": " it was revealed that had some ethics and editing issues.",
                            "tokens": [
                                50988,
                                309,
                                390,
                                9599,
                                300,
                                632,
                                512,
                                19769,
                                293,
                                10000,
                                2663,
                                13,
                                51202
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 16.76,
                            "end": 22.48,
                            "text": " At the time, CBS News conducted its own internal investigation in that case.",
                            "tokens": [
                                51202,
                                1711,
                                264,
                                565,
                                11,
                                35856,
                                7987,
                                13809,
                                1080,
                                1065,
                                6920,
                                9627,
                                294,
                                300,
                                1389,
                                13,
                                51488
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 22.48,
                            "end": 29.400000000000002,
                            "text": " While investigators said the reporting and editing process had flaws, the story was true.",
                            "tokens": [
                                51488,
                                3987,
                                27079,
                                848,
                                264,
                                10031,
                                293,
                                10000,
                                1399,
                                632,
                                27108,
                                11,
                                264,
                                1657,
                                390,
                                2074,
                                13,
                                51834
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.24888068437576294,
                            "compression_ratio": 1.583657587548638,
                            "no_speech_prob": 0.014557951129972935
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8798.50217,
                "result": {
                    "text": " V.S. topped a bottom, stood by it, and defended it, including defending it in court. But that was then, Paley was in charge. This was now Redstone was in charge. A lot had changed since then. He would tell me. In today's climate, the outside review was necessary. He assured me that the commission would be truly independent, and that the impartial individuals on it would be appointed by court.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 7.2,
                            "text": " V.S. topped a bottom, stood by it, and defended it, including defending it in court.",
                            "tokens": [
                                50364,
                                691,
                                13,
                                50,
                                13,
                                38781,
                                257,
                                2767,
                                11,
                                9371,
                                538,
                                309,
                                11,
                                293,
                                34135,
                                309,
                                11,
                                3009,
                                21377,
                                309,
                                294,
                                4753,
                                13,
                                50724
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23183880495221426,
                            "compression_ratio": 1.5868544600938967,
                            "no_speech_prob": 0.053253427147865295
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 7.2,
                            "end": 15,
                            "text": " But that was then, Paley was in charge. This was now Redstone was in charge. A lot",
                            "tokens": [
                                50724,
                                583,
                                300,
                                390,
                                550,
                                11,
                                430,
                                29172,
                                390,
                                294,
                                4602,
                                13,
                                639,
                                390,
                                586,
                                4477,
                                11243,
                                390,
                                294,
                                4602,
                                13,
                                316,
                                688,
                                51114
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23183880495221426,
                            "compression_ratio": 1.5868544600938967,
                            "no_speech_prob": 0.053253427147865295
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 15,
                            "end": 21.48,
                            "text": " had changed since then. He would tell me. In today's climate, the outside review was",
                            "tokens": [
                                51114,
                                632,
                                3105,
                                1670,
                                550,
                                13,
                                634,
                                576,
                                980,
                                385,
                                13,
                                682,
                                965,
                                311,
                                5659,
                                11,
                                264,
                                2380,
                                3131,
                                390,
                                51438
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23183880495221426,
                            "compression_ratio": 1.5868544600938967,
                            "no_speech_prob": 0.053253427147865295
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 21.48,
                            "end": 26.96,
                            "text": " necessary. He assured me that the commission would be truly independent, and that the",
                            "tokens": [
                                51438,
                                4818,
                                13,
                                634,
                                23426,
                                385,
                                300,
                                264,
                                9221,
                                576,
                                312,
                                4908,
                                6695,
                                11,
                                293,
                                300,
                                264,
                                51712
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.23183880495221426,
                            "compression_ratio": 1.5868544600938967,
                            "no_speech_prob": 0.053253427147865295
                        },
                        {
                            "id": 4,
                            "seek": 2696,
                            "start": 26.96,
                            "end": 29.96,
                            "text": " impartial individuals on it would be appointed by court.",
                            "tokens": [
                                50364,
                                32177,
                                831,
                                5346,
                                322,
                                309,
                                576,
                                312,
                                17653,
                                538,
                                4753,
                                13,
                                50514
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.18732290608542307,
                            "compression_ratio": 0.9333333333333333,
                            "no_speech_prob": 0.23251627385616302
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8828.50217,
                "result": {
                    "text": " After thinking about it overnight, I agreed to be the one to read the corporate speech of contrition, and also my own Miyakopo. Andrew Hayward wrote it for me at my secretary's computer. On September 20th, I delivered the official CBS apology and a separate one of my own. I said, I made a mistake. I didn't ask enough of the right questions, and I trusted the source who changed his story. It turns out he-",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.5600000000000005,
                            "text": " After thinking about it overnight, I agreed to be the one to read the corporate speech",
                            "tokens": [
                                50364,
                                2381,
                                1953,
                                466,
                                309,
                                13935,
                                11,
                                286,
                                9166,
                                281,
                                312,
                                264,
                                472,
                                281,
                                1401,
                                264,
                                10896,
                                6218,
                                50642
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.18869638442993164,
                            "compression_ratio": 1.4895397489539748,
                            "no_speech_prob": 0.0027918294072151184
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.5600000000000005,
                            "end": 12.32,
                            "text": " of contrition, and also my own Miyakopo. Andrew Hayward wrote it for me at my secretary's",
                            "tokens": [
                                50642,
                                295,
                                10273,
                                849,
                                11,
                                293,
                                611,
                                452,
                                1065,
                                26195,
                                18501,
                                2259,
                                13,
                                10110,
                                8721,
                                1007,
                                4114,
                                309,
                                337,
                                385,
                                412,
                                452,
                                15691,
                                311,
                                50980
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.18869638442993164,
                            "compression_ratio": 1.4895397489539748,
                            "no_speech_prob": 0.0027918294072151184
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 12.32,
                            "end": 18.92,
                            "text": " computer. On September 20th, I delivered the official CBS apology and a separate one of",
                            "tokens": [
                                50980,
                                3820,
                                13,
                                1282,
                                7216,
                                945,
                                392,
                                11,
                                286,
                                10144,
                                264,
                                4783,
                                35856,
                                28006,
                                293,
                                257,
                                4994,
                                472,
                                295,
                                51310
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.18869638442993164,
                            "compression_ratio": 1.4895397489539748,
                            "no_speech_prob": 0.0027918294072151184
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.92,
                            "end": 26.080000000000002,
                            "text": " my own. I said, I made a mistake. I didn't ask enough of the right questions, and I trusted",
                            "tokens": [
                                51310,
                                452,
                                1065,
                                13,
                                286,
                                848,
                                11,
                                286,
                                1027,
                                257,
                                6146,
                                13,
                                286,
                                994,
                                380,
                                1029,
                                1547,
                                295,
                                264,
                                558,
                                1651,
                                11,
                                293,
                                286,
                                16034,
                                51668
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.18869638442993164,
                            "compression_ratio": 1.4895397489539748,
                            "no_speech_prob": 0.0027918294072151184
                        },
                        {
                            "id": 4,
                            "seek": 2608,
                            "start": 26.08,
                            "end": 29.959999999999997,
                            "text": " the source who changed his story. It turns out he-",
                            "tokens": [
                                50364,
                                264,
                                4009,
                                567,
                                3105,
                                702,
                                1657,
                                13,
                                467,
                                4523,
                                484,
                                415,
                                12,
                                50558
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.4420597076416016,
                            "compression_ratio": 0.8620689655172413,
                            "no_speech_prob": 0.49665510654449463
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8858.50217,
                "result": {
                    "text": " misled us. There are no excuses, and I'm sorry for it. I didn't feel good about it going in, while I was reading it, or after I'd finished. They used the interview with Bill Birkett in the same broadcast, cutting it down to just the snippets where he said that he lied. On September 22nd at 10.01 in the morning, I was in a car being driven from a public appearance. I took a call from Andrew Hayward. He said...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 7,
                            "text": " misled us. There are no excuses, and I'm sorry for it. I didn't feel good about it going",
                            "tokens": [
                                50364,
                                3346,
                                1493,
                                505,
                                13,
                                821,
                                366,
                                572,
                                24666,
                                11,
                                293,
                                286,
                                478,
                                2597,
                                337,
                                309,
                                13,
                                286,
                                994,
                                380,
                                841,
                                665,
                                466,
                                309,
                                516,
                                50714
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19013967417707348,
                            "compression_ratio": 1.5063829787234042,
                            "no_speech_prob": 0.011488473042845726
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 7,
                            "end": 12.92,
                            "text": " in, while I was reading it, or after I'd finished. They used the interview with Bill",
                            "tokens": [
                                50714,
                                294,
                                11,
                                1339,
                                286,
                                390,
                                3760,
                                309,
                                11,
                                420,
                                934,
                                286,
                                1116,
                                4335,
                                13,
                                814,
                                1143,
                                264,
                                4049,
                                365,
                                5477,
                                51010
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19013967417707348,
                            "compression_ratio": 1.5063829787234042,
                            "no_speech_prob": 0.011488473042845726
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 12.92,
                            "end": 18.2,
                            "text": " Birkett in the same broadcast, cutting it down to just the snippets where he said that",
                            "tokens": [
                                51010,
                                7145,
                                74,
                                3093,
                                294,
                                264,
                                912,
                                9975,
                                11,
                                6492,
                                309,
                                760,
                                281,
                                445,
                                264,
                                35623,
                                1385,
                                689,
                                415,
                                848,
                                300,
                                51274
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19013967417707348,
                            "compression_ratio": 1.5063829787234042,
                            "no_speech_prob": 0.011488473042845726
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 18.2,
                            "end": 25.48,
                            "text": " he lied. On September 22nd at 10.01 in the morning, I was in a car being driven from a public",
                            "tokens": [
                                51274,
                                415,
                                20101,
                                13,
                                1282,
                                7216,
                                5853,
                                273,
                                412,
                                1266,
                                13,
                                10607,
                                294,
                                264,
                                2446,
                                11,
                                286,
                                390,
                                294,
                                257,
                                1032,
                                885,
                                9555,
                                490,
                                257,
                                1908,
                                51638
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19013967417707348,
                            "compression_ratio": 1.5063829787234042,
                            "no_speech_prob": 0.011488473042845726
                        },
                        {
                            "id": 4,
                            "seek": 2548,
                            "start": 25.48,
                            "end": 29.98,
                            "text": " appearance. I took a call from Andrew Hayward. He said...",
                            "tokens": [
                                50364,
                                8967,
                                13,
                                286,
                                1890,
                                257,
                                818,
                                490,
                                10110,
                                8721,
                                1007,
                                13,
                                634,
                                848,
                                485,
                                50589
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.31260400659897747,
                            "compression_ratio": 0.890625,
                            "no_speech_prob": 0.2757108211517334
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8888.50217,
                "result": {
                    "text": " This is to inform you that we have appointed an Indicmented Commission. It's going to be led by Richard Thornberg. I slammed my fist down on the dashboard so hard I hurt my hand. I let out a string of expertise best left deleted. Andrew, I said loudly, this is insane. Richard Thornberg had been the U.S. Attorney General first under Ronald Reagan and then under George H.W. Bush. He still...",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 5.5200000000000005,
                            "text": " This is to inform you that we have appointed an Indicmented Commission. It's going to be",
                            "tokens": [
                                50364,
                                639,
                                307,
                                281,
                                1356,
                                291,
                                300,
                                321,
                                362,
                                17653,
                                364,
                                2333,
                                299,
                                14684,
                                10766,
                                13,
                                467,
                                311,
                                516,
                                281,
                                312,
                                50640
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22457417197849439,
                            "compression_ratio": 1.5344827586206897,
                            "no_speech_prob": 0.1207033172249794
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 5.5200000000000005,
                            "end": 12.84,
                            "text": " led by Richard Thornberg. I slammed my fist down on the dashboard so hard I hurt my hand.",
                            "tokens": [
                                50640,
                                4684,
                                538,
                                9809,
                                334,
                                1865,
                                6873,
                                13,
                                286,
                                50196,
                                452,
                                21849,
                                760,
                                322,
                                264,
                                18342,
                                370,
                                1152,
                                286,
                                4607,
                                452,
                                1011,
                                13,
                                51006
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22457417197849439,
                            "compression_ratio": 1.5344827586206897,
                            "no_speech_prob": 0.1207033172249794
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 12.84,
                            "end": 22.44,
                            "text": " I let out a string of expertise best left deleted. Andrew, I said loudly, this is insane.",
                            "tokens": [
                                51006,
                                286,
                                718,
                                484,
                                257,
                                6798,
                                295,
                                11769,
                                1151,
                                1411,
                                22981,
                                13,
                                10110,
                                11,
                                286,
                                848,
                                22958,
                                11,
                                341,
                                307,
                                10838,
                                13,
                                51486
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22457417197849439,
                            "compression_ratio": 1.5344827586206897,
                            "no_speech_prob": 0.1207033172249794
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 22.44,
                            "end": 27.18,
                            "text": " Richard Thornberg had been the U.S. Attorney General first under Ronald Reagan and then",
                            "tokens": [
                                51486,
                                9809,
                                334,
                                1865,
                                6873,
                                632,
                                668,
                                264,
                                624,
                                13,
                                50,
                                13,
                                23283,
                                6996,
                                700,
                                833,
                                27397,
                                26534,
                                293,
                                550,
                                51723
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22457417197849439,
                            "compression_ratio": 1.5344827586206897,
                            "no_speech_prob": 0.1207033172249794
                        },
                        {
                            "id": 4,
                            "seek": 2718,
                            "start": 27.18,
                            "end": 30.02,
                            "text": " under George H.W. Bush. He still...",
                            "tokens": [
                                50364,
                                833,
                                7136,
                                389,
                                13,
                                54,
                                13,
                                15782,
                                13,
                                634,
                                920,
                                485,
                                50506
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.38861502919878277,
                            "compression_ratio": 0.813953488372093,
                            "no_speech_prob": 0.7535830140113831
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8918.50217,
                "result": {
                    "text": " had close ties to the Bush family. CBS had tapped Thornberg, a Republican lawyer from Bush's cabinet, to investigate whether his own former boss and close personal friend, had used undue influence to get his son into the Texas Air National Guard. It was the next best thing to ask Bush to investigate himself. I asked Andrew exactly what is independent at him partial about this.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 6.96,
                            "text": " had close ties to the Bush family. CBS had tapped Thornberg, a Republican lawyer from Bush's",
                            "tokens": [
                                50364,
                                632,
                                1998,
                                14039,
                                281,
                                264,
                                15782,
                                1605,
                                13,
                                35856,
                                632,
                                38693,
                                334,
                                1865,
                                6873,
                                11,
                                257,
                                10937,
                                11613,
                                490,
                                15782,
                                311,
                                50712
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19459659297291826,
                            "compression_ratio": 1.5236051502145922,
                            "no_speech_prob": 0.01143663004040718
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 6.96,
                            "end": 13.4,
                            "text": " cabinet, to investigate whether his own former boss and close personal friend, had used",
                            "tokens": [
                                50712,
                                15188,
                                11,
                                281,
                                15013,
                                1968,
                                702,
                                1065,
                                5819,
                                5741,
                                293,
                                1998,
                                2973,
                                1277,
                                11,
                                632,
                                1143,
                                51034
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19459659297291826,
                            "compression_ratio": 1.5236051502145922,
                            "no_speech_prob": 0.01143663004040718
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 13.4,
                            "end": 19.8,
                            "text": " undue influence to get his son into the Texas Air National Guard. It was the next best",
                            "tokens": [
                                51034,
                                674,
                                622,
                                6503,
                                281,
                                483,
                                702,
                                1872,
                                666,
                                264,
                                7885,
                                5774,
                                4862,
                                11549,
                                13,
                                467,
                                390,
                                264,
                                958,
                                1151,
                                51354
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19459659297291826,
                            "compression_ratio": 1.5236051502145922,
                            "no_speech_prob": 0.01143663004040718
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 19.8,
                            "end": 27.76,
                            "text": " thing to ask Bush to investigate himself. I asked Andrew exactly what is independent at",
                            "tokens": [
                                51354,
                                551,
                                281,
                                1029,
                                15782,
                                281,
                                15013,
                                3647,
                                13,
                                286,
                                2351,
                                10110,
                                2293,
                                437,
                                307,
                                6695,
                                412,
                                51752
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.19459659297291826,
                            "compression_ratio": 1.5236051502145922,
                            "no_speech_prob": 0.01143663004040718
                        },
                        {
                            "id": 4,
                            "seek": 2776,
                            "start": 27.76,
                            "end": 29.76,
                            "text": " him partial about this.",
                            "tokens": [
                                50364,
                                796,
                                14641,
                                466,
                                341,
                                13,
                                50464
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.6581874489784241,
                            "compression_ratio": 0.7419354838709677,
                            "no_speech_prob": 0.5595650672912598
                        }
                    ],
                    "language": "en"
                }
            },
            {
                "current_time": 8948.50217,
                "result": {
                    "text": " He said, Cooley, Dan, you don't understand. This is a masterstroke of genius. Dick Thornberg has credibility with the Bush people and the right wing, and with everyone who is giving us a hard time. Andrew was very calm, which I was not. I shouted. Of course he has credibility with them. He is them. Andrew said, Dan, this is a courtesy call. The announcement has just been made.",
                    "segments": [
                        {
                            "id": 0,
                            "seek": 0,
                            "start": 0,
                            "end": 4.16,
                            "text": " He said, Cooley, Dan, you don't understand.",
                            "tokens": [
                                50364,
                                634,
                                848,
                                11,
                                383,
                                1986,
                                3420,
                                11,
                                3394,
                                11,
                                291,
                                500,
                                380,
                                1223,
                                13,
                                50572
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 1,
                            "seek": 0,
                            "start": 4.16,
                            "end": 6.68,
                            "text": " This is a masterstroke of genius.",
                            "tokens": [
                                50572,
                                639,
                                307,
                                257,
                                4505,
                                42706,
                                295,
                                14017,
                                13,
                                50698
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 2,
                            "seek": 0,
                            "start": 6.68,
                            "end": 11.040000000000001,
                            "text": " Dick Thornberg has credibility with the Bush people and the right wing, and with",
                            "tokens": [
                                50698,
                                18754,
                                334,
                                1865,
                                6873,
                                575,
                                28852,
                                365,
                                264,
                                15782,
                                561,
                                293,
                                264,
                                558,
                                11162,
                                11,
                                293,
                                365,
                                50916
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 3,
                            "seek": 0,
                            "start": 11.040000000000001,
                            "end": 14.76,
                            "text": " everyone who is giving us a hard time.",
                            "tokens": [
                                50916,
                                1518,
                                567,
                                307,
                                2902,
                                505,
                                257,
                                1152,
                                565,
                                13,
                                51102
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 4,
                            "seek": 0,
                            "start": 14.76,
                            "end": 18.080000000000002,
                            "text": " Andrew was very calm, which I was not.",
                            "tokens": [
                                51102,
                                10110,
                                390,
                                588,
                                7151,
                                11,
                                597,
                                286,
                                390,
                                406,
                                13,
                                51268
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 5,
                            "seek": 0,
                            "start": 18.080000000000002,
                            "end": 19.080000000000002,
                            "text": " I shouted.",
                            "tokens": [
                                51268,
                                286,
                                37310,
                                13,
                                51318
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 6,
                            "seek": 0,
                            "start": 19.080000000000002,
                            "end": 22.12,
                            "text": " Of course he has credibility with them.",
                            "tokens": [
                                51318,
                                2720,
                                1164,
                                415,
                                575,
                                28852,
                                365,
                                552,
                                13,
                                51470
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 7,
                            "seek": 0,
                            "start": 22.12,
                            "end": 24.76,
                            "text": " He is them.",
                            "tokens": [
                                51470,
                                634,
                                307,
                                552,
                                13,
                                51602
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 8,
                            "seek": 0,
                            "start": 24.76,
                            "end": 28.32,
                            "text": " Andrew said, Dan, this is a courtesy call.",
                            "tokens": [
                                51602,
                                10110,
                                848,
                                11,
                                3394,
                                11,
                                341,
                                307,
                                257,
                                41704,
                                818,
                                13,
                                51780
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.22936155245854303,
                            "compression_ratio": 1.5833333333333333,
                            "no_speech_prob": 0.046059753745794296
                        },
                        {
                            "id": 9,
                            "seek": 2832,
                            "start": 28.32,
                            "end": 30,
                            "text": " The announcement has just been made.",
                            "tokens": [
                                50364,
                                440,
                                12847,
                                575,
                                445,
                                668,
                                1027,
                                13,
                                50448
                            ],
                            "temperature": 0,
                            "avg_logprob": -0.4025252819061279,
                            "compression_ratio": 0.8181818181818182,
                            "no_speech_prob": 0.16988587379455566
                        }
                    ],
                    "language": "en"
                }
            }
        ])
        // newSocket.emit('scroll-to-text', {
        //     current_time: time,
        //     audio_duration: audioDuration,
        //     file_name: audioFile.name
        // });
    }, [currentTime, audioDuration, audioFile]);

    const audioData = useMemo(() => {
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
            console.log(pdfText)
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
                    <button type="button" onClick={() => scrollToHighlight()} className="bg-blue-500 text-white py-2 px-4 rounded">Scroll to highlight</button>
                    <AudioPlayer
                        ref={audioPlayerRef}
                        src={audioData}
                        controls={true}
                        listenInterval={100}
                        showJumpControls={false}
                        customAdditionalControls={[]}
                        onListen={handleTimeUpdate}
                        onSeeked={handleSeeked}
                        // time={currentTime}
                        // onPlay={handlePlaying}
                        // onPause={handlePause}
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
                    <button type="button" onClick={() => scrollToText()} className="bg-blue-500 text-white py-2 px-4 rounded">Scroll To Text</button>
                    <button type="button" id="capture" className="bg-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded" onClick={() => captureTimestamp()}>Capture Timestamp</button>
                    <button type="button" className="bg-blue-500 text-white py-2 px-4 rounded" onClick={() => { setTimeStamps([]); setData([]); setTranscription([]); setSearches([]); setTimestampsFile(null); document.getElementById("timestamps-file").value = null; setIsCaputed(false) }}>Clear Data Table</button>

                </form>
                <PDFReader ebookFile={ebookFile} setSearches={setSearches} searches={searches} transcription={transcription} allDone={allDone} setAllDone={setAllDone} pdfText={pdfText} setPdfText={setPdfText} segmentsText={segmentsText} setNumPages={setNumPages} numPages={numPages} />

                <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} isCaputed={isCaputed} />
            </div>
        </>
    );
}

export default Player;

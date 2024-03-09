import React, { useEffect, useMemo, useState } from "react";
import AudioPlayer from "react-audio-player";
import FileInput from "../components/FileInput";
import TimestampsFileInput from "../components/TimestampsFileInput";
import mp3Slice from "mp3-slice";
import audioBufferSlice from 'audiobuffer-slice';
import kmp_matcher from 'kmp-matcher';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from "react-router-dom";
import PDFReader from "../components/PDFReader";
import io from 'socket.io-client';


function Home() {
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
  const [isCaputed, setIsCaputed] = useState(false);
  const [data, setData] = useState([]);
  const [segmentsText, setSegmentsText] = useState([]);
  const [numPages, setNumPages] = useState(null);

  const socketURL = "http://16.171.42.93:5111"

  // const socketURL = "http://13.51.205.166:5111"

  const [newSocket, setNewSocket] = useState(null)
  useEffect(() => {// Establish socket connection
    setNewSocket(io(socketURL, { reconnection: true }))
  }, []);

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
        console.log(data);
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

      // Cleanup when the component is unmounted
      return () => {
        // newSocket.disconnect();
        newSocket.off('message', handleTranscriptionUpdate);
        newSocket.off('transcription_update', handleTranscriptionUpdate);
      };
    }

  }, [newSocket])
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
          if (searchTerm.text != "") {
            const result = await searchPDF(allPageText, searchTerm.text);
            return result;
          }
          else {
            return 'Search Term is empty';
          }
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



  const handleAudioFileChange = (event) => {
    setAudioFile(event.target.files[0]);

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

  const transcribe = async () => {
    if (audioFile) {
      if (timeStamps.length === 0) {
        toast.error("Please add time stamps")
        return
      }
      const formData = new FormData();
      // formData.append('file', audioFile);
      formData.append('fileName', audioFile.name);
      formData.append('timeStamps', timeStamps);
      formData.append('audioDuration', audioDuration);
      formData.append('offset', offset);
      formData.append('duration', duration);
      formData.append('timeStampsType', timeStampsType);
      formData.append('capturedTime', "false");

      const checkFileFormData = new FormData();
      checkFileFormData.append('fileName', audioFile.name);
      // const res = await fetch('http://13.51.205.166:5111/upload', {
      // const res = await fetch('http://127.0.0.1:5000/upload', {
      setTranscription([])
      setSearches([])

      // Show uploading toast


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
              success: 'Process Completed!',
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
      <Link to="/player" className="text-white   bg-blue-500 px-4 py-2  ">Go to player</Link>

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
                checked={timeStampsType === 'end'}
                onChange={handleRadioChange}
              />
              <label htmlFor="end"> Duration from the End</label>
            </div>
            <div className="flex gap-2 items-center">
              <input
                // scp -i ./firstEC2.pem -r E:\Develpements\Soft Enterprise Tasks\Freelancer's tasks\Audiobook to text notes\whisper transcription flask ubuntu@51.20.183.130:/home/ubuntu/

                type="radio"
                name="timeStamps_type"
                id="start"
                checked={timeStampsType === 'start'}
                onChange={handleRadioChange}
              />
              <label htmlFor="start"> Duration from the Start</label>
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
          {console.log(transcription)}
          <AudioPlayer
            src={audioFile != null && URL.createObjectURL(audioFile)}
            controls={true}
            showJumpControls={false}
            customAdditionalControls={[]}
            style={{ width: "100%" }}
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

          <button type="button" onClick={() => transcribe()} className="bg-blue-500 text-white py-2 px-4 rounded">Transcribe audio</button>


        </form>
        <PDFReader ebookFile={ebookFile} setSearches={setSearches} searches={searches} transcription={transcription} allDone={allDone} setAllDone={setAllDone} pdfText={pdfText} setPdfText={setPdfText} segmentsText={segmentsText} setNumPages={setNumPages} numPages={numPages} />


        {/* <ToastContainer /> */}
      </div>
      <TimestampsFileInput handleFileChange={handleTimestampsFileChange} timestampsFile={timestampsFile} setTimeStamps={setTimeStamps} transcription={transcription} searches={searches} setData={setData} data={data} timeStamps={timeStamps} setIsCaputed={setIsCaputed} isCaputed={isCaputed} />
    </>

  );
}

export default Home;



// 
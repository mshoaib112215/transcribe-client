import React, { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer from "react-audio-player";
import audio from '../assets/20_second.mp3'

const MemorizedAudioPlayer = React.memo(({ audioFile, handlePlaying, handlePause, handleSeeked }) => {
    const audioPlayerRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);

    const handleTimeUpdate = (time) => {
        setCurrentTime(time);
    };

    
    const audioData = useMemo(() => {
        return audioFile != null ? URL.createObjectURL(audioFile) : null;
    }, [audioFile]);
    return (
        <AudioPlayer
            ref={audioPlayerRef}
            // src={audio.src}
            src={audioData}
            controls={true}
            listenInterval={500}
            showJumpControls={false}
            customAdditionalControls={[]}
            onListen={handleTimeUpdate}
            onSeeked={handleSeeked}
            time={currentTime}
            onPlay={handlePlaying}
            onPause={handlePause}
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
    );
});

export default MemorizedAudioPlayer;
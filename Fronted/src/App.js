


import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { FaMicrophone, FaStop } from "react-icons/fa";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const socket = io("http://127.0.0.1:5000"); // Flask WebSocket

function App() {
  const [emotion, setEmotion] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [recording, setRecording] = useState(false);
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recommendations, setRecommendations] = useState({ music: "", video: "", activity: "" });
  const [amlRecommendations, setAmlRecommendations] = useState({ action: "", resource: "", resource_link: "" });
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Speech-to-Text
  const { transcript, resetTranscript } = useSpeechRecognition();

  // Check if SpeechRecognition is supported
  const isSpeechSupported = SpeechRecognition.browserSupportsSpeechRecognition();

  // Audio Visualizer State
  const canvasRef = useRef(null);
  const [isVisualizerActive, setIsVisualizerActive] = useState(false);

  // WebSocket connection status
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("emotion_result", (data) => {
      setEmotion(data.emotion);
      setConfidence(data.confidence || 0);
      setRecommendations(data.recommendations || {});
      setAmlRecommendations(data.aml_recommendations || {});
      setEmotionHistory((prev) => [
        { emotion: data.emotion, timestamp: new Date().toLocaleTimeString() },
        ...prev.slice(0, 4),
      ]);
      setIsProcessing(false);
    });
    socket.on("error", (data) => {
      setError(data.message || "An error occurred");
      setIsProcessing(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("emotion_result");
      socket.off("error");
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const checkMicPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "microphone" });
      if (permission.state === "denied") {
        setError("Microphone access denied. Please enable it in browser settings.");
        return false;
      }
      return true;
    } catch (err) {
      setError("Error checking microphone permissions.");
      return false;
    }
  };

  const startRecording = async () => {
    if (!isSpeechSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    if (!(await checkMicPermission())) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Setup Audio Visualizer
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      setIsVisualizerActive(true);
      drawVisualizer();

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await audioBlob.arrayBuffer();
        socket.emit("audio_chunk", arrayBuffer);
        audioContextRef.current.close();
        setIsVisualizerActive(false);
        cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });

      // Play click sound
      const clickSound = new Audio("https://www.soundjay.com/buttons/click-01a.mp3");
      clickSound.play().catch(() => console.log("Sound playback failed"));
    } catch (error) {
      console.error("Microphone access error:", error);
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    SpeechRecognition.stopListening();
    socket.emit("stop_audio");

    // Play click sound
    const clickSound = new Audio("https://www.soundjay.com/buttons/click-02a.mp3");
    clickSound.play().catch(() => console.log("Sound playback failed"));
  };

  // Audio Visualizer Drawing
  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `hsl(${i * 2}, 70%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  // Clear Error Toast
  const clearError = () => setError("");

  return (
    <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-white position-relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)" }}>
      {/* Animated Background */}
      <div className="position-absolute top-0 start-0 w-100 h-100 pointer-events-none overflow-hidden">
        <div className="particles">
          <span className="particle particle-1"></span>
          <span className="particle particle-2"></span>
          <span className="particle particle-3"></span>
          <span className="particle particle-4"></span>
          <span className="particle particle-5"></span>
        </div>
        <div className="wave-bg"></div>
        <svg className="position-absolute">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="toast show position-fixed top-0 end-0 m-2 animate__fadeIn" style={{ zIndex: 20, maxWidth: "280px" }}>
          <div className="toast-header bg-danger text-white">
            <strong className="me-auto">Error</strong>
            <button type="button" className="btn-close btn-close-white" onClick={clearError}></button>
          </div>
          <div className="toast-body bg-dark">{error}</div>
        </div>
      )}

      {/* Network Status */}
      {!isConnected && (
        <div className="alert alert-warning position-fixed top-0 w-100 text-center" style={{ zIndex: 20 }}>
          Disconnected from server. Trying to reconnect...
        </div>
      )}

      {/* Main Content Container */}
      <div className="container-fluid d-flex flex-column align-items-center justify-content-center h-100 py-3">
        {/* Header */}
        <h1
          className="display-5 fw-bold mb-3 text-center animate__fadeIn"
          style={{
            background: "linear-gradient(to right, #00ddeb, #8a2be2)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            zIndex: 10,
          }}
        >
          🎙️ AI Emotion Pulse
        </h1>

        {/* Microphone Button & Visualizer */}
        <div className="card bg-dark bg-opacity-75 border-primary border-opacity-25 shadow-lg p-3 mb-2 animate__fadeInUp col-12 col-md-8 col-lg-6" style={{ backdropFilter: "blur(10px)", zIndex: 10 }}>
          <div className="card-body text-center position-relative">
            {isProcessing && (
              <div className="spinner-border text-primary position-absolute" style={{ top: "10px", right: "10px", width: "20px", height: "20px" }} role="status">
                <span className="visually-hidden">Processing...</span>
              </div>
            )}
            <button
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && (recording ? stopRecording() : startRecording())}
              onClick={recording ? stopRecording : startRecording}
              className={`btn btn-lg rounded-circle p-3 shadow ${recording ? "btn-danger animate__pulse" : "btn-primary"} transition-transform ripple-effect`}
              style={{
                background: recording ? "linear-gradient(to bottom right, #dc3545, #a71d2a)" : "linear-gradient(to bottom right, #00ddeb, #007bff)",
                border: "none",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              <span className="fs-3">{recording ? <FaStop /> : <FaMicrophone />}</span>
            </button>
            <p className="mt-2 fs-6 text-secondary">{recording ? "🎧 Analyzing Voice..." : "🎤 Start Speaking"}</p>
            {recording && (
              <canvas ref={canvasRef} className="mt-2 w-100" height="50" style={{ maxHeight: "50px" }}></canvas>
            )}
          </div>
        </div>

        {/* Live Transcription */}
        <div className="card bg-dark bg-opacity-75 border-primary border-opacity-25 shadow-lg p-3 mb-2 animate__fadeInUp col-12 col-md-8 col-lg-6" style={{ backdropFilter: "blur(10px)", zIndex: 10 }}>
          <div className="card-body">
            <h2 className="fs-5 text-primary mb-2">📝 Live Transcription</h2>
            <p className="fs-6 mt-2 text-white" style={{ minHeight: "40px", opacity: transcript ? 1 : 0.5 }}>
              {transcript || "Awaiting your voice..."}
            </p>
          </div>
        </div>

        {/* Emotion Result */}
        {emotion && (
          <div className="card bg-dark bg-opacity-75 border-purple border-opacity-25 shadow-lg p-3 mb-2 animate__fadeInUp col-12 col-md-8 col-lg-6" style={{ backdropFilter: "blur(10px)", zIndex: 10 }}>
            <div className="card-body">
              <h2 className="fs-5 text-purple mb-2">😊 Detected Emotion</h2>
              <p
                className="fs-4 fw-bold mt-2 animate__bounceIn"
                style={{
                  background: "linear-gradient(to right, #8a2be2, #ff69b4)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {emotion}
              </p>
              <p className="fs-6 text-secondary">Confidence: {(confidence * 100).toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* General Recommendations */}
        {emotion && recommendations && Object.keys(recommendations).length > 0 && (
          <div className="card bg-dark bg-opacity-75 border-info border-opacity-25 shadow-lg p-3 mb-2 animate__fadeInUp col-12 col-md-8 col-lg-6" style={{ backdropFilter: "blur(10px)", zIndex: 10 }}>
            <div className="card-body">
              <h2 className="fs-5 text-info mb-2">🎧 Recommendations</h2>
              <ul className="list-group list-group-flush">
                <li className="list-group-item bg-transparent text-white border-0 py-1 fs-6">
                  <strong>Music:</strong>{" "}
                  {recommendations.music_link ? (
                    <a href={recommendations.music_link} target="_blank" rel="noopener noreferrer" className="text-info">
                      {recommendations.music}
                    </a>
                  ) : (
                    recommendations.music || "No recommendation"
                  )}
                </li>
                <li className="list-group-item bg-transparent text-white border-0 py-1 fs-6">
                  <strong>Video:</strong>{" "}
                  {recommendations.video_link ? (
                    <a href={recommendations.video_link} target="_blank" rel="noopener noreferrer" className="text-info">
                      {recommendations.video}
                    </a>
                  ) : (
                    recommendations.video || "No recommendation"
                  )}
                </li>
                <li className="list-group-item bg-transparent text-white border-0 py-1 fs-6">
                  <strong>Activity:</strong> {recommendations.activity || "No recommendation"}
                </li>
              </ul>
            </div>
          </div>
        )}

       

        
      </div>
    </div>
  );
}

export default App;
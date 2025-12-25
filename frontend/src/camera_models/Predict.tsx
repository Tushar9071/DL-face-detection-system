import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Wifi,
  WifiOff,
  User,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

type ResultType = "neutral" | "success" | "warning" | "error";

interface ScanResult {
  text: string;
  type: ResultType;
}

interface LogEntry {
  text: string;
  timestamp: number;
}

export default function Predict_face() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult>({
    text: "Waiting for server...",
    type: "neutral",
  });
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      stopStreaming();
      if (ws.current) ws.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    // ws.current = new WebSocket(import.meta.env.VITE_BACKEND_URL_WS + "/api/students/ws/face_recognition");
    ws.current = new WebSocket(
      "ws://localhost:8000/api/students/ws/face_recognition"
    );

    ws.current.onopen = () => {
      // console.log("Connected to WebSocket");
      setIsConnected(true);
      startCamera();
    };

    ws.current.onmessage = (event: MessageEvent) => {
      const message = event.data;
      handleServerResponse(message);
    };

    ws.current.onclose = () => {
      // console.log("Disconnected");
      setIsConnected(false);
      setResult({ text: "Disconnected from server", type: "error" });
      stopStreaming();

      setTimeout(connectWebSocket, 3000);
    };

    ws.current.onerror = (err: Event) => {
      console.error("WebSocket error:", err);
      if (ws.current) ws.current.close();
    };
  };

  const handleServerResponse = (message: string) => {
    let type: ResultType = "neutral";
    let text = message;

    if (message.includes("Match:")) {
      type = "success";
      const name = message.split("Match:")[1].trim();
      addLog(name);
    } else if (message.includes("Unknown")) {
      type = "warning";
    } else if (message.includes("No face")) {
      type = "neutral";
    }

    setResult({ text, type });
  };

  const addLog = (entry: string) => {
    setLogs((prev) => {
      if (
        prev.length > 0 &&
        prev[0].text === entry &&
        Date.now() - prev[0].timestamp < 5000
      ) {
        return prev;
      }
      return [{ text: entry, timestamp: Date.now() }, ...prev].slice(0, 10);
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
        startFrameTransmission();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setResult({ text: "Camera Access Denied", type: "error" });
    }
  };

  const stopStreaming = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setStreamActive(false);
  };

  const startFrameTransmission = () => {
    // Send frames every 200ms (5 FPS)
    intervalRef.current = setInterval(() => {
      if (
        ws.current &&
        ws.current.readyState === WebSocket.OPEN &&
        videoRef.current &&
        canvasRef.current
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Check if video is actually playing
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (context) {
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Convert to Base64 (JPEG, 0.5 quality for speed)
          const base64Image = canvas.toDataURL("image/jpeg", 0.5);

          ws.current.send(base64Image);
        }
      }
    }, 200);
  };

  // --- Helper for styling result box ---
  const getResultColor = () => {
    switch (result.type) {
      case "success":
        return "bg-green-100 border-green-500 text-green-800";
      case "warning":
        return "bg-red-100 border-red-500 text-red-800";
      case "error":
        return "bg-gray-100 border-gray-500 text-gray-800";
      default:
        return "bg-blue-50 border-blue-300 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <div className="flex items-center gap-2">
            <Camera className="text-blue-400 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight">
              SecureVerify <span className="text-blue-400">AI</span>
            </h1>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected
                ? "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            }`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {isConnected ? "System Online" : "Disconnected"}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Video Feed Area */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-black aspect-[4/3]">
              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <Camera className="w-12 h-12 mb-2 opacity-50" />
                  <p>Initializing Camera...</p>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${
                  !streamActive ? "hidden" : ""
                }`}
              />

              {/* Hidden canvas for processing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay Status */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-mono text-white border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                LIVE FEED
              </div>
            </div>

            {/* Current Result Box */}
            <div
              className={`p-4 rounded-xl border-l-4 transition-all duration-300 flex items-center justify-between ${getResultColor()}`}
            >
              <div className="flex items-center gap-3">
                {result.type === "success" ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : result.type === "warning" ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <User className="w-6 h-6" />
                )}
                <div>
                  <h3 className="font-bold text-lg">Identification Status</h3>
                  <p className="font-mono text-sm opacity-90">{result.text}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Logs */}
          {/* <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-300">
              <User className="w-5 h-5" /> Recent Activity
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-10 text-sm italic">
                  No matches detected yet.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className="bg-gray-700/50 p-3 rounded-lg border border-gray-600 flex items-center justify-between animate-fade-in"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-blue-300">
                        {log.text}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                ))
              )}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}

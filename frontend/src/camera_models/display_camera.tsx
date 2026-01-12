import { Camera, CheckCircle, FileUp, ImageIcon, Loader2, UserPlus } from "lucide-react";
import { uploadStudentData } from "../services/api";
import { useCallback, useEffect, useRef, useState } from "react";

const AddStudent = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [batchSize, setBatchSize] = useState<16 | 32>(16);

  // App State
  const [status, setStatus] = useState<string>("Ready");
  const [progress, setProgress] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: "user" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("Error: Camera Access Denied");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const dataURLToBlob = (dataURL: string): Blob => {
    const parts = dataURL.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const startBatchCapture = useCallback(async () => {
    if (!name || !enrollment) {
      setStatus("Error: Please enter Name and Enrollment Number");
      return;
    }

    setIsCapturing(true);
    setStatus("Initializing Capture...");
    setProgress(0);

    const capturedBlobs: Blob[] = [];
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    for (let i = 0; i < batchSize; i++) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const screenshot = canvas.toDataURL("image/jpeg");
            const blob = dataURLToBlob(screenshot);
            capturedBlobs.push(blob);
            setProgress(i + 1);
        }
        
        // Wait 200ms between captures
        await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setStatus("Uploading dataset...");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("enrollment_number", enrollment);

    capturedBlobs.forEach((blob, index) => {
      formData.append("files", blob, `capture_${index}.jpg`);
    });

    try {
      await uploadStudentData(formData);
      setStatus("Success: Student Enrolled!");
      setName("");
      setEnrollment("");
      setProgress(0);
    } catch (error: any) {
      console.error(error);
      setStatus("Error: Upload Failed");
    } finally {
      setIsCapturing(false);
    }
  }, [name, enrollment, batchSize]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Left Column: Camera Feed */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-white">Enrollment Camera</h2>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-blue-300 border border-blue-500/30">
                <Camera className="w-3 h-3" />
                <span>{streamActive ? "Camera Active" : "Initializing..."}</span>
            </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-black aspect-[4/3]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover transform scale-x-[-1]" 
            />
            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Progress Overlay */}
            {isCapturing && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-blue-500" />
                    <div className="text-4xl font-bold font-mono">
                        {progress} / {batchSize}
                    </div>
                    <p className="text-blue-300 mt-2">Capturing Dataset...</p>
                </div>
            )}
        </div>
      </div>

      {/* Right Column: Form Controls */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-full flex flex-col">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-300 border-b border-gray-700 pb-4">
          <UserPlus className="w-5 h-5 text-blue-400" /> Student Details
        </h2>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Enrollment Number</label>
            <input
              type="text"
              placeholder="e.g. 2023001"
              value={enrollment}
              onChange={(e) => setEnrollment(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Dataset Size</label>
            <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setBatchSize(16)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${batchSize === 16 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                >
                    <ImageIcon className="w-4 h-4" /> 16 Images
                </button>
                <button 
                  onClick={() => setBatchSize(32)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${batchSize === 32 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                >
                     <ImageIcon className="w-4 h-4" /> 32 Images
                </button>
            </div>
          </div>

          <div className="pt-4">
             <div className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${status.includes('Error') ? 'bg-red-900/30 border-red-800 text-red-300' : status.includes('Success') ? 'bg-green-900/30 border-green-800 text-green-300' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
                {status.includes('Success') ? <CheckCircle className="w-5 h-5 shrink-0" /> : <FileUp className="w-5 h-5 shrink-0" />}
                <div>
                    <span className="font-semibold block">System Status</span>
                    {status}
                </div>
             </div>
          </div>
        </div>

        <button
          onClick={startBatchCapture}
          disabled={isCapturing || !name || !enrollment}
          className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
            ${isCapturing 
                ? "bg-gray-700 cursor-not-allowed opacity-50" 
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98]"
            }`}
        >
          {isCapturing ? (
            <>Processing...</>
          ) : (
            <><Camera className="w-5 h-5" /> Start Capture & Upload</>
          )}
        </button>
      </div>
    </div>
  );
};

export default AddStudent;
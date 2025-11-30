import { BrowserRouter, Route, Routes } from "react-router-dom";
import DisplayCamera from "./camera_models/display_camera";
import Predict_face from "./camera_models/Predict";
import Navbar from "./components/navbar";

function App() {
  return (
    <>
      <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Predict_face />} />
            <Route path="/predict" element={<Predict_face />} />
            <Route path="/camera-access" element={<DisplayCamera />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
    </>
  );
}

export default App;

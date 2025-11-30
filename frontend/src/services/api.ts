// services/api.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
export const uploadStudentData = async (formData: FormData) => {
  return axios.post(`${API_URL}/api/students/add_students`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
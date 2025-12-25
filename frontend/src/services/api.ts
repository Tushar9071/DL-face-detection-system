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

export const getAttendance = async () => {
  return axios.get(`${API_URL}/api/students/attendance`);
};

export const getTodayAttendance = async () => {
  return axios.get(`${API_URL}/api/students/attendance/today`);
};

export const getAllStudents = async () => {
  return axios.get(`${API_URL}/api/students/all`);
};

export const deleteStudent = async (id: number) => {
  return axios.delete(`${API_URL}/api/students/${id}`);
};

export const getStats = async () => {
  return axios.get(`${API_URL}/api/students/stats`);
};

export const getStudentImages = async (id: number) => {
  return axios.get(`${API_URL}/api/students/${id}/images`);
};

export const deleteStudentImage = async (id: number, filename: string) => {
  return axios.delete(`${API_URL}/api/students/${id}/images/${filename}`);
};

export const getAnalytics = async (period: string, slot?: string, date?: string) => {
  const params = new URLSearchParams();
  params.append("period", period);
  if (slot && slot !== "All") params.append("slot", slot);
  if (date) params.append("date_str", date);
  
  return axios.get(`${API_URL}/api/students/analytics?${params.toString()}`);
};

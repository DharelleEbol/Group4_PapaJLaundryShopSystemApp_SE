import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:8000';

const axiosClient = axios.create({
  baseURL: `${baseURL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // withCredentials: true, // enable if you use cookie-based auth
});

export default axiosClient;

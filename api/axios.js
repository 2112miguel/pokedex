import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.POKE_API,
});

export default apiClient;

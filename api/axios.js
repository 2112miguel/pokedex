import Axios, { Axios } from "axios";

const axios = Axios.create({
  baseURL: process.env.POKE_API,
});

export default axios;

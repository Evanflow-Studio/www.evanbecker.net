export const api = axios.create({
  baseURL: `${env.apiBaseUrl}/${env.apiVersion}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default class Api {

}
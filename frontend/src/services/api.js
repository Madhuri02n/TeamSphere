// All backend calls live here, so pages never repeat fetch() code.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await response.json();

  // Backend always answers { success, data } or { success: false, message }
  if (!json.success) throw new Error(json.message);
  return json; // pages can read json.data and json.message
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  remove: (path) => request(path, { method: "DELETE" }),
};

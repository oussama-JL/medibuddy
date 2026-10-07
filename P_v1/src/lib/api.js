// Single place for the backend base URL. Override per environment with
// VITE_API_URL (see .env.example), e.g. VITE_API_URL=https://example.com/api
export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export const TOKEN_KEY = "mb_token";

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

// Thin wrapper over fetch(): same arguments and same Response as fetch(),
// the path is just relative to API_URL (e.g. api("/all")). It adds the Bearer
// token when there is one, and on a 401 drops the session and goes to /login.
export async function api(path, options = {}) {
  const token = readToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  // /login answers 401 for wrong credentials: that is not an expired session.
  if (response.status === 401 && path !== "/login") {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  return response;
}

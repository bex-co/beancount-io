import { jwtDecode } from "jwt-decode";

export const createSession = (token: string) => {
  const decoded = jwtDecode<{ sub?: string | number }>(token);

  if (!decoded.sub) {
    throw new Error("Token missing required 'sub' claim");
  }

  return {
    userId: String(decoded.sub),
    authToken: token,
  };
};

"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SpotifyCallbackPage() {
  const [status, setStatus] = useState("Exchanging code with Spotify…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setStatus("Missing required parameters from Spotify.");
      return;
    }
    async function exchange() {
      try {
        const url = new URL(`${API_BASE}/auth/spotify/callback`);
        url.searchParams.set("code", code);
        url.searchParams.set("state", state);
        const resp = await fetch(url.toString());
        if (!resp.ok) {
          throw new Error("Exchange failed");
        }
        const data = await resp.json();
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "spotifyAuth",
            JSON.stringify({
              profile: data.profile,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresIn: data.expires_in,
              obtainedAt: Date.now()
            })
          );
        }
        window.location.href = "/";
      } catch (err) {
        setStatus("Unable to complete Spotify authentication.");
      }
    }
    void exchange();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-white">
      <p className="text-lg">{status}</p>
    </div>
  );
}

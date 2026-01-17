"use client";

import { signIn, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  const loading = status === "loading";
  const authed = !!session?.user;

  return (
    <div className="pixel-wrap">
      <div className="pixel-card">
        <div className="pixel-tag">PORTFOLIO-OS v0.1</div>

        <h1 className="pixel-title" style={{ marginTop: 12 }}>
          {authed ? "LOGGED IN — READY" : "PRESS START TO LOG IN"}
        </h1>

        <p className="pixel-sub">
          {authed
            ? `SIGNED IN AS: ${session?.user?.email ?? "UNKNOWN"}`
            : "GOOGLE SSO ONLY. NO SEED PHRASES. NO PRIVATE KEYS. READ-ONLY APP."}
        </p>

        <div className="pixel-hr" />

        {loading ? (
          <button className="pixel-btn" disabled>
            LOADING...
          </button>
        ) : authed ? (
          <a
            className="pixel-btn"
            href="/dashboard"
            style={{ display: "block", textAlign: "center", textDecoration: "none" }}
          >
            ENTER DASHBOARD
          </a>
        ) : (
          <button className="pixel-btn" onClick={() => signIn("google")}>
            SIGN IN WITH GOOGLE
          </button>
        )}

        <div className="pixel-footer">
          <span>STATUS: {authed ? "AUTH OK" : "GUEST"}</span>
          <span>BUILD: DEV</span>
        </div>
      </div>
    </div>
  );
}

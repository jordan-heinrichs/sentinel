"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function PixelNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const email = session?.user?.email ?? "guest";

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <header className="pixel-nav">
      <div className="pixel-nav-inner">
        <div>
          <div className="pixel-brand">
            <span className="pixel-tag">PORTFOLIO-OS v0.1</span>
            <span className="pixel-brand-title">Stage OS</span>
          </div>

          <nav className="pixel-tabs">
            <Link className={`pixel-tab ${isActive("/dashboard") ? "pixel-tab-active" : ""}`} href="/dashboard">
              DASHBOARD
            </Link>
            <Link className={`pixel-tab ${isActive("/runbook") ? "pixel-tab-active" : ""}`} href="/runbook">
              RUNBOOK
            </Link>
            <Link className={`pixel-tab ${isActive("/alerts") ? "pixel-tab-active" : ""}`} href="/alerts">
              ALERTS
            </Link>
          </nav>
        </div>

        <div className="pixel-user">
          <div className="pixel-email">{email}</div>
          {session?.user ? (
            <button className="pixel-btn-sm" onClick={() => signOut()}>
              LOG OUT
            </button>
          ) : (
            <div className="pixel-tag">GUEST</div>
          )}
        </div>
      </div>
    </header>
  );
}

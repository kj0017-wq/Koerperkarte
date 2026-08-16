"use client";

import { FormEvent, useEffect, useState } from "react";
import * as authModule from "firebase/auth";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdminUser, loadAnatomyData, type AnatomyData } from "@/lib/anatomyRepository";
import { firebaseAuth } from "@/lib/firebase";

const { onAuthStateChanged, signInWithEmailAndPassword, signOut } = authModule as any;

type AuthUser = {
  uid: string;
  email?: string | null;
};

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [anatomyData, setAnatomyData] = useState<AnatomyData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser: AuthUser | null) => {
      setUser(nextUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setAnatomyData(null);
      setIsAdmin(null);
      return;
    }

    let mounted = true;
    setIsAdmin(null);

    isAdminUser(user.uid).then((allowed) => {
      if (!mounted) return;
      setIsAdmin(allowed);
      if (allowed) refreshData();
    });

    return () => {
      mounted = false;
    };
  }, [user]);

  async function refreshData() {
    setDataError("");
    try {
      const data = await loadAnatomyData();
      setAnatomyData(data);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Daten konnten nicht geladen werden.");
    }
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setIsSigningIn(true);

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login fehlgeschlagen.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
      <header className="flex flex-col gap-3 rounded-lg px-1 py-2 sm:gap-4 sm:py-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Koerperkarte</p>
          <h1 className="mt-1 max-w-3xl text-2xl font-semibold leading-tight text-slate-950 sm:mt-2 sm:text-4xl lg:text-5xl">
            Verwaltung und Datenbankpflege.
          </h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50" href="/">
            Karte oeffnen
          </a>
          {user && (
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="focus-ring rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Abmelden
            </button>
          )}
        </div>
      </header>

      {!authReady ? (
        <section className="glass rounded-lg p-6 text-sm leading-6 text-slate-600">Login wird geprueft...</section>
      ) : !user ? (
        <section className="glass mx-auto w-full max-w-md rounded-lg p-5">
          <p className="text-xs font-semibold uppercase text-slate-400">Admin Login</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Anmelden</h2>
          <form className="mt-5 grid gap-4" onSubmit={handleSignIn}>
            <label className="text-sm font-medium text-slate-700">
              E-Mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
                autoComplete="email"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Passwort
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-blue-400"
                autoComplete="current-password"
                required
              />
            </label>
            {authError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</div>}
            <button
              type="submit"
              disabled={isSigningIn}
              className="focus-ring rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSigningIn ? "Meldet an..." : "Einloggen"}
            </button>
          </form>
        </section>
      ) : isAdmin === null ? (
        <section className="glass rounded-lg p-6 text-sm leading-6 text-slate-600">Admin-Rechte werden geprueft...</section>
      ) : !isAdmin ? (
        <section className="glass rounded-lg p-6 text-sm leading-6 text-slate-600">Dieser Firebase-User ist nicht als Admin freigeschaltet.</section>
      ) : !anatomyData ? (
        <section className="glass rounded-lg p-6 text-sm leading-6 text-slate-600">Daten werden geladen...</section>
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>Angemeldet als <strong className="text-slate-950">{user.email}</strong></span>
            <span>Datenquelle: <strong className="text-slate-950">{anatomyData.source === "realtime" ? "Realtime Database" : "Lokale Demo-Daten"}</strong></span>
          </div>
          {dataError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{dataError}</div>}
          <AdminPanel data={anatomyData} onDataChanged={refreshData} />
        </>
      )}
    </main>
  );
}
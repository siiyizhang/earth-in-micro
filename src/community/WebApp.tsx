import EurekaLogo from "../components/EurekaLogo";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { client, community } from "./client";
import type { Place } from "./client";
import ExploreMap from "./ExploreMap";
import { AuthForm } from "./Forms";
import DiscoveryComposer from "./DiscoveryComposer";
import FeedbackWidget from "./FeedbackWidget";
import LifeTreeReveal from "./LifeTreeReveal";
import { closeLifeTreeReveal, useLifeTreeReveal } from "./revealStore";
import { Gallery, PlaceLog } from "./Collection";
import "./community.css";

export default function WebApp() {
  const route = useLocation();
  const navigate = useNavigate();
  const reveal = useLifeTreeReveal();
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!community),
    [auth, setAuth] = useState(false),
    [error, setError] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null),
    [place, setPlace] = useState<Place | null>(null),
    [upload, setUpload] = useState<{ place: Place | null } | null>(null),
    [revision, setRevision] = useState(0),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!community) return;
    let active = true;
    void community.auth.getSession().then(({ data, error }) => {
      if (active) {
        if (error) setError(error.message);
        setSession(data.session);
        setReady(true);
      }
    });
    const { data } = community.auth.onAuthStateChange((_event, current) => {
      if (active) {
        setSession(current);
        setReady(true);
        if (!current) {
          setPlace(null);
          setPoint(null);
          setUpload(null);
        }
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const requireAccount = (action: () => void) => {
    if (!session) setAuth(true);
    else action();
  };
  return (
    <div className={`micro-app ${route.pathname.endsWith("/explore") ? "micro-exploring" : ""}`}>
      <header className="micro-header">
        <Link to="/" className="micro-brand">
          <EurekaLogo />
          <span>MICRO EXPLORER</span>
        </Link>
        <nav aria-label="Web app navigation">
          {[
            ["explore", "◎", "Explore"],
            ["gallery", "▧", "Gallery"],
            ["settings", "⚙", "Settings"],
          ].map(([path, icon, label]) => (
            <NavLink key={path} to={`/app/${path}`}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          className="micro-account"
          onClick={() => setAuth(true)}
          disabled={!!session || !community}
        >
          {session ? session.user.email : "Sign in"}
        </button>
      </header>
      {!community ? (
        <main className="micro-empty">
          <h1>Micro Explorer</h1>
          <p>Community setup is still in progress. Please check back soon.</p>
        </main>
      ) : !ready ? (
        <main className="micro-empty" role="status">
          Opening your explorer…
        </main>
      ) : (
        <main className="micro-main">
          {error && (
            <p role="alert" className="micro-error">
              {error}
            </p>
          )}
          {notice && (
            <div className="micro-notice" role="status">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          )}
          <Routes>
            <Route index element={<Navigate to="explore" replace />} />
            <Route
              path="explore"
              element={
                <ExploreMap
                  signedIn={!!session}
                  revision={revision}
                  onPlace={setPlace}
                  onPick={(lat, lng) => {
                    setPoint({ lat, lng });
                    if (!session) setAuth(true);
                  }}
                />
              }
            />
            <Route
              path="gallery"
              element={
                <Gallery
                  key={session?.user.id ?? "guest"}
                  userId={session?.user.id ?? "guest"}
                  revision={revision}
                  onUpload={() => requireAccount(() => setUpload({ place: null }))}
                />
              }
            />
            <Route
              path="settings"
              element={
                <Settings session={session} onSignIn={() => setAuth(true)} />
              }
            />
            <Route path="*" element={<Navigate to="/app/explore" replace />} />
          </Routes>
        </main>
      )}
      {auth && community && <AuthForm onClose={() => setAuth(false)} />}
      {point && session && !auth && (
        <DiscoveryComposer session={session} point={point} place={null}
          onClose={() => setPoint(null)}
          onSaved={() => { setPoint(null); setRevision((n) => n + 1); setNotice("Your discoveries have been saved."); }} />
      )}
      {place && !point && !upload && !auth && (
        <PlaceLog
          key={place.id}
          place={place}
          signedIn={!!session}
          onSignIn={() => setAuth(true)}
          onClose={() => setPlace(null)}
          onUpload={() => { setUpload({ place }); if (!session) setAuth(true); }}
          onChanged={() => setRevision((n) => n + 1)}
        />
      )}
      <FeedbackWidget accountEmail={session?.user.email} />
      {reveal && <LifeTreeReveal key={reveal.familyIds.join("|")} request={reveal} onClose={closeLifeTreeReveal}
        onOpenTree={() => { closeLifeTreeReveal(); navigate("/app/gallery?view=tree"); }} />}
      {upload && session && !auth && (
        <DiscoveryComposer
          session={session}
          place={upload.place}
          onClose={() => setUpload(null)}
          onSaved={() => {
            setUpload(null);
            setPlace(null);
            setRevision((n) => n + 1);
            setNotice("Discovery saved to your Eureka account.");
          }}
        />
      )}
    </div>
  );
}
function Settings({
  session,
  onSignIn,
}: {
  session: Session | null;
  onSignIn: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="micro-content">
      <span className="micro-eyebrow">MAKE YOURSELF AT HOME</span>
      <h1>Settings</h1>
      <div className="micro-card">
        <h2>Eureka account</h2>
        <p>{session?.user.email ?? "You are browsing as a guest."}</p>
        <p>
          The same account connects your places and uploaded discoveries across
          the Eureka App and this website.
        </p>
        {session ? (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await client().auth.signOut({ scope: "local" });
                if (result.error) throw result.error;
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Sign out of this browser
          </button>
        ) : (
          <button onClick={onSignIn}>Sign in</button>
        )}
        {error && (
          <p role="alert" className="micro-error">
            {error}
          </p>
        )}
      </div>
      <div className="micro-card">
        <h2>Your data</h2>
        <p>
          New discoveries start private. You choose whether to share each
          discovery and its location. New map places are always public.
        </p>
        <p>
          Unuploaded mobile photos remain on your phone.
        </p>
      </div>
      <Link to="/">← Back to Earth in Micro</Link>
    </section>
  );
}

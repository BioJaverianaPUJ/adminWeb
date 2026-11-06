import { lazy, Suspense, useEffect, useState } from "react";
import {
  Leaf,
  Map,
  Trophy,
  Users,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import type { User } from "../../shared/types";
import { api } from "../lib/api";
import { Login } from "../features/auth/Login";
const Catalog = lazy(() =>
  import("../features/catalog/Catalog").then((m) => ({ default: m.Catalog })),
);
const Community = lazy(() =>
  import("../features/community/Community").then((m) => ({
    default: m.Community,
  })),
);
const DraftWorkspace = lazy(() =>
  import("../features/drafts/DraftWorkspace").then((m) => ({
    default: m.DraftWorkspace,
  })),
);
import { Badge, Loading, Notice } from "../components/ui";
type Section = "catalogo" | "zonas" | "gamificacion" | "comunidad";
const nav = [
  {
    id: "catalogo",
    label: "Catálogo de especies",
    icon: Leaf,
    caption: "Especies y especímenes",
  },
  {
    id: "zonas",
    label: "Zonas del campus",
    icon: Map,
    caption: "Territorio y biodiversidad",
  },
  {
    id: "gamificacion",
    label: "Gamificación",
    icon: Trophy,
    caption: "Misiones, logros y aprendizaje",
  },
  {
    id: "comunidad",
    label: "Gestión comunitaria",
    icon: Users,
    caption: "Personas y moderación",
  },
] as const;
function sectionFromHash(): Section {
  const s = location.hash.slice(1);
  return nav.some((n) => n.id === s) ? (s as Section) : "catalogo";
}
export function App() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [section, setSection] = useState<Section>(sectionFromHash),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    api<{ user: User }>("/session", {}, false)
      .then((r) => {
        if (active) setUser(r.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    const ended = () => {
      setUser(null);
      setNotice("Tu sesión terminó. Vuelve a ingresar.");
    };
    const hash = () => {
      if (nav.some((n) => n.id === location.hash.slice(1)))
        setSection(sectionFromHash());
    };
    window.addEventListener("session-ended", ended);
    window.addEventListener("hashchange", hash);
    return () => {
      active = false;
      window.removeEventListener("session-ended", ended);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void api("/session").catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [user]);
  async function logout() {
    try {
      await api("/logout", { method: "POST" });
      setUser(null);
      setNotice("");
    } catch {
      setNotice("No pudimos cerrar la sesión. Intenta nuevamente.");
    }
  }
  if (checking)
    return (
      <div className="boot">
        <Loading />
      </div>
    );
  if (!user)
    return (
      <>
        {notice && (
          <div className="login-notice">
            <Notice>{notice}</Notice>
          </div>
        )}
        <Login
          onLogin={(u) => {
            setUser(u);
            setNotice("");
          }}
        />
      </>
    );
  return (
    <div className={`app-shell scene-${section}`}>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand" role="img" aria-label="BioJaveriana" />
        <div className="sidebar-caption">MÓDULO DE ADMINISTRACIÓN</div>
        <button
          className="close-menu"
          aria-label="Cerrar menú"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="nav-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Secciones administrativas">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={section === n.id ? "active" : ""}
              aria-current={section === n.id ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <n.icon size={21} />
              <span>
                {n.label}
                <small>{n.caption}</small>
              </span>
              {section === n.id && <ArrowUpRight size={16} />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-stamp">
            <Leaf size={22} />
            <div>
              Campus Bogotá<small>Explora · descubre · protege</small>
            </div>
          </div>
          <div className="account">
            <div className="avatar">{user.firstName.charAt(0)}</div>
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>Administrador</small>
            </div>
            <button
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="open-menu"
            aria-label="Abrir menú"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <span>
            Administración <span className="slash">/</span>{" "}
            {nav.find((n) => n.id === section)?.label}
          </span>
          <Badge>
            <ShieldCheck size={13} /> Acceso protegido
          </Badge>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
          {notice && <Notice>{notice}</Notice>}
          <Suspense fallback={<Loading />}>
            {section === "catalogo" ? (
              <Catalog />
            ) : section === "comunidad" ? (
              <Community user={user} />
            ) : (
              <DraftWorkspace
                key={section + user.id}
                section={section}
                userId={user.id}
              />
            )}
          </Suspense>
        </main>
        <footer className="page-footer">
          <span>BioJaveriana · La biodiversidad nos conecta.</span>
          <span>Administración web</span>
        </footer>
      </div>
    </div>
  );
}

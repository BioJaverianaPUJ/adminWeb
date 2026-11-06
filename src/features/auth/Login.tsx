import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Leaf,
  Map,
  Users,
} from "lucide-react";
import type { User } from "../../../shared/types";
import { api, errorMessage } from "../../lib/api";
import { ErrorBox, Field } from "../../components/ui";
export function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: User }>("/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email")).trim(),
          password: data.get("password"),
        }),
      });
      onLogin(r.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-story">
        <div className="brand" role="img" aria-label="BioJaveriana" />
        <p className="eyebrow">ADMINISTRACIÓN DEL CAMPUS</p>
        <h1>
          Cuidar la vida.
          <br />
          <em>Conectar el campus.</em>
        </h1>
        <p className="lede">
          Un espacio para gestionar la biodiversidad, acompañar a nuestra
          comunidad y dar forma a nuevos descubrimientos.
        </p>
        <div className="story-pills">
          <span>
            <Leaf /> Biodiversidad
          </span>
          <span>
            <Map /> Territorio
          </span>
          <span>
            <Users /> Comunidad
          </span>
        </div>
        <div className="login-foot">
          PONTIFICIA UNIVERSIDAD JAVERIANA <span>BOGOTÁ</span>
        </div>
      </div>
      <section className="glass login-card">
        <div className="icon-tile">
          <ShieldCheck />
        </div>
        <p className="eyebrow">ACCESO DE ADMINISTRADORES</p>
        <h2>
          Bienvenido
          <br />
          de nuevo.
        </h2>
        <p>Ingresa con tu cuenta de BioJaveriana.</p>
        <form onSubmit={submit}>
          <Field label="Correo electrónico *">
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="usuario@javeriana.edu.co"
            />
          </Field>
          <Field label="Contraseña *">
            <span className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={
                  visible ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </span>
          </Field>
          {error && <ErrorBox message={error} />}
          <button className="primary wide" disabled={busy}>
            {busy ? "Verificando acceso…" : "Entrar al módulo"}
            <ArrowRight size={19} />
          </button>
        </form>
        <small className="secure-note">
          <ShieldCheck size={16} /> Acceso exclusivo para cuentas con rol
          administrador.
        </small>
      </section>
    </main>
  );
}

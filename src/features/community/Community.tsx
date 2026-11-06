import { useState } from "react";
import {
  Users,
  Flag,
  Search,
  Eye,
  ShieldCheck,
  UserRoundX,
  UserRoundCheck,
  Trash2,
} from "lucide-react";
import type { User } from "../../../shared/types";
import { useResource } from "../../lib/useResource";
import { api, errorMessage } from "../../lib/api";
import {
  Badge,
  Heading,
  Notice,
  ErrorBox,
  Loading,
  Empty,
  Pager,
  Modal,
  Confirm,
} from "../../components/ui";
export function Community({ user }: { user: User }) {
  const [tab, setTab] = useState("users"),
    [q, setQ] = useState(""),
    [role, setRole] = useState(""),
    [view, setView] = useState<User | null>(null),
    [reportState, setReportState] = useState("all");
  const r = useResource<User>("users", { q, role });
  const [action, setAction] = useState<{
      target: User;
      kind: "promote" | "suspend" | "activate" | "delete";
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const labels = {
    promote: "Asignar rol de administrador",
    suspend: "Suspender cuenta",
    activate: "Reactivar cuenta",
    delete: "Eliminar cuenta",
  };
  async function apply() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      await api(`/resources/users/${action.target.id}`, {
        method: action.kind === "delete" ? "DELETE" : "PATCH",
        body:
          action.kind === "delete"
            ? undefined
            : JSON.stringify(
                action.kind === "promote"
                  ? { role: "ADMIN" }
                  : { enabled: action.kind === "activate" },
              ),
      });
      setMessage(
        action.kind === "delete"
          ? "Cuenta eliminada."
          : "El servidor confirmó el cambio.",
      );
      setAction(null);
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const run = (target: User, kind: NonNullable<typeof action>["kind"]) => {
    setError("");
    setAction({ target, kind });
  };
  return (
    <>
      <Heading
        eyebrow="GESTIÓN COMUNITARIA"
        title="Una comunidad"
        accent="que cuidamos."
        description="Gestiona el acceso a BioJaveriana y acompaña la convivencia en el campus."
      />
      <div className="tabs">
        <button
          className={tab === "users" ? "selected" : ""}
          onClick={() => setTab("users")}
        >
          <Users size={16} />
          Usuarios
        </button>
        <button
          className={tab === "reports" ? "selected" : ""}
          onClick={() => setTab("reports")}
        >
          <Flag size={16} />
          Denuncias
        </button>
      </div>
      {message && (
        <p role="status" className="success">
          {message}
        </p>
      )}
      {tab === "reports" ? (
        <section className="glass data-panel">
          <div className="panel-title">
            <h2>Revisión de denuncias</h2>
            <Badge>Pendiente de servicio</Badge>
          </div>
          <div className="toolbar">
            <label>
              Estado{" "}
              <select
                value={reportState}
                onChange={(e) => setReportState(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="pending">No revisadas</option>
                <option value="reviewed">Revisadas</option>
                <option value="dismissed">Descartadas</option>
              </select>
            </label>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Contenido denunciado</th>
                  <th>Motivo</th>
                  <th>Cuenta involucrada</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
            </table>
          </div>
          <Empty title="La moderación está preparada">
            El backend todavía no permite consultar denuncias, retirar
            publicaciones o eliminar comentarios.
          </Empty>
          <Notice>
            Una denuncia se podrá marcar como revisada al aplicar una sanción, o
            descartada si no corresponde sancionar. Solo las revisadas o
            descartadas podrán eliminarse.
          </Notice>
        </section>
      ) : (
        <section className="glass data-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">PERSONAS DEL CAMPUS</p>
              <h2>Cuentas de BioJaveriana</h2>
            </div>
            <Badge tone="live">Conectado al backend</Badge>
          </div>
          <div className="toolbar">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Buscar usuario"
                placeholder="Buscar por nombre, usuario o correo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administradores</option>
              <option value="USER">Usuarios</option>
            </select>
            <select aria-label="Filtrar por estado" disabled>
              <option>Estado: no disponible</option>
            </select>
          </div>
          <Notice>
            El backend no devuelve el estado de las cuentas. Se muestra como «No
            informado»; no se presume que estén activas. Retirar el rol o
            eliminar administradores requiere proteger al último administrador
            en el servidor.
          </Notice>
          {r.busy ? (
            <Loading />
          ) : r.error ? (
            <ErrorBox message={r.error} retry={r.reload} />
          ) : r.data?.content.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.content.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="record-name">
                          <div className="avatar">{u.firstName.charAt(0)}</div>
                          <div>
                            <strong>
                              {u.firstName} {u.lastName}
                            </strong>
                            <small>@{u.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={u.role === "ADMIN" ? "live" : ""}>
                          {u.role === "ADMIN" ? "Administrador" : "Usuario"}
                        </Badge>
                      </td>
                      <td>No informado</td>
                      <td>
                        <div className="row-actions">
                          <button
                            aria-label={`Ver ${u.username}`}
                            title="Ver cuenta"
                            onClick={() => setView(u)}
                          >
                            <Eye size={17} />
                          </button>
                          {u.role === "USER" && (
                            <button
                              aria-label={`Hacer administrador a ${u.username}`}
                              title="Asignar administrador"
                              onClick={() => run(u, "promote")}
                            >
                              <ShieldCheck size={17} />
                            </button>
                          )}
                          <button
                            aria-label={`Suspender ${u.username}`}
                            title="Suspender cuenta"
                            disabled={u.id === user.id}
                            onClick={() => run(u, "suspend")}
                          >
                            <UserRoundX size={17} />
                          </button>
                          <button
                            aria-label={`Reactivar ${u.username}`}
                            title="Reactivar cuenta"
                            onClick={() => run(u, "activate")}
                          >
                            <UserRoundCheck size={17} />
                          </button>
                          <button
                            aria-label={`Eliminar ${u.username}`}
                            title="Eliminar cuenta"
                            disabled={u.role === "ADMIN"}
                            onClick={() => run(u, "delete")}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Sin coincidencias">
              Prueba con otro nombre o rol.
            </Empty>
          )}
          {r.data && !r.error && (
            <Pager
              page={r.page}
              total={r.data.pagination.totalPages}
              count={r.data.pagination.totalElements}
              onPage={r.setPage}
            />
          )}
        </section>
      )}
      {view && (
        <Modal title="Información de la cuenta" onClose={() => setView(null)}>
          <dl className="details">
            <dt>Nombre</dt>
            <dd>
              {view.firstName} {view.lastName}
            </dd>
            <dt>Usuario</dt>
            <dd>@{view.username}</dd>
            <dt>Correo</dt>
            <dd>{view.email}</dd>
            <dt>Rol</dt>
            <dd>{view.role === "ADMIN" ? "Administrador" : "Usuario"}</dd>
            <dt>Estado</dt>
            <dd>No informado por el servidor</dd>
            <dt>ID</dt>
            <dd>{view.id}</dd>
          </dl>
        </Modal>
      )}
      {action && (
        <Confirm
          title={labels[action.kind]}
          description={`${labels[action.kind]}: @${action.target.username}. ${action.kind === "delete" ? "La eliminación es permanente." : action.kind === "suspend" ? "La cuenta dejará de poder acceder." : action.kind === "promote" ? "Esta persona podrá modificar información oficial y gestionar otras cuentas." : "Se permitirá nuevamente el acceso a la cuenta."}`}
          busy={busy}
          error={error}
          onConfirm={apply}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}

import { campusReference } from "../../../shared/campus-reference";
import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  Download,
  MapPin,
  Leaf,
  Flag,
  Trophy,
  Lightbulb,
  Search,
} from "lucide-react";
import type { Draft, DraftKind, Coordinate } from "../../../shared/types";
import { draftSchema } from "../../../shared/validation";
import { validPolygon, contained } from "../../../shared/geometry";
import { newDraft, readDrafts, writeDrafts, exportDraft } from "./storage";
import {
  Badge,
  Heading,
  Notice,
  ErrorBox,
  Empty,
  Pager,
  Modal,
  Field,
  Confirm,
} from "../../components/ui";
import { CampusMap } from "../../components/CampusMap";
const labels: Record<DraftKind, string> = {
  green: "Zonas verdes",
  interest: "Zonas de interés",
  boundary: "Límite del campus",
  mission: "Misiones",
  achievement: "Logros",
  curiosity: "Datos curiosos",
};
const icons = {
  green: Leaf,
  interest: MapPin,
  boundary: Flag,
  mission: Flag,
  achievement: Trophy,
  curiosity: Lightbulb,
};
export function DraftWorkspace({
  section,
  userId,
}: {
  section: "zonas" | "gamificacion";
  userId: string;
}) {
  const kinds: DraftKind[] =
    section === "zonas"
      ? ["green", "interest", "boundary"]
      : ["mission", "achievement", "curiosity"];
  const [kind, setKind] = useState<DraftKind>(kinds[0]),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [error, setError] = useState(""),
    [storageBlocked, setStorageBlocked] = useState(false),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [edit, setEdit] = useState<Draft | null>(null),
    [view, setView] = useState<Draft | null>(null),
    [remove, setRemove] = useState<Draft | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    try {
      setDrafts(readDrafts(userId));
    } catch (e) {
      setStorageBlocked(true);
      setError(
        e instanceof Error ? e.message : "No pudimos leer los borradores.",
      );
    }
  }, [userId]);
  const items = drafts.filter(
    (d) =>
      d.kind === kind &&
      d.title.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  function save(next: Draft[]) {
    if (storageBlocked)
      throw Error("El almacenamiento local requiere revisión.");
    try {
      writeDrafts(userId, next);
      setDrafts(next);
      setMessage("Borrador guardado en este navegador. No se ha publicado.");
    } catch {
      throw Error(
        "No hay espacio para guardar el borrador. Exporta una copia o reduce el tamaño de las imágenes.",
      );
    }
  }
  return (
    <>
      <Heading
        eyebrow={
          section === "zonas" ? "TERRITORIO JAVERIANO" : "APRENDER EXPLORANDO"
        }
        title={section === "zonas" ? "Dale forma al" : "Pequeños retos."}
        accent={section === "zonas" ? "campus." : "Grandes descubrimientos."}
        description={
          section === "zonas"
            ? "Prepara las zonas verdes, los lugares de interés y el límite del campus."
            : "Diseña las experiencias que conectarán a la comunidad con la naturaleza."
        }
        action={
          <button
            className="primary"
            disabled={storageBlocked}
            onClick={() => setEdit(newDraft(kind))}
          >
            <Plus size={18} />
            Nuevo borrador
          </button>
        }
      />
      <Notice>
        Estas funciones aún no tienen servicio en el backend. Puedes crear,
        revisar y exportar <strong>borradores locales</strong>; no aparecen en
        la aplicación móvil ni modifican datos oficiales.
      </Notice>
      {section === "zonas" && kind === "boundary" && (
        <section className="glass data-panel perimeter-preview">
          <h2>Perímetro de referencia del campus</h2>
          <CampusMap points={campusReference} />
          <p>
            Contorno de OpenStreetMap, consultado el 5 de noviembre de 2026.
            Revísalo antes de adoptarlo como límite oficial.
          </p>
          <button
            disabled={storageBlocked}
            onClick={() =>
              setEdit({
                ...newDraft("boundary"),
                title: "Campus Bogotá — referencia OSM",
                description:
                  "Fuente: https://www.openstreetmap.org/way/40739535 · ODbL · Pendiente de aprobación y publicación en el backend.",
                points: campusReference.map((p) => [...p] as Coordinate),
              })
            }
          >
            Editar copia del perímetro
          </button>
          <a href="/assets/campus-reference.geojson" download>
            Descargar GeoJSON
          </a>
        </section>
      )}
      <div className="tabs">
        {kinds.map((k) => {
          const Icon = icons[k];
          return (
            <button
              key={k}
              className={k === kind ? "selected" : ""}
              onClick={() => {
                setKind(k);
                setPage(0);
                setQuery("");
              }}
            >
              <Icon size={17} />
              {labels[k]}
            </button>
          );
        })}
      </div>
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {error && <ErrorBox message={error} />}
      <section className="glass data-panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">ESPACIO DE PREPARACIÓN</p>
            <h2>{labels[kind]}</h2>
          </div>
          <Badge>Borradores · Este navegador</Badge>
        </div>
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input
              aria-label="Buscar borrador"
              placeholder="Buscar por nombre…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        {items.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(page * 10, page * 10 + 10).map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      <small>
                        {new Date(d.updatedAt).toLocaleDateString("es-CO")}
                      </small>
                    </td>
                    <td className="truncate">{d.description}</td>
                    <td>
                      <Badge>No publicado</Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label={`Ver ${d.title}`}
                          onClick={() => setView(d)}
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          aria-label={`Editar ${d.title}`}
                          onClick={() => setEdit(d)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          aria-label={`Exportar ${d.title}`}
                          onClick={() => exportDraft(d)}
                        >
                          <Download size={17} />
                        </button>
                        <button
                          aria-label={`Eliminar ${d.title}`}
                          onClick={() => {
                            setError("");
                            setRemove(d);
                          }}
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
          <Empty title={`Prepara ${labels[kind].toLowerCase()}`}>
            Los borradores que guardes se mostrarán aquí. Podrás editarlos y
            exportarlos antes de conectar el servicio.
          </Empty>
        )}
        <Pager
          page={page}
          total={Math.ceil(items.length / 10)}
          count={items.length}
          onPage={setPage}
        />
      </section>
      {edit && (
        <DraftEditor
          draft={edit}
          zones={drafts.filter((d) => d.kind === "interest")}
          boundary={drafts.find((d) => d.kind === "boundary")}
          onClose={() => setEdit(null)}
          onSave={(d) => {
            const next = [
              ...drafts.filter(
                (x) =>
                  x.id !== d.id &&
                  !(d.kind === "boundary" && x.kind === "boundary"),
              ),
              d,
            ];
            save(next);
            setEdit(null);
          }}
        />
      )}
      {view && (
        <Modal title={view.title} onClose={() => setView(null)}>
          <Badge>No publicado · Borrador local</Badge>
          <p className="lede">{view.description}</p>
          {view.points.length > 0 && (
            <CampusMap points={view.points} color={view.color} />
          )}
          <dl className="details">
            {["mission", "achievement"].includes(view.kind) && (
              <>
                <dt>Recompensa</dt>
                <dd>{view.xp} XP</dd>
                <dt>Objetivo</dt>
                <dd>
                  {view.objective} · Meta: {view.target}
                </dd>
                {view.kind === "mission" && (
                  <>
                    <dt>Periodo</dt>
                    <dd>
                      {
                        {
                          DAILY: "Diario",
                          WEEKLY: "Semanal",
                          EVENT: "De evento",
                        }[view.period]
                      }
                    </dd>
                  </>
                )}
                {view.period === "EVENT" && (
                  <>
                    <dt>Fechas</dt>
                    <dd>
                      {view.startsAt} — {view.endsAt}
                    </dd>
                  </>
                )}
              </>
            )}
            {view.zoneId && (
              <>
                <dt>Zona de interés</dt>
                <dd>
                  {drafts.find((d) => d.id === view.zoneId)?.title ??
                    "Zona no disponible"}
                </dd>
              </>
            )}
          </dl>
          <div className="image-previews">
            {view.images.map((src, i) => (
              <img key={i} src={src} alt={`Imagen del dato curioso ${i + 1}`} />
            ))}
          </div>
          <button onClick={() => exportDraft(view)}>
            <Download size={17} />
            Exportar borrador
          </button>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="Eliminar borrador"
          description={`Se eliminará «${remove.title}» de este navegador. No se enviará ninguna operación al backend.`}
          busy={false}
          error={error}
          onClose={() => setRemove(null)}
          onConfirm={() => {
            try {
              if (drafts.some((d) => d.zoneId === remove.id))
                throw Error(
                  "Esta zona está asociada a otros borradores. Retira esas asociaciones antes de eliminarla.",
                );
              save(drafts.filter((d) => d.id !== remove.id));
              setRemove(null);
              setPage(0);
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo eliminar.");
            }
          }}
        />
      )}
    </>
  );
}
function DraftEditor({
  draft,
  zones,
  boundary,
  onClose,
  onSave,
}: {
  draft: Draft;
  zones: Draft[];
  boundary?: Draft;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const [d, setD] = useState(draft),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [mode, setMode] = useState<"polygon" | "point" | "circle">("polygon"),
    [radius, setRadius] = useState(30),
    [preview, setPreview] = useState<Coordinate[]>([]),
    [busy, setBusy] = useState(false);
  const geographic = ["green", "interest", "boundary"].includes(d.kind);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setD((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };
  const close = () => {
    if (
      !busy &&
      (!dirty ||
        window.confirm("Hay cambios sin guardar. ¿Quieres descartarlos?"))
    )
      onClose();
  };
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const next = { ...d, updatedAt: new Date().toISOString() };
    const parsed = draftSchema.safeParse(next);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0].message.startsWith("Invalid")
          ? "Revisa los campos obligatorios y sus valores."
          : parsed.error.issues[0].message,
      );
      return;
    }
    if (geographic && !validPolygon(d.points)) {
      setError(
        "El polígono debe tener al menos tres vértices distintos, área y no cruzarse a sí mismo.",
      );
      return;
    }
    if (
      geographic &&
      d.kind !== "boundary" &&
      boundary &&
      !contained(d.points, boundary.points)
    ) {
      setError(
        "La zona debe quedar completamente dentro del límite de trabajo.",
      );
      return;
    }
    try {
      onSave(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }
  async function images(files: FileList | null) {
    if (!files) return;
    setError("");
    if (d.images.length + files.length > 5) {
      setError("Se permiten hasta cinco imágenes.");
      return;
    }
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 1000000
        )
          throw Error(
            "Usa imágenes JPG, PNG o WebP de hasta 1 MB para los borradores locales.",
          );
        const data = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        added.push(data);
      }
      change("images", [...d.images, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer la imagen.");
    } finally {
      setBusy(false);
    }
  }
  function circleToPolygon() {
    if (!preview[0]) return;
    const [lat, lng] = preview[0];
    const points: Coordinate[] = Array.from({ length: 48 }, (_, i) => {
      const a = (i * Math.PI * 2) / 48;
      return [
        lat + (radius / 111320) * Math.cos(a),
        lng +
          (radius / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a),
      ];
    });
    change("points", points);
    setMode("polygon");
    setPreview([]);
  }
  return (
    <Modal title={`Preparar ${labels[d.kind].toLowerCase()}`} onClose={close}>
      <form onSubmit={submit}>
        <Notice>
          Borrador local. Guardar no publica ni modifica el campus oficial.
        </Notice>
        <div className="form-grid">
          <Field label={d.kind === "curiosity" ? "Título *" : "Nombre *"}>
            <input
              required
              maxLength={180}
              value={d.title}
              onChange={(e) => change("title", e.target.value)}
            />
          </Field>
          <Field label="Descripción *">
            <textarea
              required
              maxLength={5000}
              value={d.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </Field>
          {geographic ? (
            <Field label="Color *">
              <input
                type="color"
                value={d.color}
                onChange={(e) => change("color", e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="Zona de interés (opcional)">
                <select
                  value={d.zoneId}
                  onChange={(e) => change("zoneId", e.target.value)}
                >
                  <option value="">Sin zona</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.title} · borrador
                    </option>
                  ))}
                </select>
              </Field>
              {d.kind !== "curiosity" && (
                <>
                  <Field label="Experiencia otorgada *">
                    <select
                      value={d.xp}
                      onChange={(e) => change("xp", Number(e.target.value))}
                    >
                      {[5, 10, 15, 20].map((x) => (
                        <option key={x} value={x}>
                          {x} XP
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={
                      d.kind === "mission"
                        ? "Objetivo *"
                        : "Condición de cumplimiento *"
                    }
                  >
                    <textarea
                      required
                      value={d.objective}
                      onChange={(e) => change("objective", e.target.value)}
                    />
                  </Field>
                  <Field label="Cantidad objetivo *">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={d.target}
                      onChange={(e) => change("target", Number(e.target.value))}
                    />
                  </Field>
                </>
              )}
              {d.kind === "mission" && (
                <>
                  <Field label="Periodo *">
                    <select
                      value={d.period}
                      onChange={(e) =>
                        change("period", e.target.value as Draft["period"])
                      }
                    >
                      <option value="DAILY">Diario</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="EVENT">De evento</option>
                    </select>
                  </Field>
                  {d.period === "EVENT" && (
                    <>
                      <Field label="Inicio del evento *">
                        <input
                          required
                          type="datetime-local"
                          value={d.startsAt}
                          onChange={(e) => change("startsAt", e.target.value)}
                        />
                      </Field>
                      <Field label="Fin del evento *">
                        <input
                          required
                          type="datetime-local"
                          value={d.endsAt}
                          onChange={(e) => change("endsAt", e.target.value)}
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {geographic && (
          <>
            <div className="drawing-tools">
              <button
                type="button"
                className={mode === "polygon" ? "selected" : ""}
                onClick={() => setMode("polygon")}
              >
                Polígono
              </button>
              <button
                type="button"
                className={mode === "point" ? "selected" : ""}
                onClick={() => setMode("point")}
              >
                Punto de referencia
              </button>
              <button
                type="button"
                className={mode === "circle" ? "selected" : ""}
                onClick={() => setMode("circle")}
              >
                Círculo
              </button>
              <button
                type="button"
                onClick={() => change("points", d.points.slice(0, -1))}
              >
                Deshacer vértice
              </button>
            </div>
            <p className="form-hint">
              Haz clic para dibujar. Arrastra los vértices para ajustar. Las
              zonas se guardan como polígonos; puntos y círculos son ayudas de
              dibujo.
            </p>
            {mode === "circle" && (
              <div className="toolbar">
                <Field label="Radio (m)">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  />
                </Field>
                <button
                  type="button"
                  disabled={!preview.length || radius < 1 || radius > 1000}
                  onClick={circleToPolygon}
                >
                  Convertir círculo en polígono
                </button>
              </div>
            )}
            <CampusMap
              points={mode === "polygon" ? d.points : preview}
              mode={mode}
              radius={radius}
              color={d.color}
              boundary={d.kind === "boundary" ? [] : (boundary?.points ?? [])}
              onChange={(p) =>
                mode === "polygon" ? change("points", p) : setPreview(p)
              }
            />
            <details className="coordinate-editor">
              <summary>
                Editar coordenadas con teclado ({d.points.length} vértices)
              </summary>
              {d.points.map((point, i) => (
                <div className="coordinate-row" key={i}>
                  <span>{i + 1}</span>
                  {point.map((v, j) => (
                    <input
                      key={j}
                      aria-label={`${j === 0 ? "Latitud" : "Longitud"} del vértice ${i + 1}`}
                      type="number"
                      step="any"
                      min={j === 0 ? -90 : -180}
                      max={j === 0 ? 90 : 180}
                      value={v}
                      onChange={(e) => {
                        const points = d.points.map(
                          (v) => [...v] as Coordinate,
                        );
                        points[i][j] = Number(e.target.value);
                        change("points", points);
                      }}
                    />
                  ))}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  change("points", [...d.points, [4.6282, -74.0644]])
                }
              >
                Añadir vértice
              </button>
            </details>
            {d.kind !== "boundary" && !boundary && (
              <Notice>
                Aún no has preparado un límite de trabajo. La zona se guardará
                sin comprobación de contención; seguirá pendiente la validación
                oficial del servidor.
              </Notice>
            )}
            {d.kind === "boundary" && (
              <Notice>
                Este es un límite de trabajo local. Guardarlo reemplazará el
                borrador de límite anterior, no el límite oficial.
              </Notice>
            )}
          </>
        )}
        {d.kind === "curiosity" && (
          <>
            <Field label={`Imágenes (${d.images.length}/5)`}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={busy}
                onChange={(e) => {
                  void images(e.target.files);
                  e.target.value = "";
                }}
              />
            </Field>
            <div className="image-previews">
              {d.images.map((src, i) => (
                <figure key={i}>
                  <img src={src} alt={`Vista previa ${i + 1}`} />
                  <button
                    type="button"
                    onClick={() =>
                      change(
                        "images",
                        d.images.filter((_, j) => i !== j),
                      )
                    }
                  >
                    Quitar imagen {i + 1}
                  </button>
                </figure>
              ))}
            </div>
          </>
        )}
        {error && <ErrorBox message={error} />}
        <footer className="form-actions">
          <button type="button" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Leyendo imágenes…" : "Guardar borrador local"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

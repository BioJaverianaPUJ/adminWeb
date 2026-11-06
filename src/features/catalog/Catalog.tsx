import { ObservationReviews } from "./ObservationReviews";
import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Leaf,
  TreePine,
  ClipboardCheck,
  ArrowUpRight,
} from "lucide-react";
import type { Species, Specimen } from "../../../shared/types";
import { speciesSchema, specimenSchema } from "../../../shared/validation";
import { api, errorMessage } from "../../lib/api";
import { useResource } from "../../lib/useResource";
import {
  Badge,
  Heading,
  Notice,
  ErrorBox,
  Loading,
  Empty,
  Pager,
  Modal,
  Field,
  Confirm,
} from "../../components/ui";
import { CampusMap } from "../../components/CampusMap";
const health: Record<string, string> = {
  WELL: "Bueno",
  FAIR: "Regular",
  POOR: "Malo",
  DEAD: "Muerto",
};
export function Catalog() {
  const [tab, setTab] = useState<"species" | "specimens" | "reviews">(
      "species",
    ),
    [q, setQ] = useState(""),
    [family, setFamily] = useState(""),
    [speciesId, setSpeciesId] = useState(""),
    [options, setOptions] = useState<Species[]>([]),
    [optionsError, setOptionsError] = useState("");
  const r = useResource<Species | Specimen>(
    tab === "reviews" ? "species" : tab,
    { q, family, speciesId },
  );
  const [edit, setEdit] = useState<Species | Specimen | "new" | null>(null),
    [view, setView] = useState<Species | Specimen | null>(null),
    [remove, setRemove] = useState<Species | Specimen | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    const c = new AbortController();
    api<Species[]>("/options/species", { signal: c.signal })
      .then(setOptions)
      .catch((e) => {
        if (!c.signal.aborted) setOptionsError(errorMessage(e));
      });
    return () => c.abort();
  }, [r.data]);
  const name = (row: Species | Specimen) =>
    "commonName" in row
      ? row.commonName
      : (options.find((s) => s.id === row.speciesId)?.commonName ??
        "Espécimen");
  async function deleteRecord() {
    if (!remove) return;
    setBusy(true);
    setError("");
    try {
      await api(`/resources/${tab}/${remove.id}`, { method: "DELETE" });
      setRemove(null);
      setSuccess("Registro eliminado.");
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function changeTab(t: typeof tab) {
    setTab(t);
    setQ("");
    setFamily("");
    setSpeciesId("");
    setSuccess("");
  }
  return (
    <>
      <Heading
        eyebrow="CATÁLOGO OFICIAL"
        title="Conoce. Registra."
        accent="Conserva."
        description="La biodiversidad del campus, organizada en un solo lugar."
        action={
          tab !== "reviews" && (
            <button className="primary" onClick={() => setEdit("new")}>
              <Plus size={18} />
              {tab === "species" ? "Nueva especie" : "Nuevo espécimen"}
            </button>
          )
        }
      />
      <div className="catalog-summary">
        <div className="glass summary-card">
          <div className="icon-tile">
            <Leaf />
          </div>
          <div>
            <span>Inventario oficial</span>
            <strong>
              {r.data && !r.error
                ? r.data.pagination.totalElements.toLocaleString("es-CO")
                : "—"}{" "}
              <small>
                {tab === "specimens" ? "especímenes" : "especies"}
                {q || family || speciesId ? " filtrados" : ""}
              </small>
            </strong>
          </div>
        </div>
        <div className="glass summary-note">
          <span className="eyebrow">UN CAMPUS VIVO</span>
          <p>Cada registro ayuda a conocer y proteger lo que nos rodea.</p>
          <ArrowUpRight />
        </div>
      </div>
      <div className="tabs" aria-label="Categorías del catálogo">
        <button
          className={tab === "species" ? "selected" : ""}
          onClick={() => changeTab("species")}
        >
          <Leaf size={16} />
          Especies
        </button>
        <button
          className={tab === "specimens" ? "selected" : ""}
          onClick={() => changeTab("specimens")}
        >
          <TreePine size={16} />
          Especímenes
        </button>
        <button
          className={tab === "reviews" ? "selected" : ""}
          onClick={() => changeTab("reviews")}
        >
          <ClipboardCheck size={16} />
          Solicitudes de revisión
        </button>
      </div>
      {success && (
        <div role="status" className="success">
          {success}
        </div>
      )}
      {tab === "reviews" ? (
        <ObservationReviews />
      ) : (
        <section className="glass data-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">BIODIVERSIDAD JAVERIANA</p>
              <h2>
                {tab === "species"
                  ? "Especies del campus"
                  : "Especímenes oficiales"}
              </h2>
            </div>
            <Badge tone="live">Conectado al backend</Badge>
          </div>
          <div className="toolbar">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Buscar especie"
                placeholder="Buscar por nombre común o científico…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por familia"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="">Todas las familias</option>
              {[...new Set(options.map((s) => s.family))].sort().map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            {tab === "specimens" && (
              <select
                aria-label="Filtrar por especie"
                value={speciesId}
                onChange={(e) => setSpeciesId(e.target.value)}
              >
                <option value="">Todas las especies</option>
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.commonName}
                  </option>
                ))}
              </select>
            )}
          </div>
          {optionsError && (
            <Notice>
              No pudimos cargar las opciones de especies: {optionsError}
            </Notice>
          )}
          {r.busy ? (
            <Loading />
          ) : r.error ? (
            <ErrorBox message={r.error} retry={r.reload} />
          ) : r.data?.content.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{tab === "species" ? "Especie" : "Espécimen"}</th>
                    <th>{tab === "species" ? "Familia" : "Ubicación"}</th>
                    <th>
                      {tab === "species"
                        ? "Densidad (g/cm³)"
                        : "Estado de salud"}
                    </th>
                    <th className="actions-heading">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {r.data.content.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="record-name">
                          <div className="record-icon">
                            <Leaf size={19} />
                          </div>
                          <div>
                            <strong>{name(row)}</strong>
                            <small>
                              {"scientificName" in row ? (
                                <i>{row.scientificName}</i>
                              ) : (
                                row.id.slice(0, 8)
                              )}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {"family" in row
                          ? row.family
                          : `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`}
                      </td>
                      <td>
                        {"woodDensity" in row ? (
                          (row.woodDensity ?? "Sin dato")
                        ) : (
                          <Badge>
                            {health[row.healthStatus ?? ""] ?? "Sin dato"}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            title="Ver detalles"
                            aria-label={`Ver ${name(row)}`}
                            onClick={() => setView(row)}
                          >
                            <Eye size={17} />
                          </button>
                          <button
                            title="Editar"
                            aria-label={`Editar ${name(row)}`}
                            onClick={() => setEdit(row)}
                          >
                            <Pencil size={17} />
                          </button>
                          <button
                            title="Eliminar"
                            aria-label={`Eliminar ${name(row)}`}
                            onClick={() => {
                              setRemove(row);
                              setError("");
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
            <Empty
              title={
                q || family || speciesId
                  ? "No encontramos coincidencias"
                  : "El catálogo está listo para crecer"
              }
            >
              Los registros aparecerán aquí cuando estén disponibles en el
              servidor.
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
      {edit && (
        <CatalogEditor
          key={typeof edit === "string" ? "new" : edit.id}
          resource={tab === "species" ? "species" : "specimens"}
          item={edit === "new" ? undefined : edit}
          options={options}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            setSuccess("Cambios guardados en el servidor.");
            r.reload();
          }}
        />
      )}
      {view && (
        <Modal title={name(view)} onClose={() => setView(null)}>
          <dl className="details">
            {"scientificName" in view ? (
              <>
                <dt>Nombre científico</dt>
                <dd>
                  <i>{view.scientificName}</i>
                </dd>
                <dt>Familia</dt>
                <dd>{view.family}</dd>
                <dt>Densidad de madera</dt>
                <dd>{view.woodDensity ?? "Sin dato"} g/cm³</dd>
              </>
            ) : (
              <>
                <dt>Estado</dt>
                <dd>{health[view.healthStatus ?? ""] ?? "Sin dato"}</dd>
                <dt>Altura</dt>
                <dd>{view.height ?? "Sin dato"} m</dd>
                <dt>Circunferencia</dt>
                <dd>{view.circumference ?? "Sin dato"} m</dd>
                <dt>Notas</dt>
                <dd>{view.notes}</dd>
                <dt>Fecha de observación</dt>
                <dd>
                  {view.observationDate
                    ? new Date(view.observationDate).toLocaleString("es-CO")
                    : "Sin dato"}
                </dd>
              </>
            )}
            <dt>Identificador</dt>
            <dd>{view.id}</dd>
          </dl>
          {"latitude" in view && (
            <CampusMap points={[[view.latitude, view.longitude]]} />
          )}
        </Modal>
      )}
      {remove && (
        <Confirm
          title={`Eliminar ${name(remove)}`}
          description={
            tab === "species"
              ? "Esta acción es permanente. Si tiene especímenes asociados, el panel impedirá eliminarla hasta que el backend implemente la eliminación en cascada."
              : "El registro se eliminará del servidor. Esta acción no se puede deshacer."
          }
          busy={busy}
          error={error}
          onConfirm={deleteRecord}
          onClose={() => setRemove(null)}
        />
      )}
    </>
  );
}
function CatalogEditor({
  resource,
  item,
  options,
  onClose,
  onSaved,
}: {
  resource: "species" | "specimens";
  item?: Species | Specimen;
  options: Species[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const specimen = item && "latitude" in item ? item : undefined;
  const [points, setPoints] = useState<[number, number][]>(
      specimen ? [[specimen.latitude, specimen.longitude]] : [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
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
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const value = (key: string) => String(f.get(key) ?? "").trim();
    const number = (key: string) =>
      value(key) === "" ? null : Number(value(key));
    const body =
      resource === "species"
        ? {
            scientificName: value("scientificName"),
            commonName: value("commonName"),
            family: value("family"),
            woodDensity: number("woodDensity"),
          }
        : {
            speciesId: specimen?.speciesId ?? value("speciesId"),
            latitude: points[0]?.[0],
            longitude: points[0]?.[1],
            circumference: number("circumference"),
            height: number("height"),
            healthStatus: value("healthStatus"),
            notes: value("notes"),
            observationDate: value("observationDate")
              ? new Date(value("observationDate")).toISOString()
              : "",
          };
    const parsed = (
      resource === "species" ? speciesSchema : specimenSchema
    ).safeParse(body);
    if (!parsed.success) {
      setError(
        "Completa los campos obligatorios con valores válidos. Selecciona una ubicación cuando corresponda.",
      );
      return;
    }
    if (resource === "specimens" && !item) {
      setError(
        "El formulario está listo. El alta se habilitará cuando el backend incorpore el límite del campus y la detección de duplicados.",
      );
      return;
    }
    const payload = { ...parsed.data } as Record<string, unknown>;
    if (resource === "specimens" && item) delete payload.speciesId;
    setBusy(true);
    try {
      await api(`/resources/${resource}${item ? "/" + item.id : ""}`, {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const species = item && "scientificName" in item ? item : undefined;
  return (
    <Modal
      title={`${item ? "Editar" : "Nuevo registro de"} ${resource === "species" ? "especie" : "espécimen"}`}
      onClose={close}
    >
      <form onSubmit={submit} onChange={() => setDirty(true)}>
        <p className="form-hint">Los campos con * son obligatorios.</p>
        <div className="form-grid">
          {resource === "species" ? (
            <>
              <Field label="Nombre científico *">
                <input
                  name="scientificName"
                  required
                  maxLength={180}
                  defaultValue={species?.scientificName}
                />
              </Field>
              <Field label="Nombre común *">
                <input
                  name="commonName"
                  required
                  maxLength={180}
                  defaultValue={species?.commonName}
                />
              </Field>
              <Field label="Familia *">
                <input
                  name="family"
                  required
                  maxLength={120}
                  defaultValue={species?.family}
                />
              </Field>
              <Field label="Densidad de madera (g/cm³)">
                <input
                  name="woodDensity"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={species?.woodDensity ?? ""}
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label="Especie *"
                hint={
                  item
                    ? "El contrato actual no permite cambiar la especie de un ejemplar."
                    : undefined
                }
              >
                <select
                  name="speciesId"
                  required
                  defaultValue={specimen?.speciesId ?? ""}
                  disabled={!!item}
                >
                  <option value="">Seleccionar especie</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.commonName} · {s.scientificName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado de salud *">
                <select
                  name="healthStatus"
                  defaultValue={specimen?.healthStatus ?? "WELL"}
                >
                  {Object.entries(health).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Altura (m)">
                <input
                  name="height"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={specimen?.height ?? ""}
                />
              </Field>
              <Field label="Circunferencia (m)">
                <input
                  name="circumference"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={specimen?.circumference ?? ""}
                />
              </Field>
              <Field label="Fecha de observación *">
                <input
                  name="observationDate"
                  type="datetime-local"
                  required
                  defaultValue={
                    specimen?.observationDate
                      ? localDate(specimen.observationDate)
                      : ""
                  }
                />
              </Field>
              <Field label="Notas *">
                <textarea
                  name="notes"
                  required
                  maxLength={5000}
                  defaultValue={specimen?.notes}
                />
              </Field>
            </>
          )}
        </div>
        {resource === "specimens" && (
          <>
            <Notice>
              {item
                ? "Puedes editar los atributos. La ubicación queda protegida hasta disponer del límite oficial del campus."
                : "El alta requiere validación del límite del campus y detección de duplicados en el backend. Puedes preparar y validar los datos."}
            </Notice>
            <CampusMap
              points={points}
              mode={item ? "view" : "point"}
              onChange={(p) => {
                setPoints(p);
                setDirty(true);
              }}
            />
            <div className="form-grid">
              <Field label="Latitud *">
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={points[0]?.[0] ?? ""}
                  readOnly={!!item}
                  onChange={(e) =>
                    setPoints([
                      [Number(e.target.value), points[0]?.[1] ?? -74.0644],
                    ])
                  }
                />
              </Field>
              <Field label="Longitud *">
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={points[0]?.[1] ?? ""}
                  readOnly={!!item}
                  onChange={(e) =>
                    setPoints([
                      [points[0]?.[0] ?? 4.6282, Number(e.target.value)],
                    ])
                  }
                />
              </Field>
            </div>
          </>
        )}
        {error && <ErrorBox message={error} />}
        <footer className="form-actions">
          <button type="button" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Guardando…"
              : resource === "specimens" && !item
                ? "Validar formulario"
                : "Guardar cambios"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function localDate(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

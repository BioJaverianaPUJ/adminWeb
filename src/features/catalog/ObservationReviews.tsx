import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import {
  Badge,
  ErrorBox,
  Loading,
  Empty,
  Pager,
  Modal,
  Notice,
} from "../../components/ui";
import { CampusMap } from "../../components/CampusMap";
interface Observation {
  id: string;
  latitude: number;
  longitude: number;
  checked: boolean;
  revisionRequested: boolean;
  speciesCommonName: string | null;
  certainty: number | null;
  observationType: "PLANT" | "ANIMAL" | null;
  imageUrl: string | null;
  createdAt: string;
}
interface ObservationPage {
  content: Observation[];
  page: number;
  totalPages: number;
  totalElements: number;
}
export function ObservationReviews() {
  const [page, setPage] = useState(0),
    [onlyRequested, setOnlyRequested] = useState(true);
  const [data, setData] = useState<ObservationPage | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Observation | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    api<ObservationPage>(
      `/observations?page=${page}&size=12&revisionRequested=${onlyRequested}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, onlyRequested, revision]);
  return (
    <section className="glass data-panel">
      <div className="panel-title">
        <h2>Observaciones de la comunidad</h2>
        <Badge tone="live">Consulta conectada</Badge>
      </div>
      <div className="toolbar">
        <label>
          <input
            type="checkbox"
            checked={onlyRequested}
            onChange={(e) => {
              setOnlyRequested(e.target.checked);
              setPage(0);
            }}
          />{" "}
          Solo solicitudes de revisión
        </label>
        <button onClick={() => setRevision((v) => v + 1)} disabled={loading}>
          Actualizar
        </button>
      </div>
      <Notice>
        La revisión permite consultar la observación. No modifica su
        identificación ni acredita una verificación oficial.
      </Notice>
      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {data && !data.content.length && (
        <Empty title="Sin observaciones">
          No hay resultados para este filtro.
        </Empty>
      )}
      {!!data?.content.length && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Especie identificada</th>
                <th>Tipo</th>
                <th>Reconocimiento</th>
                <th>Revisión</th>
                <th>Fecha</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((o) => (
                <tr key={o.id}>
                  <td>{o.speciesCommonName || "Sin identificar"}</td>
                  <td>
                    {o.observationType === "PLANT"
                      ? "Planta"
                      : o.observationType === "ANIMAL"
                        ? "Animal"
                        : "Sin resultado"}
                  </td>
                  <td>{o.checked ? "Procesado" : "Sin completar"}</td>
                  <td>
                    {o.revisionRequested ? "Solicitada" : "No solicitada"}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString("es-CO")}</td>
                  <td>
                    <button onClick={() => setSelected(o)}>
                      Ver observación
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <Pager
          page={page}
          total={data.totalPages}
          count={data.totalElements}
          onPage={setPage}
        />
      )}
      {selected && (
        <Modal
          title={selected.speciesCommonName || "Observación"}
          onClose={() => setSelected(null)}
        >
          <p>
            Reconocimiento: {selected.checked ? "procesado" : "sin completar"}.
            La respuesta no incluye el estado de verificación oficial.
          </p>
          <p>Puntuación del modelo: {selected.certainty ?? "No disponible"}</p>
          {selected.imageUrl?.startsWith("https://") && (
            <img
              className="observation-photo"
              src={selected.imageUrl}
              alt={`Fotografía de ${selected.speciesCommonName || "la observación"}`}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          )}
          {selected.imageUrl?.startsWith("https://") && (
            <a
              href={selected.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Abrir fotografía de la observación
            </a>
          )}
          <p>
            {selected.latitude}, {selected.longitude}
          </p>
          <CampusMap points={[[selected.latitude, selected.longitude]]} />
        </Modal>
      )}
    </section>
  );
}

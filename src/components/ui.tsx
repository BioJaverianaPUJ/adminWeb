import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  LoaderCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Sprout,
} from "lucide-react";
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Heading({
  eyebrow,
  title,
  accent,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title} <em>{accent}</em>
        </h1>
        <p className="lede">{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <AlertCircle size={19} />
      <div>{children}</div>
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      <AlertCircle />
      <span>{message}</span>
      {retry && <button onClick={retry}>Reintentar</button>}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Cargando información…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="icon-tile">
        <Sprout />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Pager({
  page,
  total,
  count,
  onPage,
}: {
  page: number;
  total: number;
  count: number;
  onPage: (n: number) => void;
}) {
  return (
    <footer className="pager">
      <span>
        {count.toLocaleString("es-CO")} registros · Página{" "}
        {total ? page + 1 : 0} de {total}
      </span>
      <div>
        <button
          aria-label="Página anterior"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          aria-label="Página siguiente"
          disabled={page + 1 >= total}
          onClick={() => onPage(page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </footer>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="Cerrar" onClick={onClose}>
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Confirm({
  title,
  description,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <p className="lede">{description}</p>
      {error && <ErrorBox message={error} />}
      <footer className="form-actions">
        <button onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button className="danger" onClick={onConfirm} disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="spin" size={16} /> Aplicando…
            </>
          ) : (
            "Confirmar cambio"
          )}
        </button>
      </footer>
    </Modal>
  );
}

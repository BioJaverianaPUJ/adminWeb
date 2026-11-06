import type { Draft } from "../../../shared/types";
import { draftSchema } from "../../../shared/validation";
const key = (userId: string) => `bio-admin-drafts-v1:${userId}`;
export function readDrafts(userId: string): Draft[] {
  const raw = localStorage.getItem(key(userId));
  if (!raw) return [];
  const data = JSON.parse(raw);
  const result = draftSchema.array().safeParse(data);
  if (!result.success)
    throw Error(
      "Los borradores guardados no tienen el formato esperado. No se han sobrescrito.",
    );
  return result.data;
}
export function writeDrafts(userId: string, drafts: Draft[]) {
  localStorage.setItem(key(userId), JSON.stringify(drafts));
}
export function newDraft(kind: Draft["kind"]): Draft {
  return {
    id: crypto.randomUUID(),
    kind,
    title: "",
    description: "",
    color: "#cddd80",
    points: [],
    xp: 5,
    period: "DAILY",
    target: 1,
    objective: "",
    zoneId: "",
    startsAt: "",
    endsAt: "",
    images: [],
    updatedAt: new Date().toISOString(),
  };
}
export function exportDraft(draft: Draft) {
  const blob = new Blob(
    [JSON.stringify({ status: "LOCAL_DRAFT_NOT_PUBLISHED", draft }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biojaveriana-${draft.kind}-${draft.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

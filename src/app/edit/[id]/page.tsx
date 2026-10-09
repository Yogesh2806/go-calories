"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useGuard } from "@/lib/app";
import Shell, { BackHeader, Splash } from "@/components/Shell";
import Icon from "@/components/Icon";
import { ItemEditor, draftValid, fromDraft, toDraft, type Draft } from "@/components/ui";
import type { Entry } from "@/lib/types";

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const ok = useGuard();
  const app = useApp();
  if (!ok) return <Splash />;
  const entry = app.entries.find((e) => e.id === id);
  if (!entry) {
    return (
      <Shell nav={false} narrow>
        <BackHeader title="Edit logged item" onBack={() => window.history.back()} />
        <p className="muted">That item isn&apos;t in your log anymore.</p>
      </Shell>
    );
  }
  return <EditForm key={entry.id} entry={entry} />;
}

function EditForm({ entry }: { entry: Entry }) {
  const app = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(entry));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = () => (window.history.length > 1 ? router.back() : router.push("/"));

  return (
    <Shell nav={false} narrow>
      <BackHeader
        title="Edit logged item"
        onBack={back}
        right={
          <button
            type="button"
            className="btn"
            style={{ width: "auto", minHeight: 38, padding: "0 18px", fontSize: 14 }}
            disabled={!draftValid(draft) || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await app.updateEntry({ ...entry, ...fromDraft(draft) });
                back();
              } catch {
                setBusy(false);
              }
            }}
          >
            Save
          </button>
        }
      />
      <ItemEditor draft={draft} onChange={setDraft} />
      <button
        type="button"
        className="btn danger"
        disabled={busy}
        onClick={async () => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            return;
          }
          setBusy(true);
          try {
            await app.deleteEntry(entry.id);
            back();
          } catch {
            setBusy(false);
          }
        }}
      >
        <Icon name="trash" size={18} />
        {confirmDelete ? "Tap again to delete" : "Delete from log"}
      </button>
    </Shell>
  );
}

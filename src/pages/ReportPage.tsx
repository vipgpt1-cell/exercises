import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Minus,
  Share2,
  Upload,
} from "lucide-react";
import { AppLayout, PageHeader } from "../components/Layout";
import {
  Button,
  Callout,
  Card,
  LevelBadge,
  Modal,
  SectionTitle,
  Spinner,
  cx,
} from "../components/ui";
import { Sparkline } from "../components/analyticsCharts";
import { FIELDS } from "../catalog/fields";
import type { FieldId } from "../catalog/types";
import { Link } from "../lib/router";
import { useLang, useStrings } from "../lib/i18n";
import {
  makeBackup,
  restoreBackup,
  updatePerson,
  useLogs,
  usePerson,
  useResults,
} from "../lib/store";
import {
  canShareFile,
  copyText,
  downloadBlob,
  hostCanSave,
  isAndroidWebView,
  isoDay,
  sendToHost,
  shareFile,
  viewerDownloads,
} from "../lib/files";
import { buildReport, reportText, resultsCsv } from "../features/report/model";
import { common } from "../i18n/common";
import { reportStrings } from "../i18n/report";

const CHART_COLOR: Record<FieldId, string> = {
  hearing: "var(--chart-hearing)",
  memory: "var(--chart-memory)",
  hands: "var(--chart-hands)",
  spine: "var(--chart-spine)",
};

type Msg = { tone: "success" | "danger" | "info"; text: string } | null;

function Action({
  icon,
  title,
  hint,
  onClick,
  busy,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-line-strong active:scale-[0.99] disabled:opacity-60 sm:flex-col sm:items-start sm:gap-2.5 sm:p-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {busy ? <Spinner className="h-4 w-4" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
}

export function ReportPage() {
  const lang = useLang();
  const t = useStrings(common);
  const s = useStrings(reportStrings);
  const results = useResults();
  const logs = useLogs();
  const person = usePerson();
  const model = useMemo(
    () => buildReport(results, logs, person, lang),
    [results, logs, person, lang],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [dataMsg, setDataMsg] = useState<Msg>(null);
  const [ready, setReady] = useState<{ blob: Blob; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Hands a file to the app, the share sheet or the browser, whichever is available. */
  const deliver = async (blob: Blob, name: string, setM: (m: Msg) => void) => {
    const viewer = await viewerDownloads();
    if (viewer) {
      try {
        await viewer.save({ filename: name, data: blob });
        setM({ tone: "success", text: s.saved });
      } catch (e) {
        if ((e as { code?: string })?.code !== "declined")
          setM({ tone: "danger", text: s.failed });
      }
      return;
    }
    if (hostCanSave()) {
      setM(
        (await sendToHost(blob, name))
          ? { tone: "success", text: s.sentToApp }
          : { tone: "danger", text: s.failed },
      );
      return;
    }
    if (isAndroidWebView()) {
      setM({ tone: "info", text: s.cantSave });
      return;
    }
    setReady({ blob, name });
  };

  const makePdf = async () => {
    setBusy("pdf");
    setMsg(null);
    try {
      const { buildPdf } = await import("../features/report/pdf");
      await deliver(
        await buildPdf(model),
        `${s.fileName}-${isoDay()}.pdf`,
        setMsg,
      );
    } catch (e) {
      console.error(e);
      setMsg({ tone: "danger", text: s.failed });
    }
    setBusy(null);
  };
  const makeCsv = async () => {
    setMsg(null);
    await deliver(
      new Blob([resultsCsv(results, logs, lang)], {
        type: "text/csv;charset=utf-8",
      }),
      `${s.fileName}-${isoDay()}.csv`,
      setMsg,
    );
  };
  const copy = async () => {
    setMsg(
      (await copyText(reportText(model)))
        ? { tone: "success", text: s.copied }
        : { tone: "danger", text: s.copyFailed },
    );
  };
  const exportBackup = async () => {
    setDataMsg(null);
    await deliver(
      new Blob([JSON.stringify(makeBackup())], { type: "application/json" }),
      `backup-${isoDay()}.json`,
      setDataMsg,
    );
  };

  const hasData = results.length > 0;

  return (
    <AppLayout>
      <div className="animate-fade-up">
        <PageHeader title={s.title} subtitle={s.subtitle} back={false} />

        <div className="mx-auto max-w-3xl space-y-4">
          {/* The report itself */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-tight text-ink">
                  {model.title}
                </h2>
                <div className="mt-0.5 text-sm text-muted">
                  {s.generated}: {model.generated}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("send")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 text-sm font-semibold text-primary transition hover:brightness-95"
              >
                <Share2 className="h-4 w-4" />
                {s.sendShort}
              </button>
            </div>

            <div className="grid gap-3 border-b border-line py-4 sm:grid-cols-[1.4fr_1fr]">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">
                  {s.nameLabel}
                </span>
                <input
                  id="report-name"
                  value={person.name}
                  maxLength={80}
                  onChange={(e) => updatePerson({ name: e.target.value })}
                  placeholder={s.namePlaceholder}
                  autoComplete="name"
                  className="h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </label>
              <dl className="grid grid-cols-3 gap-2 text-sm">
                {[
                  [s.age, model.person.find((p) => p.label === s.age)?.value],
                  [s.sex, model.person.find((p) => p.label === s.sex)?.value],
                  [s.hand, model.person.find((p) => p.label === s.hand)?.value],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="mt-1 font-semibold text-ink">{v ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 py-3 text-sm text-ink-2">
              <span>
                {s.testsTaken}: <b className="text-ink">{model.taken}</b> /{" "}
                {model.total}
              </span>
              <span>
                {s.exercises30}:{" "}
                <b className="text-ink">
                  {model.exTimes
                    ? s.exSummary(model.exTimes, model.exMinutes)
                    : s.noExercises}
                </b>
              </span>
            </div>

            {!hasData && <p className="py-4 text-muted">{s.noData}</p>}

            {model.sections.map((sec) => {
              const f = FIELDS.find((x) => x.id === sec.field)!;
              return (
                <section key={sec.field} className={cx("mt-4", f.accent)}>
                  <h3 className="mb-1 flex items-center gap-2 font-bold text-ink">
                    <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--accent)]" />
                    {sec.name}
                  </h3>
                  <div className="divide-y divide-line/70">
                    {sec.rows.map((r) => (
                      <Link
                        key={r.testId}
                        to={
                          r.taken ? `/history/${r.testId}` : `/test/${r.testId}`
                        }
                        className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 py-2.5 sm:grid-cols-[1.3fr_1fr_5rem]"
                      >
                        <div className="min-w-0">
                          <div
                            className={cx(
                              "font-medium",
                              r.taken ? "text-ink" : "text-muted",
                            )}
                          >
                            {r.name}
                          </div>
                          {r.taken && (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                              <LevelBadge
                                level={r.level!}
                                size="sm"
                                label={r.label}
                              />
                              <span>{r.date}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right sm:text-left">
                          {r.taken ? (
                            <>
                              <div className="tabular text-sm font-bold text-ink">
                                {r.value}{" "}
                                <span className="text-xs font-medium text-muted">
                                  {r.unit}
                                </span>
                              </div>
                              {r.change ? (
                                <div
                                  className={cx(
                                    "mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold",
                                    r.change.better === null
                                      ? "text-muted"
                                      : r.change.better
                                        ? "text-great"
                                        : "text-attention",
                                  )}
                                >
                                  {r.change.better === null ? (
                                    <Minus className="h-3 w-3" />
                                  ) : r.change.text.startsWith("−") ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowUpRight className="h-3 w-3" />
                                  )}
                                  {r.change.text}
                                </div>
                              ) : (
                                <div className="mt-0.5 text-xs text-muted">
                                  {s.firstTime}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted">
                              {s.notTaken}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 hidden sm:col-span-1 sm:block">
                          {r.series.length >= 2 && (
                            <Sparkline
                              values={r.series}
                              color={CHART_COLOR[sec.field]}
                              height={30}
                            />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  {sec.exercises.length > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {s.exercises30}:{" "}
                      {sec.exercises
                        .map(
                          (e) =>
                            `${e.name} — ${s.exSummary(e.times, e.minutes)}`,
                        )
                        .join("; ")}
                    </p>
                  )}
                </section>
              );
            })}
            <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              {s.footer} {t.disclaimer}
            </p>
          </Card>

          {/* Sending, right after the report */}
          <Card id="send" className="scroll-mt-4 p-4 sm:p-5">
            <SectionTitle>{s.send}</SectionTitle>
            <p className="-mt-1.5 mb-3 text-sm text-muted">{s.sendText}</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <Action
                icon={<FileText className="h-5 w-5" />}
                title={s.pdf}
                hint={busy === "pdf" ? s.preparing : s.pdfHint}
                onClick={makePdf}
                busy={busy === "pdf"}
              />
              <Action
                icon={<Copy className="h-5 w-5" />}
                title={s.text}
                hint={s.textHint}
                onClick={copy}
              />
              <Action
                icon={<FileSpreadsheet className="h-5 w-5" />}
                title={s.csv}
                hint={s.csvHint}
                onClick={makeCsv}
              />
            </div>
            {msg && (
              <Callout
                tone={
                  msg.tone === "danger"
                    ? "danger"
                    : msg.tone === "success"
                      ? "success"
                      : "info"
                }
                className="mt-3"
              >
                {msg.text}
              </Callout>
            )}
          </Card>

          {/* Backup */}
          <Card className="p-4 sm:p-5">
            <SectionTitle>{s.data}</SectionTitle>
            <p className="-mt-1.5 mb-3 text-sm text-muted">{s.dataText}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                icon={<Download className="h-4 w-4" />}
                onClick={exportBackup}
              >
                {s.exportBackup}
              </Button>
              <Button
                variant="secondary"
                icon={<Upload className="h-4 w-4" />}
                onClick={() => fileRef.current?.click()}
              >
                {s.importBackup}
              </Button>
            </div>
            <input
              ref={fileRef}
              id="backup-file"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const n = restoreBackup(JSON.parse(await file.text()));
                  setDataMsg({
                    tone: "success",
                    text: n ? s.imported(n) : s.importedNone,
                  });
                } catch {
                  setDataMsg({ tone: "danger", text: s.importError });
                }
              }}
            />
            {dataMsg && (
              <Callout
                tone={
                  dataMsg.tone === "danger"
                    ? "danger"
                    : dataMsg.tone === "success"
                      ? "success"
                      : "info"
                }
                className="mt-3"
              >
                {dataMsg.text}
              </Callout>
            )}
          </Card>
        </div>
      </div>

      <Modal open={!!ready} onClose={() => setReady(null)} title={s.ready}>
        <p className="text-sm">{s.readyText}</p>
        <div className="mt-4 grid gap-2">
          {ready && canShareFile(ready.blob, ready.name) && (
            <Button
              variant="primary"
              size="lg"
              icon={<Share2 className="h-5 w-5" />}
              onClick={async () => {
                const r = ready;
                if (!r) return;
                const res = await shareFile(r.blob, r.name, model.title);
                if (res !== "cancelled") setReady(null);
              }}
            >
              {s.share}
            </Button>
          )}
          <Button
            variant="secondary"
            size="lg"
            icon={<Download className="h-5 w-5" />}
            onClick={() => {
              if (ready) downloadBlob(ready.blob, ready.name);
              setReady(null);
            }}
          >
            {s.download}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}

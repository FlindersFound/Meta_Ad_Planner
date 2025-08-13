
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

const FF_BLUE = "#008ACE";
const FF_DARK = "#005781";
const FF_GREEN = "#C1D32F";

type ScenarioName = "Scenario A" | "Scenario B" | "Scenario C";
type SolveFor = "cvr" | "ctr" | "cpm";

interface ScenarioConfig {
  name: ScenarioName;
  color: string;
  useGlobal: {
    spend: boolean;
    cpm: boolean;
    ctr: boolean;
    cvr: boolean;
    avgGift: boolean;
    fpp: boolean;
  };
  spend?: number;
  cpm?: number;
  ctr?: number;
  cvr?: number;
  avgGift?: number;
  fpp?: number;
  mode: "derived" | "locked";
  manualCPA?: number;
  solveFor?: SolveFor;
  preset?: PresetKey;
}

const presets = {
  conservative: { label: "Conservative", cpm: 15, ctr: 0.008, cvr: 0.012 },
  midpoint: { label: "Midpoint", cpm: 12.5, ctr: 0.01, cvr: 0.02 },
  meta: { label: "Meta Bench", cpm: 12, ctr: 0.015, cvr: 0.025 },
} as const;

type PresetKey = keyof typeof presets | "inherit";

export default function MetaPaidAdsPlanner() {
  const [gSpend, setGSpend] = useState(5000);
  const [gCpm, setGCpm] = useState(12.5);
  const [gCtr, setGCtr] = useState(0.01);
  const [gCvr, setGCvr] = useState(0.02);
  const [gAvgGift, setGAvgGift] = useState(62.5);
  const [gFpp, setGFpp] = useState(2000);

  const [presetKey, setPresetKey] = useState<keyof typeof presets>("midpoint");
  function applyPreset(key: keyof typeof presets) {
    setPresetKey(key);
    setGCpm(presets[key].cpm);
    setGCtr(presets[key].ctr);
    setGCvr(presets[key].cvr);
  }

  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    { name: "Scenario A", color: FF_GREEN, useGlobal: { spend: true, cpm: true, ctr: true, cvr: true, avgGift: true, fpp: true }, mode: "derived", manualCPA: 800, solveFor: "cvr", preset: "inherit" },
    { name: "Scenario B", color: FF_BLUE,  useGlobal: { spend: true, cpm: true, ctr: true, cvr: true, avgGift: true, fpp: true }, mode: "derived", manualCPA: 400, solveFor: "cvr", preset: "inherit" },
    { name: "Scenario C", color: FF_DARK,  useGlobal: { spend: true, cpm: true, ctr: true, cvr: true, avgGift: true, fpp: true }, mode: "derived", manualCPA: 50,  solveFor: "cvr", preset: "inherit" },
  ]);

  const updateScenario = (i: number, patch: Partial<ScenarioConfig>) =>
    setScenarios((prev) => prev.map((s, idx) => (i === idx ? { ...s, ...patch } : s)));
  const updateUseGlobal = (i: number, key: keyof ScenarioConfig["useGlobal"], val: boolean) =>
    setScenarios((prev) => prev.map((s, idx) => (i === idx ? { ...s, useGlobal: { ...s.useGlobal, [key]: val } } : s)));

  function applyScenarioPreset(i: number, key: PresetKey) {
    if (key === "inherit") {
      updateScenario(i, { preset: "inherit", useGlobal: { ...scenarios[i].useGlobal, cpm: true, ctr: true, cvr: true } });
      return;
    }
    const p = presets[key as keyof typeof presets];
    updateScenario(i, { preset: key, cpm: p.cpm, ctr: p.ctr, cvr: p.cvr, useGlobal: { ...scenarios[i].useGlobal, cpm: false, ctr: false, cvr: false } });
  }

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  type Eff = {
    name: ScenarioName; color: string;
    spend: number; cpm: number; ctr: number; cvr: number; avgGift: number; fpp: number;
    cpa: number | null;
    solved?: { key: SolveFor; value: number; outOfBounds?: boolean };
  };

  const effective: Eff[] = useMemo(() => {
    return scenarios.map((s) => {
      let spend = s.useGlobal.spend ? gSpend : s.spend ?? gSpend;
      let cpm   = s.useGlobal.cpm   ? gCpm   : s.cpm   ?? gCpm;
      let ctr   = s.useGlobal.ctr   ? gCtr   : s.ctr   ?? gCtr;
      let cvr   = s.useGlobal.cvr   ? gCvr   : s.cvr   ?? gCvr;
      const avgGift = s.useGlobal.avgGift ? gAvgGift : s.avgGift ?? gAvgGift;
      const fpp     = s.useGlobal.fpp     ? gFpp     : s.fpp     ?? gFpp;

      let cpa: number | null = null;
      let solved: Eff["solved"] | undefined;
      const eps = 1e-12;

      if (s.mode === "derived") {
        if (cpm > 0 && ctr > 0 && cvr > 0) cpa = cpm / (1000 * ctr * cvr);
        else cpa = null;
      } else {
        const manual = s.manualCPA && s.manualCPA > 0 ? s.manualCPA : null;
        const target = (s.solveFor ?? "cvr") as SolveFor;
        if (manual) {
          if (target === "cvr") {
            const val = ctr > eps && manual > eps ? cpm / (1000 * ctr * manual) : NaN;
            const clamped = clamp01(val);
            const outOfBounds = !(val >= 0 && val <= 1);
            cvr = isFinite(clamped) ? clamped : 0;
            solved = { key: "cvr", value: val, outOfBounds };
            cpa = manual;
          } else if (target === "ctr") {
            const val = cvr > eps && manual > eps ? cpm / (1000 * cvr * manual) : NaN;
            const clamped = clamp01(val);
            const outOfBounds = !(val >= 0 && val <= 1);
            ctr = isFinite(clamped) ? clamped : 0;
            solved = { key: "ctr", value: val, outOfBounds };
            cpa = manual;
          } else {
            const val = 1000 * ctr * cvr * manual;
            const outOfBounds = !(val >= 0 && isFinite(val));
            cpm = isFinite(val) ? val : 0;
            solved = { key: "cpm", value: val, outOfBounds };
            cpa = manual;
          }
        } else {
          cpa = null;
        }
      }
      return { name: s.name, color: s.color, spend, cpm, ctr, cvr, avgGift, fpp, cpa, solved };
    });
  }, [scenarios, gSpend, gCpm, gCtr, gCvr, gAvgGift, gFpp]);

  const rows = useMemo(() => {
    return effective.map((e) => {
      const impressions = e.cpm > 0 ? (e.spend / e.cpm) * 1000 : 0;
      const clicks = impressions * Math.max(e.ctr, 0);
      const participants = clicks * Math.max(e.cvr, 0);
      const donorsPerParticipant = e.fpp / Math.max(e.avgGift, 0.01);
      const donors = participants * donorsPerParticipant;
      const funds = participants * e.fpp;
      const cpaShown = participants > 0 ? e.spend / participants : null;
      return {
        scenario: e.name, color: e.color, spend: e.spend,
        impressions: Math.floor(impressions),
        clicks: Math.floor(clicks),
        participants: Math.floor(participants),
        donors: Math.floor(donors),
        funds: Math.round(funds),
        roas: e.spend > 0 ? (funds / e.spend) * 100 : null,
        cpaShown,
      };
    });
  }, [effective]);

  const tickFormatter = (val: any) => {
    if (typeof val !== "number") return val;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${val}`;
  };

  const stages = [
    { key: "impressions", label: "Impressions (Reach)" },
    { key: "clicks", label: "Clicks" },
    { key: "participants", label: "Participants" },
    { key: "donors", label: "Donors" },
    { key: "funds", label: "Funds (AUD)" },
  ] as const;

  const exportToExcel = async () => {
    const filename = `Meta_Paid_Ads_Planner_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const triggerBlobDownload = (blob: Blob, name: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };
    const sheetData = scenarios.map((s, idx) => {
      const e = effective[idx]; const r = rows[idx];
      const donorsPerParticipant = e.fpp / Math.max(e.avgGift, 0.01);
      const CPA = e.cpa;
      return {
        Scenario: e.name,
        "Ad Spend": e.spend,
        CPM: e.cpm,
        CTR: e.ctr,
        "CTR %": e.ctr * 100,
        "CVR %": e.cvr * 100,
        "Avg Gift": e.avgGift,
        "Funds Raised per person": e.fpp,
        CPA,
        Impressions: r.impressions,
        Clicks: r.clicks,
        Participants: r.participants,
        Donors: r.donors,
        "Total Funds Raised": r.funds,
        "No. of Donors Per Participant": donorsPerParticipant,
        ROAS: r.roas,
      };
    });
    const chartData = rows.map((r) => ({
      Scenario: r.scenario, Impressions: r.impressions, Clicks: r.clicks,
      Participants: r.participants, Donors: r.donors, "Total Funds Raised": r.funds,
    }));
    const globalsRow = {
      "Global Preset": presets[presetKey].label,
      "Ad Spend": gSpend, CPM: gCpm, CTR: gCtr, "CTR %": gCtr * 100, "CVR %": gCvr * 100,
      "Avg Gift": gAvgGift, "Funds Raised per person": gFpp,
    } as const;
    try {
      const xlsx = await import("xlsx");
      const { utils, write } = xlsx as any;
      const title = [["Meta Paid Ads Planner, scenario A, B, C variables."]];
      const wsTitle = utils.aoa_to_sheet(title);
      const wsData = utils.json_to_sheet(sheetData, { origin: "A2" });
      const colCount = Object.keys(sheetData[0] || {}).length;
      wsTitle["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
      const ws = Object.assign(wsTitle, wsData);
      const lastColLetter = (c => { let s = "", n = c; while (n >= 0) { s = String.fromCharCode((n % 26) + 65) + s; n = Math.floor(n / 26) - 1; } return s; })(colCount - 1);
      ws["!autofilter"] = { ref: `A2:${lastColLetter}${sheetData.length + 2}` };
      (ws as any)["!cols"] = Object.keys(sheetData[0] || {}).map((k) => ({ wch: Math.max(16, String(k).length + 2) }));
      const chartWs = utils.json_to_sheet(chartData);
      (chartWs as any)["!cols"] = Object.keys(chartData[0] || {}).map((k) => ({ wch: Math.max(16, String(k).length + 2) }));
      const globalsWs = utils.json_to_sheet([globalsRow]);
      (globalsWs as any)["!cols"] = Object.keys(globalsRow).map((k) => ({ wch: Math.max(20, String(k).length + 2) }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Scenarios");
      utils.book_append_sheet(wb, chartWs, "Chart Data");
      utils.book_append_sheet(wb, globalsWs, "Globals");
      const wbout: ArrayBuffer = write(wb, { bookType: "xlsx", type: "array" });
      triggerBlobDownload(new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    } catch (err) {
      console.warn("xlsx failed, fallback CSVs:", err);
      const esc = (v: any) => { if (v == null) return ""; const s = String(v); if (/[\",\\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'; return s; };
      const toCSV = (rows: any[]) => { if (!rows.length) return ""; const headers = Object.keys(rows[0]); const lines = [headers.join(",")]; for (const row of rows) lines.push(headers.map((h) => esc((row as any)[h])).join(",")); return lines.join("\\n"); };
      const base = filename.replace(/\\.xlsx$/, "");
      triggerBlobDownload(new Blob([toCSV(sheetData)], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      triggerBlobDownload(new Blob([toCSV(chartData)], { type: "text/csv;charset=utf-8" }), `${base}_ChartData.csv`);
    }
  };

  const GlobalHint = ({ show, text }: { show: boolean; text: string }) => show ? (
    <div className="text-[11px] text-slate-500">Global was: {text}</div>
  ) : null;

  const KPI = ({ label, value }: { label: string; value: string }) => (
    <div className="px-2.5 py-1 rounded-lg bg-slate-50 border text-xs tabular-nums text-slate-700">
      <span className="mr-1 text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Meta Paid Ads Planner</h1>
      </motion.div>

      <Card className="rounded-2xl shadow-sm border-t-4" style={{ borderTopColor: FF_DARK }}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Global Defaults</h2>
              <p className="text-sm text-slate-600">Scenarios inherit these unless you toggle an override in their card.</p>
            </div>
            <div className="flex items-center gap-3">
              <Label>Preset</Label>
              <Select value={presetKey} onValueChange={(v) => applyPreset(v as any)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="midpoint">Midpoint</SelectItem>
                  <SelectItem value="meta">Meta Bench</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label>Ad Spend (A$)</Label>
              <Slider min={500} max={100000} step={500} value={[gSpend]} onValueChange={([v]) => setGSpend(v)} />
              <div className="text-xs text-slate-500">Current: ${gSpend.toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>CPM (A$)</Label>
              <Input className="text-right tabular-nums" type="number" step={0.1} value={gCpm} onChange={(e) => setGCpm(parseFloat(e.target.value || "0"))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>CTR (%)</Label>
              <Input className="text-right tabular-nums" type="number" step={0.01} min={0} max={100} value={Number((gCtr * 100).toFixed(3))} onChange={(e) => setGCtr(parseFloat(e.target.value || "0") / 100)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Click → Sign-up (CVR %)</Label>
              <Input className="text-right tabular-nums" type="number" step={0.01} min={0} max={100} value={Number((gCvr * 100).toFixed(3))} onChange={(e) => setGCvr(parseFloat(e.target.value || "0") / 100)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Average Gift (A$)</Label>
              <Input className="text-right tabular-nums" type="number" step={1} value={gAvgGift} onChange={(e) => setGAvgGift(parseFloat(e.target.value || "0"))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Funds / Participant (A$)</Label>
              <Slider min={200} max={20000} step={50} value={[gFpp]} onValueChange={([v]) => setGFpp(v)} />
              <div className="text-xs text-slate-500">Current: ${gFpp.toLocaleString()}</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 flex gap-2 items-start mt-1">
            <Info size={14} className="mt-0.5" />
            CPM = cost per 1,000 impressions; CTR = click-through rate; CVR = % of clicks that sign up.
            Default average donation sourced from the <em>Raisely 2024 Fundraising Benchmark Report</em>.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s, idx) => {
          const e = effective[idx];
          const presetActive = s.preset && s.preset !== "inherit";
          return (
            <Card key={s.name} className="rounded-2xl shadow-sm border-t-4" style={{ borderTopColor: s.color }}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                    <h3 className="font-semibold">{s.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <KPI label="CPA" value={e.cpa != null ? `$${Math.round(e.cpa).toLocaleString()}` : "—"} />
                    <KPI label="Participants" value={rows[idx].participants.toLocaleString()} />
                    <KPI label="Funds" value={`$${rows[idx].funds.toLocaleString()}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>CPA Mode</Label>
                    <Select value={s.mode} onValueChange={(v) => updateScenario(idx, { mode: v as ScenarioConfig["mode"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="derived">Derived CPA</SelectItem>
                        <SelectItem value="locked">Lock CPA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preset (this scenario)</Label>
                    <Select value={s.preset ?? "inherit"} onValueChange={(v) => applyScenarioPreset(idx, v as PresetKey)}>
                      <SelectTrigger className={presetActive ? "border-emerald-300 bg-emerald-50" : undefined} title={presetActive ? "Applies CPM/CTR/CVR. Toggle 'Use global' to inherit." : undefined}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inherit">Inherit globals</SelectItem>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="midpoint">Midpoint</SelectItem>
                        <SelectItem value="meta">Meta Bench</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {s.mode === "locked" && (
                  <div>
                    <Label>Solve for</Label>
                    <Select value={s.solveFor ?? "cvr"} onValueChange={(v) => updateScenario(idx, { solveFor: v as SolveFor })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cvr">CVR</SelectItem>
                        <SelectItem value="ctr">CTR</SelectItem>
                        <SelectItem value="cpm">CPM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {s.mode === "locked" && (
                  <div>
                    <Label>Manual CPA (A$)</Label>
                    <Input className="text-right tabular-nums" type="number" step={5} value={s.manualCPA ?? 400} onChange={(e) => updateScenario(idx, { manualCPA: parseFloat(e.target.value || "0") })} />
                  </div>
                )}

                {s.mode === "derived" && (
                  <div>
                    <Label>CPA (A$)</Label>
                    <Input className="text-right tabular-nums" type="number" value={e.cpa != null ? e.cpa.toFixed(2) : ""} disabled />
                    <div className="text-xs text-slate-500">Derived from CPM, CTR and CVR.</div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Ad Spend</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.spend} onChange={(e) => updateUseGlobal(idx, "spend", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.useGlobal.spend ? (
                    <div className="text-[11px] text-slate-500">Inherits: ${gSpend.toLocaleString()}</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={100} value={s.spend ?? gSpend} onChange={(e) => updateScenario(idx, { spend: parseFloat(e.target.value || "0") })} />
                      <GlobalHint show={!s.useGlobal.spend} text={`$${gSpend.toLocaleString()}`} />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>CPM</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.cpm} onChange={(e) => updateUseGlobal(idx, "cpm", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.mode === "locked" && s.solveFor === "cpm" ? (
                    <Input className="text-right tabular-nums" type="number" value={e.cpm.toFixed(2)} disabled />
                  ) : s.useGlobal.cpm ? (
                    <div className="text-[11px] text-slate-500">Inherits: ${gCpm.toFixed(2)}</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={0.1} value={s.cpm ?? gCpm} onChange={(e) => updateScenario(idx, { cpm: parseFloat(e.target.value || "0") })} />
                      <GlobalHint show={!s.useGlobal.cpm} text={`$${gCpm.toFixed(2)}`} />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>CTR (%)</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.ctr} onChange={(e) => updateUseGlobal(idx, "ctr", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.mode === "locked" && s.solveFor === "ctr" ? (
                    <Input className="text-right tabular-nums" type="number" value={(e.ctr * 100).toFixed(2)} disabled />
                  ) : s.useGlobal.ctr ? (
                    <div className="text-[11px] text-slate-500">Inherits: {(gCtr * 100).toFixed(2)}%</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={0.01} min={0} max={100} value={Number(((s.ctr ?? gCtr) * 100).toFixed(3))} onChange={(e) => updateScenario(idx, { ctr: parseFloat(e.target.value || "0") / 100 })} />
                      <GlobalHint show={!s.useGlobal.ctr} text={`${(gCtr * 100).toFixed(2)}%`} />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Click → Sign-up (CVR %)</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.cvr} onChange={(e) => updateUseGlobal(idx, "cvr", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.mode === "locked" && s.solveFor === "cvr" ? (
                    <Input className="text-right tabular-nums" type="number" value={(e.cvr * 100).toFixed(2)} disabled />
                  ) : s.useGlobal.cvr ? (
                    <div className="text-[11px] text-slate-500">Inherits: {(gCvr * 100).toFixed(2)}%</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={0.01} min={0} max={100} value={Number(((s.cvr ?? gCvr) * 100).toFixed(3))} onChange={(e) => updateScenario(idx, { cvr: parseFloat(e.target.value || "0") / 100 })} />
                      <GlobalHint show={!s.useGlobal.cvr} text={`${(gCvr * 100).toFixed(2)}%`} />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Average Gift (A$)</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.avgGift} onChange={(e) => updateUseGlobal(idx, "avgGift", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.useGlobal.avgGift ? (
                    <div className="text-[11px] text-slate-500">Inherits: ${gAvgGift.toFixed(2)}</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={1} value={s.avgGift ?? gAvgGift} onChange={(e) => updateScenario(idx, { avgGift: parseFloat(e.target.value || "0") })} />
                      <GlobalHint show={!s.useGlobal.avgGift} text={`$${gAvgGift.toFixed(2)}`} />
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Label>Funds per Participant (A$)</Label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={s.useGlobal.fpp} onChange={(e) => updateUseGlobal(idx, "fpp", e.target.checked)} />
                      Use global
                    </label>
                  </div>
                  {s.useGlobal.fpp ? (
                    <div className="text-[11px] text-slate-500">Inherits: ${gFpp.toLocaleString()}</div>
                  ) : (
                    <>
                      <Input className="text-right tabular-nums" type="number" step={50} value={s.fpp ?? gFpp} onChange={(e) => updateScenario(idx, { fpp: parseFloat(e.target.value || "0") })} />
                      <GlobalHint show={!s.useGlobal.fpp} text={`$${gFpp.toLocaleString()}`} />
                    </>
                  )}
                </div>

                <div className="text-xs mt-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">CPA</span>:
                    <motion.span key={e.cpa ?? "na"} initial={{ scale: 0.95, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}>
                      {e.cpa != null ? `$${Math.round(e.cpa).toLocaleString()}` : "—"}
                    </motion.span>
                    <span className="text-slate-500"> {s.mode === "derived" ? "(derived)" : "(locked; solving)"}</span>
                  </div>
                  {e.solved && (
                    <div className={e.solved.outOfBounds ? "text-red-600" : "text-slate-500"}>
                      Solved {e.solved.key.toUpperCase()} = {e.solved.key === "cpm" ? `$${(e.solved.value ?? 0).toFixed(2)}` : `${((e.solved.value ?? 0) * 100).toFixed(2)}%`}
                      {e.solved.outOfBounds ? " • outside 0–100% (check inputs/CPA)" : ""}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stages.map(({ key, label }) => {
          const data = rows.map((r) => ({ scenario: r.scenario, value: (r as any)[key], color: r.color }));
          return (
            <Card key={key} className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{label}</h2>
                    <p className="text-sm text-slate-600">Independent scale</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    {scenarios.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                        {s.name}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="scenario" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 12 }} width={70} domain={[0, "auto"]} />
                      <Tooltip formatter={(value: any) => (typeof value === "number" ? value.toLocaleString() : value)} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {data.map((d, i) => (<Cell key={`cell-${i}`} fill={d.color} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Numbers at a Glance</h3>
            <Button variant="outline" onClick={exportToExcel}>Download Excel</Button>
          </div>
          <table className="min-w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Scenario</th>
                <th className="py-2 pr-4">Ad Spend (A$)</th>
                <th className="py-2 pr-4 text-right">CPA</th>
                <th className="py-2 pr-4 text-right">Impr.</th>
                <th className="py-2 pr-4 text-right">Clicks</th>
                <th className="py-2 pr-4 text-right">Participants</th>
                <th className="py-2 pr-4 text-right">Donors</th>
                <th className="py-2 pr-4 text-right">Total Funds Raised (A$)</th>
                <th className="py-2 pr-4 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.scenario} className="border-b last:border-0 odd:bg-white even:bg-slate-50">
                  <td className="py-2 pr-4 font-medium" style={{ color: r.color }}>{r.scenario}</td>
                  <td className="py-2 pr-4">${r.spend.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{effective[i].cpa != null ? `$${Math.round(effective[i].cpa!).toLocaleString()}` : "—"}</td>
                  <td className="py-2 pr-4 text-right">{r.impressions.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{r.clicks.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{r.participants.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{r.donors.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">${r.funds.toLocaleString()}</td>
                  <td className="py-2 pr-4 text-right">{r.roas != null ? `${r.roas.toFixed(2)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

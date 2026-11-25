// Export MVR (My Virtual Rig) : le fichier que grandMA3 importe pour récupérer le patch, les positions et les
// types d'appareils. C'est une archive zip : la description de la scène, plus une fiche GDTF par type d'appareil.
// Les appareils de la bibliothèque de départ n'ont pas de fiche de fabricant : on leur écrit une fiche GDTF minimale.
import { zipSync, strToU8 } from "fflate";
import type { Doc } from "./model";
import { fixturePos, fixtureZ } from "./geom";
import { LIBRARY, symbolOf, type Chan, type SymbolDef } from "./library";
import { readingOrder, sortedSupports } from "./queries";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Identifiant stable tiré d'un texte : le même plan réexporté garde les mêmes identifiants, la console s'y retrouve.
export function stableUuid(text: string): string {
  let h = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h = h.map((v, k) => Math.imul(v ^ (c + k * 31), 0x01000193 + k * 2) >>> 0); h = [h[1] ^ (h[0] >>> 13), h[2] ^ (h[1] << 7), h[3] ^ (h[2] >>> 11), h[0] ^ (h[3] << 5)].map((v) => v >>> 0); }
  const x = h.map((v) => v.toString(16).padStart(8, "0")).join("").toUpperCase();
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-A${x.slice(17, 20)}-${x.slice(20, 32)}`;
}
const fileSafe = (s: string) => s.replace(/[^A-Za-z0-9 _.-]+/g, "_").trim() || "appareil";
export const gdtfFileName = (s: SymbolDef) => `${fileSafe(s.manufacturer || "ScenoFactory")}@${fileSafe(s.name)}.gdtf`;

// ---------- Fiche GDTF minimale pour un appareil générique ----------
const G: Record<string, { name: string; pretty: string; feature: string; group?: string; unit?: string }> = {
  dim: { name: "Dimmer", pretty: "Dim", feature: "Dimmer.Dimmer", unit: "LuminousIntensity" },
  pan: { name: "Pan", pretty: "P", feature: "Position.PanTilt", group: "PanTilt", unit: "Angle" }, tilt: { name: "Tilt", pretty: "T", feature: "Position.PanTilt", group: "PanTilt", unit: "Angle" },
  r: { name: "ColorAdd_R", pretty: "R", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" }, g: { name: "ColorAdd_G", pretty: "G", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" },
  b: { name: "ColorAdd_B", pretty: "B", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" }, w: { name: "ColorAdd_W", pretty: "W", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" },
  a: { name: "ColorAdd_RY", pretty: "A", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" },
  c: { name: "ColorSub_C", pretty: "C", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" }, m: { name: "ColorSub_M", pretty: "M", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" },
  y: { name: "ColorSub_Y", pretty: "Y", feature: "Color.RGB", group: "ColorRGB", unit: "ColorComponent" },
  iris: { name: "Iris", pretty: "Iris", feature: "Beam.Beam", unit: "None" },
  blade1: { name: "Blade1A", pretty: "Bl1A", feature: "Shapers.Shapers", unit: "None" }, blade2: { name: "Blade2A", pretty: "Bl2A", feature: "Shapers.Shapers", unit: "None" },
  blade3: { name: "Blade3A", pretty: "Bl3A", feature: "Shapers.Shapers", unit: "None" }, blade4: { name: "Blade4A", pretty: "Bl4A", feature: "Shapers.Shapers", unit: "None" },
  blade1b: { name: "Blade1B", pretty: "Bl1B", feature: "Shapers.Shapers", unit: "None" }, blade2b: { name: "Blade2B", pretty: "Bl2B", feature: "Shapers.Shapers", unit: "None" },
  blade3b: { name: "Blade3B", pretty: "Bl3B", feature: "Shapers.Shapers", unit: "None" }, blade4b: { name: "Blade4B", pretty: "Bl4B", feature: "Shapers.Shapers", unit: "None" },
  gobo: { name: "Gobo1", pretty: "G1", feature: "Gobo.Gobo", unit: "None" },
  shutter: { name: "Shutter1", pretty: "Sh1", feature: "Beam.Beam", unit: "None" }, zoom: { name: "Zoom", pretty: "Zoom", feature: "Focus.Focus", unit: "Angle" },
};
const IDENT = "{1.000000,0.000000,0.000000,0.000000}{0.000000,1.000000,0.000000,0.000000}{0.000000,0.000000,1.000000,0.000000}{0,0,0,1}";
export function genericGdtf(s: SymbolDef): Uint8Array {
  const cells = Math.max(1, ...s.modes.flatMap((m) => (m.channels ?? []).map((c) => c.cell ?? 1)));
  const beam = (i: number) => (cells > 1 ? `Source${i}` : "Faisceau");
  // nom d'attribut de chaque canal : les canaux sans rôle connu deviennent Control1, Control2…
  const attrOf = (m: { channels?: Chan[] }) => { const seen = new Map<string, number>(); return (m.channels ?? []).map((c) => { if (c.attr !== "other") return G[c.attr].name; const k = String(c.cell ?? 1), n = (seen.get(k) ?? 0) + 1; seen.set(k, n); return `Control${n}`; }); };
  const used = new Set(s.modes.flatMap(attrOf));
  const attrs = [...used].map((n) => { const d = Object.values(G).find((x) => x.name === n); return d ? `<Attribute Name="${d.name}" Pretty="${d.pretty}"${d.group ? ` ActivationGroup="${d.group}"` : ""} Feature="${d.feature}" PhysicalUnit="${d.unit}"/>` : `<Attribute Name="${n}" Pretty="${n.replace("Control", "Ctrl")}" Feature="Control.Control" PhysicalUnit="None"/>`; }).join("");
  const beams = (indent: string) => Array.from({ length: cells }, (_, i) => `${indent}<Beam Name="${beam(i + 1)}" Model="Corps" Position="${IDENT}" LampType="LED" PowerConsumption="${(s.powerW / cells).toFixed(0)}" LuminousFlux="10000" ColorTemperature="6000" BeamAngle="25" FieldAngle="25" ThrowRatio="1" RectangleRatio="1.7777" BeamRadius="0.05" BeamType="Wash" ColorRenderingIndex="90" EmitterSpectrum=""/>`).join("\n");
  const geo = s.moving
    ? `<Geometry Name="Base" Model="Corps" Position="${IDENT}">\n<Axis Name="Lyre" Model="Corps" Position="${IDENT}">\n<Axis Name="Tete" Model="Corps" Position="${IDENT}">\n${beams("")}\n</Axis>\n</Axis>\n</Geometry>`
    : `<Geometry Name="Base" Model="Corps" Position="${IDENT}">\n${beams("")}\n</Geometry>`;
  const modes = s.modes.map((m) => {
    const names = attrOf(m);
    const chans = (m.channels ?? []).map((c, i) => {
      const a = names[i], geoName = c.attr === "pan" ? "Lyre" : c.attr === "tilt" ? "Tete" : beam(c.cell ?? 1), bytes = c.fine ? 2 : 1, fn = `${a} 1`;
      const full = bytes === 2 ? "65535/2" : "255/1", mid = bytes === 2 ? "32768/2" : "128/1", def = c.attr === "pan" || c.attr === "tilt" ? mid : `0/${bytes}`;
      const phys = c.attr === "pan" ? ["-270", "270"] : c.attr === "tilt" ? ["-135", "135"] : c.attr === "zoom" ? ["10", "50"] : ["0", "1"];
      return `<DMXChannel DMXBreak="1" Offset="${c.fine ? `${c.offset},${c.fine}` : c.offset}" InitialFunction="${geoName}_${a}.${a}.${fn}" Highlight="${c.attr === "dim" || "rgbw".includes(c.attr) ? full : "None"}" Geometry="${geoName}">` +
        `<LogicalChannel Attribute="${a}" Snap="No" Master="${c.attr === "dim" ? "Grand" : "None"}" MibFade="0" DMXChangeTimeLimit="0">` +
        (c.attr === "gobo" && m.gobo?.length
          ? `<ChannelFunction Name="${fn}" Attribute="${a}" OriginalAttribute="" DMXFrom="0/1" Default="0/1" PhysicalFrom="0" PhysicalTo="1" RealFade="0" RealAcceleration="0" Wheel="Gobos">${m.gobo.map((g) => `<ChannelSet Name="${esc(s.wheel?.[g.slot - 1]?.name ?? "")}" DMXFrom="${g.from}/1" WheelSlotIndex="${g.slot}"/>`).join("")}</ChannelFunction></LogicalChannel></DMXChannel>`
          : `<ChannelFunction Name="${fn}" Attribute="${a}" OriginalAttribute="" DMXFrom="0/${bytes}" Default="${def}" PhysicalFrom="${phys[0]}" PhysicalTo="${phys[1]}" RealFade="0" RealAcceleration="0"/></LogicalChannel></DMXChannel>`);
    }).join("\n");
    return `<DMXMode Name="${esc(m.name)}" Description="" Geometry="Base">\n<DMXChannels>\n${chans}\n</DMXChannels>\n<Relations/>\n<FTMacros/>\n</DMXMode>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<GDTF DataVersion="1.2">
<FixtureType Name="${esc(s.name)}" ShortName="${esc(s.name.slice(0, 12))}" LongName="${esc(s.name)}" Manufacturer="ScenoFactory" Description="Appareil générique de ScenoFactory. À remplacer par la fiche du fabricant." FixtureTypeID="${stableUuid("showfactory-type-" + s.key)}" Thumbnail="" RefFT="" CanHaveChildren="No">
<AttributeDefinitions>
<ActivationGroups><ActivationGroup Name="PanTilt"/><ActivationGroup Name="ColorRGB"/></ActivationGroups>
<FeatureGroups><FeatureGroup Name="Dimmer" Pretty="Dimmer"><Feature Name="Dimmer"/></FeatureGroup><FeatureGroup Name="Position" Pretty="Position"><Feature Name="PanTilt"/></FeatureGroup><FeatureGroup Name="Color" Pretty="Color"><Feature Name="RGB"/></FeatureGroup><FeatureGroup Name="Beam" Pretty="Beam"><Feature Name="Beam"/></FeatureGroup><FeatureGroup Name="Focus" Pretty="Focus"><Feature Name="Focus"/></FeatureGroup><FeatureGroup Name="Gobo" Pretty="Gobo"><Feature Name="Gobo"/></FeatureGroup><FeatureGroup Name="Shapers" Pretty="Shapers"><Feature Name="Shapers"/></FeatureGroup><FeatureGroup Name="Control" Pretty="Control"><Feature Name="Control"/></FeatureGroup></FeatureGroups>
<Attributes>${attrs}</Attributes>
</AttributeDefinitions>
${s.wheel?.length ? `<Wheels><Wheel Name="Gobos">${s.wheel.map((w) => `<Slot Name="${esc(w.name)}" Color="0.3127,0.3290,100.0"/>`).join("")}</Wheel></Wheels>` : "<Wheels/>"}
<PhysicalDescriptions><Properties><Weight Value="${s.weightKg}"/><PowerConsumption Value="${s.powerW}" PowerFactor="1" Connector="" VoltageLow="90" VoltageHigh="240" FrequencyLow="50" FrequencyHigh="60"/></Properties></PhysicalDescriptions>
<Models><Model Name="Corps" Length="0.3" Width="0.3" Height="0.3" PrimitiveType="Cube" File=""/></Models>
<Geometries>
${geo}
</Geometries>
<DMXModes>
${modes}
</DMXModes>
<Revisions><Revision Text="Fiche générée par ScenoFactory" Date="2026-11-13T00:00:00" UserID="0"/></Revisions>
<FTPresets/>
<Protocols/>
</FixtureType>
</GDTF>`;
  return zipSync({ "description.xml": strToU8(xml) });
}

// ---------- La scène ----------
export interface MvrResult { bytes: Uint8Array; fixtures: number; unpatched: number; withoutFile: string[]; generated: string[] }
export async function buildMvr(doc: Doc, fileOf: (key: string) => Promise<Uint8Array | null>): Promise<MvrResult> {
  const files: Record<string, Uint8Array> = {}, specOf = new Map<string, string>(), withoutFile: string[] = [], generated: string[] = [];
  for (const key of new Set(Object.values(doc.fixtures).map((f) => f.symbol))) {
    const s = symbolOf(key), name = gdtfFileName(s);
    if (s.source === "gdtf") { const b = await fileOf(key); if (b) { files[name] = b; specOf.set(key, name); } else { withoutFile.push(`${s.manufacturer ?? ""} ${s.name}`.trim()); specOf.set(key, ""); } }
    else if (s.modes.some((m) => m.footprint > 0)) { files[name] = genericGdtf(s); specOf.set(key, name); generated.push(s.name); }
    else specOf.set(key, "");
  }
  let unpatched = 0;
  const fixtureXml = (f: (typeof doc.fixtures)[string]) => {
    const p = fixturePos(doc, f), z = fixtureZ(doc, f), r = (f.rotDeg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), n = (v: number) => v.toFixed(6);
    const matrix = `{${n(c)},${n(s)},${n(0)}}{${n(-s)},${n(c)},${n(0)}}{${n(0)},${n(0)},${n(1)}}{${n(p.x)},${n(p.y)},${n(z)}}`;
    const sym = symbolOf(f.symbol), patched = f.universe != null && f.address != null;
    if (!patched) unpatched++;
    const id = f.channel || f.unitNumber || "";
    return `<Fixture name="${esc(`${sym.name}${f.unitNumber ? " " + f.unitNumber : ""}`)}" uuid="${stableUuid("showfactory-fixture-" + f.id)}">
<Matrix>${matrix}</Matrix>
<GDTFSpec>${esc(specOf.get(f.symbol) ?? "")}</GDTFSpec>
<GDTFMode>${esc(f.modeName)}</GDTFMode>
<FixtureID>${esc(id)}</FixtureID>
<FixtureIDNumeric>${parseInt(id, 10) || 0}</FixtureIDNumeric>
<UnitNumber>${parseInt(f.unitNumber, 10) || 0}</UnitNumber>
<Addresses>${patched ? `<Address break="0">${(f.universe! - 1) * 512 + f.address!}</Address>` : ""}</Addresses>
<CustomId>0</CustomId>
</Fixture>`;
  };
  const order = readingOrder(doc);
  const layers = [...sortedSupports(doc).map((s) => ({ name: s.name, id: s.id, list: order.filter((f) => f.attach?.supportId === s.id) })), { name: "Hors perche", id: "libres", list: order.filter((f) => !f.attach || !doc.supports[f.attach.supportId]) }].filter((l) => l.list.length);
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<GeneralSceneDescription verMajor="1" verMinor="5" provider="ScenoFactory" providerVersion="0.45.0">
<UserData/>
<Scene>
<AUXData/>
<Layers>
${layers.map((l) => `<Layer name="${esc(l.name)}" uuid="${stableUuid("showfactory-layer-" + doc.id + l.id)}">\n<ChildList>\n${l.list.map(fixtureXml).join("\n")}\n</ChildList>\n</Layer>`).join("\n")}
</Layers>
</Scene>
</GeneralSceneDescription>`;
  files["GeneralSceneDescription.xml"] = strToU8(xml);
  return { bytes: zipSync(files, { level: 6 }), fixtures: order.length, unpatched, withoutFile, generated };
}

// ---------- Lecture d'un MVR : les appareils d'une scène, avec leurs fiches GDTF ----------
export interface MvrFixture { name: string; symbol: string; mode: string; pos: { x: number; y: number }; zMm: number; rotDeg: number; universe: number | null; address: number | null; channel: string; unit: string }
export interface MvrImport { fixtures: MvrFixture[]; symbols: { sym: SymbolDef; bytes: Uint8Array }[]; withoutType: string[]; errors: string[] }
export async function readMvr(bytes: Uint8Array): Promise<MvrImport> {
  const { unzipSync, strFromU8 } = await import("fflate"), { parseGdtf } = await import("./gdtf");
  let files: Record<string, Uint8Array>; try { files = unzipSync(bytes); } catch { throw new Error("Ce fichier n'est pas une archive MVR lisible."); }
  const main = Object.keys(files).find((k) => k.toLowerCase() === "generalscenedescription.xml"); if (!main) throw new Error("Ce MVR ne contient pas de description de scène.");
  const xml = new DOMParser().parseFromString(strFromU8(files[main]), "application/xml"); if (xml.querySelector("parsererror")) throw new Error("La description de scène de ce MVR est illisible.");
  // une fiche générique écrite par ScenoFactory redevient l'appareil de la bibliothèque
  const ours = new Map(LIBRARY.map((s) => ["gdtf-" + stableUuid("showfactory-type-" + s.key), s.key]));
  const bySpec = new Map<string, SymbolDef | null>(), symbols: MvrImport["symbols"] = [], errors: string[] = [], withoutType: string[] = [], fixtures: MvrFixture[] = [];
  const typeOf = (spec: string): SymbolDef | null => {
    const k = spec.toLowerCase(); if (bySpec.has(k)) return bySpec.get(k)!;
    const name = Object.keys(files).find((f) => f.toLowerCase() === k || f.toLowerCase() === k + ".gdtf"); let sym: SymbolDef | null = null;
    if (name) { try { sym = parseGdtf(files[name], name); const own = ours.get(sym.key); if (own) sym = symbolOf(own); else symbols.push({ sym, bytes: files[name] }); } catch (e: any) { errors.push(e?.message || `${name} : fiche illisible.`); } }
    bySpec.set(k, sym); return sym;
  };
  const txt = (el: Element, tag: string) => [...el.children].find((c) => c.tagName === tag)?.textContent?.trim() ?? "";
  for (const el of xml.querySelectorAll("Fixture")) {
    const name = el.getAttribute("name") || "Appareil", spec = txt(el, "GDTFSpec"), sym = spec ? typeOf(spec) : null;
    if (!sym) { withoutType.push(name); continue; }
    const m = (txt(el, "Matrix").match(/-?\d+(?:[.,]\d+)?(?:e-?\d+)?/gi) ?? []).map((v) => parseFloat(v.replace(",", ".")));
    const o = m.length >= 12 ? [m[9], m[10], m[11]] : [0, 0, 0], rot = m.length >= 12 ? (Math.atan2(m[1], m[0]) * 180) / Math.PI : 0;
    // adresse : nombre absolu (univers − 1) × 512 + adresse, ou « univers.adresse »
    const raw = el.querySelector("Addresses > Address")?.textContent?.trim() ?? ""; let universe: number | null = null, address: number | null = null;
    if (/^\d+\.\d+$/.test(raw)) { const [u, a] = raw.split(".").map(Number); universe = u; address = a; } else if (/^\d+$/.test(raw) && Number(raw) > 0) { const abs = Number(raw); universe = Math.floor((abs - 1) / 512) + 1; address = ((abs - 1) % 512) + 1; }
    const mode = txt(el, "GDTFMode"), unit = txt(el, "UnitNumber");
    fixtures.push({ name, symbol: sym.key, mode: sym.modes.some((x) => x.name === mode) ? mode : sym.modes[0].name, pos: { x: Math.round(o[0]), y: Math.round(o[1]) }, zMm: Math.max(0, Math.round(o[2])), rotDeg: Math.round(rot * 10) / 10, universe, address, channel: txt(el, "FixtureID"), unit: unit === "0" ? "" : unit });
  }
  return { fixtures, symbols, withoutType, errors };
}

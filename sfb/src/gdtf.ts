// Lecture d'une fiche GDTF (DIN SPEC 15800) : archive zip contenant description.xml.
// On en tire ce dont un plan de feu a besoin : identité, modes DMX et nombre de canaux, poids, puissance,
// encombrement, tête mobile ou non, angle de faisceau.
import { unzipSync, strFromU8 } from "fflate";
import type { Chan, ChanAttr, Mode, Prim, SymbolDef } from "./library";

// Attributs GDTF que le plan sait lire en direct. Les autres canaux sont gardés avec leur nom d'origine.
const ATTR: Record<string, ChanAttr> = { Dimmer: "dim", Pan: "pan", Tilt: "tilt", ColorAdd_R: "r", ColorAdd_G: "g", ColorAdd_B: "b", ColorAdd_W: "w", ColorAdd_WW: "w", ColorAdd_CW: "w", ColorAdd_RY: "a", ColorRGB_Red: "r", ColorRGB_Green: "g", ColorRGB_Blue: "b", ColorSub_C: "c", ColorSub_M: "m", ColorSub_Y: "y", Shutter1: "shutter", Zoom: "zoom", Gobo1: "gobo", Iris: "iris", Blade1A: "blade1", Blade2A: "blade2", Blade3A: "blade3", Blade4A: "blade4", Blade1B: "blade1b", Blade2B: "blade2b", Blade3B: "blade3b", Blade4B: "blade4b" };

const num = (v: string | null | undefined): number | null => { if (v == null) return null; const n = parseFloat(v.replace(",", ".")); return isFinite(n) ? n : null; };
const kids = (el: Element, tag?: string) => [...el.children].filter((c) => !tag || c.tagName === tag);

export function parseGdtf(bytes: Uint8Array, fileName: string): SymbolDef {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes, { filter: (f) => f.name === "description.xml" }); } catch { throw new Error(`${fileName} : ce n'est pas une archive GDTF lisible.`); }
  const xmlBytes = files["description.xml"];
  if (!xmlBytes) throw new Error(`${fileName} : la fiche ne contient pas de description.xml.`);
  const xml = new DOMParser().parseFromString(strFromU8(xmlBytes), "application/xml");
  const ft = xml.querySelector("GDTF > FixtureType");
  if (!ft || xml.querySelector("parsererror")) throw new Error(`${fileName} : description.xml illisible.`);
  const id = (ft.getAttribute("FixtureTypeID") || "").toUpperCase();
  if (!/^[0-9A-F-]{36}$/.test(id)) throw new Error(`${fileName} : identifiant de type GDTF absent.`);

  // Géométries : pour chaque nom, sa géométrie de premier niveau ; et la liste des références.
  const topOf = new Map<string, string>(), refs: { target: string; breaks: Map<number, number> }[] = [];
  let moving = false, beamAngle: number | null = null;
  const geos = ft.querySelector(":scope > Geometries");
  const walk = (el: Element, top: string) => {
    const name = el.getAttribute("Name") || "";
    if (name) topOf.set(name, top);
    if (el.tagName === "Axis") moving = true;
    if (el.tagName === "Beam" && beamAngle == null) beamAngle = num(el.getAttribute("BeamAngle"));
    if (el.tagName === "GeometryReference") {
      const breaks = new Map<number, number>();
      for (const b of kids(el, "Break")) breaks.set(num(b.getAttribute("DMXBreak")) ?? 1, num(b.getAttribute("DMXOffset")) ?? 1);
      refs.push({ target: el.getAttribute("Geometry") || "", breaks });
    }
    for (const c of kids(el)) if (c.tagName !== "Break") walk(c, top);
  };
  if (geos) for (const g of kids(geos)) walk(g, g.getAttribute("Name") || "");

  // Modes : nombre de canaux = plus haute adresse atteinte, par « break », références de géométrie comprises.
  const modes: Mode[] = []; let wheelName = "";
  for (const m of ft.querySelectorAll(":scope > DMXModes > DMXMode")) {
    const maxByBreak = new Map<number, number>(), channels: Chan[] = []; let gobo: { from: number; slot: number }[] | undefined;
    for (const ch of m.querySelectorAll(":scope > DMXChannels > DMXChannel")) {
      const offs = (ch.getAttribute("Offset") || "").split(",").map((s) => parseInt(s, 10)).filter((n) => n > 0);
      if (!offs.length) continue; // canal virtuel
      const top = topOf.get(ch.getAttribute("Geometry") || "") || "";
      const inst = refs.filter((r) => r.target === top);
      const brAttr = ch.getAttribute("DMXBreak") || "1";
      const hi = Math.max(...offs);
      const raw = ch.querySelector(":scope > LogicalChannel")?.getAttribute("Attribute") || "";
      if (raw === "Gobo1" && !gobo) { // plages DMX de la roue : chaque plage désigne un emplacement de la roue
        gobo = [...ch.querySelectorAll('ChannelFunction[Attribute="Gobo1"] > ChannelSet')].map((cs) => ({ from: parseInt(cs.getAttribute("DMXFrom") || "0", 10) || 0, slot: parseInt(cs.getAttribute("WheelSlotIndex") || "0", 10) || 0 })).filter((x) => x.slot > 0).sort((a, b) => a.from - b.from);
        const wn = ch.querySelector('ChannelFunction[Attribute="Gobo1"]')?.getAttribute("Wheel"); if (wn) wheelName = wn;
      }
      const cf = ch.querySelector(":scope > LogicalChannel > ChannelFunction"), pf = num(cf?.getAttribute("PhysicalFrom")), pt = num(cf?.getAttribute("PhysicalTo"));
      const phys: [number, number] | null = (raw === "Pan" || raw === "Tilt" || raw === "Zoom") && pf != null && pt != null && pf !== pt ? [pf, pt] : null;
      const note = (base: number, cell?: number) => { if ((num(brAttr) ?? 1) === 1 || brAttr === "Overwrite") channels.push({ attr: ATTR[raw] ?? "other", offset: base + offs[0] - 1, ...(offs[1] ? { fine: base + offs[1] - 1 } : {}), ...(cell ? { cell } : {}), gdtf: raw, ...(phys ? { phys } : {}) }); };
      if (!inst.length) { const b = num(brAttr) ?? 1; maxByBreak.set(b, Math.max(maxByBreak.get(b) ?? 0, hi)); note(1); }
      else for (const [i, r] of inst.entries()) {
        const b = brAttr === "Overwrite" ? [...r.breaks.keys()][0] ?? 1 : num(brAttr) ?? 1;
        const base = r.breaks.get(b) ?? 1;
        if (b === 1) note(base, i + 1);
        maxByBreak.set(b, Math.max(maxByBreak.get(b) ?? 0, base + hi - 1));
      }
    }
    modes.push({ name: m.getAttribute("Name") || `Mode ${modes.length + 1}`, footprint: [...maxByBreak.values()].reduce((a, b) => a + b, 0), channels: channels.sort((a, b) => a.offset - b.offset), ...(gobo?.length ? { gobo } : {}) });
  }
  if (!modes.length) modes.push({ name: "Sans DMX", footprint: 0 });

  const props = ft.querySelector(":scope > PhysicalDescriptions > Properties");
  const weight = num(props?.querySelector(":scope > Weight")?.getAttribute("Value"));
  let power = num(props?.querySelector(":scope > PowerConsumption")?.getAttribute("Value"));
  if (power == null) { // à défaut : somme des faisceaux, chacun compté autant de fois que sa géométrie est référencée
    const sum = [...ft.querySelectorAll("Geometries Beam")].map((e) => (num(e.getAttribute("PowerConsumption")) ?? 0) * Math.max(1, refs.filter((r) => r.target === topOf.get(e.getAttribute("Name") || "")).length)).reduce((a, c) => a + c, 0);
    power = sum || null;
  }

  // Encombrement en plan : le plus gros modèle de la fiche (dimensions en mètres).
  let L = 0.3, W = 0.3;
  let best = 0;
  for (const mo of ft.querySelectorAll(":scope > Models > Model")) {
    const l = num(mo.getAttribute("Length")) ?? 0, w = num(mo.getAttribute("Width")) ?? 0, h = num(mo.getAttribute("Height")) ?? 0;
    if (l * w * h > best) { best = l * w * h; L = l; W = w; }
  }
  const clamp = (m: number) => Math.max(120, Math.min(1500, Math.round(m * 1000)));
  const hx = clamp(L) / 2, hy = clamp(W) / 2;
  const rect: Prim = { t: "poly", closed: true, fill: true, pts: [{ x: -hx, y: hy }, { x: hx, y: hy }, { x: hx, y: -hy }, { x: -hx, y: -hy }] };
  const r = Math.min(hx, hy) * 0.78;
  const plan: Prim[] = moving
    ? [rect, { t: "circle", c: { x: 0, y: 0 }, r, fill: true }, { t: "line", a: { x: 0, y: -r }, b: { x: 0, y: r } }, { t: "line", a: { x: -r, y: 0 }, b: { x: r, y: 0 } }]
    : [rect, { t: "line", a: { x: -hx, y: -hy * 0.6 }, b: { x: hx, y: -hy * 0.6 } }, { t: "line", a: { x: -hx, y: hy }, b: { x: hx, y: -hy } }];

  const wheelEl = [...ft.querySelectorAll(":scope > Wheels > Wheel")].find((w) => w.getAttribute("Name") === wheelName);
  const wheel = wheelEl ? kids(wheelEl, "Slot").map((s) => ({ name: s.getAttribute("Name") || "", file: (s.getAttribute("MediaFileName") || "").toLowerCase() })) : [];
  const manufacturer = ft.getAttribute("Manufacturer") || "";
  const name = ft.getAttribute("LongName") || ft.getAttribute("Name") || fileName.replace(/\.gdtf$/i, "");
  return {
    key: "gdtf-" + id, name, moving, weightKg: weight ?? 0, powerW: power ?? 0, modes, plan,
    source: "gdtf", manufacturer, ...(wheel.length ? { wheel } : {}), beamAngleDeg: beamAngle, missing: [weight == null ? "poids" : "", power == null ? "puissance" : ""].filter(Boolean),
  };
}

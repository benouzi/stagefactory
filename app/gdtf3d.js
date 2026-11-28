// Modèle 3D d'une fiche GDTF : repris de ScenoFactory (gdtf3d.ts). Lit les maillages de la fiche (glb, puis 3ds), les met aux cotes annoncées, suit l'arbre des géométries,
// range les axes dans des pivots nommés (sf-pan, sf-tilt). Sans maillage, un volume simple aux cotes de la fiche. Rien n'est inventé : pas de modèle si la fiche n'en décrit pas.
import * as THREE from 'three';
const num = v => { const n = parseFloat((v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
function matrixOf(s){ const v = (s ?? '').match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)?.map(x => parseFloat(x)) ?? [] /* la virgule sépare les nombres (jamais un séparateur décimal) : « {1,0,0,0} » = quatre nombres */, m = new THREE.Matrix4(); if (v.length >= 12) m.set(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10], v[11], 0, 0, 0, 1); return m; }
const body = () => new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: .55, metalness: .35 });
async function meshFromFile(files, file){ const find = (dir, ext) => Object.keys(files).find(k => k.toLowerCase() === `models/${dir}/${file.toLowerCase()}.${ext}`);
  const glb = find('gltf', 'glb') ?? find('gltf_low', 'glb') ?? find('gltf_high', 'glb');
  if (glb){ try { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'), b = files[glb], gltf = await new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); const g = new THREE.Group(); g.add(gltf.scene); g.rotation.x = Math.PI / 2; const w = new THREE.Group(); w.add(g); return w; } catch (_){ } }
  const tds = find('3ds', '3ds') ?? find('3ds_low', '3ds') ?? find('3ds_high', '3ds');
  if (tds){ try { const { TDSLoader } = await import('three/addons/loaders/TDSLoader.js'), b = files[tds], o = new TDSLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); o.scale.setScalar(.001); const w = new THREE.Group(); w.add(o); return w; } catch (_){ } }
  return null; }
function primitive(L, W, H, type){ const l = L || .2, w = W || .2, h = H || .2, geo = /Cylinder|Head|Conventional|Scanner/i.test(type) ? new THREE.CylinderGeometry(Math.min(l, w) / 2, Math.min(l, w) / 2, h, 24).rotateX(Math.PI / 2) : /Sphere/i.test(type) ? new THREE.SphereGeometry(Math.max(l, w, h) / 2, 20, 14) : new THREE.BoxGeometry(l, w, h);
  const m = new THREE.Mesh(geo, body()); m.position.z = /Sphere/i.test(type) ? 0 : -h / 2; return m; }
export async function buildGdtfModel(bytes, unzipSync){ let files; try { files = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)); } catch (_){ return null; }
  const xk = Object.keys(files).find(n => /^description\.xml$/i.test(n)); if (!xk) return null;
  const xml = new DOMParser().parseFromString(new TextDecoder().decode(files[xk]), 'application/xml'), ft = xml.querySelector('GDTF > FixtureType'), geos = ft?.querySelector(':scope > Geometries'); if (!ft || !geos) return null;
  const models = new Map(); for (const m of ft.querySelectorAll(':scope > Models > Model')) models.set(m.getAttribute('Name') || '', { L: num(m.getAttribute('Length')), W: num(m.getAttribute('Width')), H: num(m.getAttribute('Height')), file: m.getAttribute('File') || '', type: m.getAttribute('PrimitiveType') || 'Undefined' });
  const cache = new Map(); let meshes = 0, fromFiles = 0, axes = 0; /* 4.67.3 : la géométrie qui tourne est celle que désignent les canaux Pan et Tilt de la fiche, qu'elle soit écrite <Axis> ou <Geometry> (des fiches déposées par des utilisateurs n'ont aucun <Axis>). Sans canal Pan/Tilt : les <Axis> dans l'ordre, comme avant. */ const axGeo = a => { for (const ch of ft.querySelectorAll('DMXModes > DMXMode > DMXChannels > DMXChannel')) for (const lc of ch.querySelectorAll(':scope > LogicalChannel')) if (lc.getAttribute('Attribute') === a && ch.getAttribute('Geometry')) return ch.getAttribute('Geometry'); return ''; }; let panGeo = axGeo('Pan'), tiltGeo = axGeo('Tilt'); if (panGeo && panGeo === tiltGeo) panGeo = tiltGeo = ''; const named = !!(panGeo || tiltGeo); const top = new Map(); for (const g of geos.children) top.set(g.getAttribute('Name') || '', g);
  async function modelMesh(name){ const m = models.get(name); if (!m) return null;
    if (!cache.has(name)){ let o = m.file ? await meshFromFile(files, m.file) : null;
      if (o){ fromFiles++; const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); if (m.L > 0 && m.W > 0 && m.H > 0 && sz.x > 1e-6 && sz.y > 1e-6 && sz.z > 1e-6) o.scale.multiply(new THREE.Vector3(m.L / sz.x, m.W / sz.y, m.H / sz.z));
        o.traverse(x => { if (x.isMesh){ x.castShadow = true; if (!x.material || x.material.type === 'MeshBasicMaterial' || x.material.type === 'MeshPhongMaterial'){ const c = x.material?.color?.getHex?.() ?? 0x1b1d22; x.material = body(); x.material.color.setHex(c); } } });
      } else if (m.type !== 'Undefined' || (m.L && m.W && m.H)) o = primitive(m.L, m.W, m.H, m.type);
      cache.set(name, o); }
    const o = cache.get(name); if (!o) return null; meshes++; return o.clone(true); }
  async function walk(el, depth){ const node = new THREE.Group(); node.applyMatrix4(matrixOf(el.getAttribute('Position'))); if (el.tagName === 'Beam') node.name = 'sf-beam';
    if (el.tagName === 'GeometryReference'){ const ref = top.get(el.getAttribute('Geometry') || ''); if (ref && depth < 8){ const inst = await walk(ref, depth + 1); inst.matrix.identity(); inst.position.set(0, 0, 0); inst.quaternion.identity(); inst.scale.set(1, 1, 1); node.add(inst); } const mm = await modelMesh(el.getAttribute('Model') || ''); if (mm) node.add(mm); return node; }
    let holder = node; const gn = el.getAttribute('Name') || '', role = named ? (gn && gn === panGeo ? 'sf-pan' : gn && gn === tiltGeo ? 'sf-tilt' : el.tagName === 'Axis' ? 'sf-axis' : '') : el.tagName === 'Axis' ? (axes === 0 ? 'sf-pan' : axes === 1 ? 'sf-tilt' : 'sf-axis') : ''; if (role){ const pivot = new THREE.Group(); pivot.name = role; axes++; node.add(pivot); holder = pivot; }
    const mm = await modelMesh(el.getAttribute('Model') || ''); if (mm) holder.add(mm);
    for (const c of el.children) if (c.tagName !== 'Break') holder.add(await walk(c, depth)); return node; }
  const zup = new THREE.Group(); for (const g of geos.children){ const name = g.getAttribute('Name') || ''; if (geos.querySelector(`GeometryReference[Geometry="${CSS.escape(name)}"]`)) continue; zup.add(await walk(g, 0)); }
  const root = new THREE.Group(); zup.rotation.x = -Math.PI / 2; root.add(zup);
  return meshes ? { root, meshes, fromFiles } : null; }

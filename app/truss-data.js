// Compléments à la bibliothèque de ponts de ScenoFactory (sceno-core.js) : nouvelles gammes, poids manquants, longueur réelle des coins, cubes d'angle.
// Règle inchangée : chaque valeur vient d'une page du fabricant ou d'un catalogue cité dans « source » ; une valeur non trouvée reste null (« inconnu »), jamais estimée.
// shape : 'tri' (triangulaire, 3 membrures), 'ladder' (échelle, 2 membrures) ; absent = carré.
// box : cube d'angle de la gamme, poids selon le nombre de départs montés.
const P = 'prolyte.com, fiche produit de la gamme (tableau « Standard available lengths and codes »), relevé le 25.11.2026', CAT = 'catalogue Prolyte, pages « Corners » et « Box corners » (copie paperclip.rcs.ac.uk/images/9/9d/H30V_Data.pdf), relevé le 25.11.2026';
const two = n => [[`${n}-C001`, 45], [`${n}-C002`, 60], [`${n}-C003`, 90], [`${n}-C004`, 120], [`${n}-C005`, 135]].map(([code, a]) => ({ code, label: `coin 2 départs ${a}°`, ways: 2, angleDeg: a, kg: null }));
const NEW = [
  { id: 'prolyte-h30d', maker: 'Prolyte', name: 'H30D', shape: 'tri', sectionMm: 287, tube: 'triangulaire, membrures 48 × 3 mm, diagonales 16 × 2 mm, raccord CCS6 (287 × 255 mm hors tout)', stepMm: 250,
    lengths: [[250, 2.0], [290, 2.9], [500, 3.13], [710, 3.9], [750, 4.1], [1000, 5.1], [1500, 7.4], [2000, 9.27], [2500, 11.39], [3000, 13.51], [4000, 17.75]], corners: two('H30D'), cornerArmMm: 500,
    source: P + ' ; longueur des coins : ' + CAT, url: 'https://prolyte.com/products/aluminium-truss/triangular-truss/h30d-l100-triangle-30-length-100-cm-48x3', checked: '2026-11-25' },
  { id: 'prolyte-x30d', maker: 'Prolyte', name: 'X30D', shape: 'tri', sectionMm: 290, tube: 'triangulaire, membrures 51 × 2 mm, diagonales 16 × 2 mm, raccord CCS6', stepMm: 250,
    lengths: [[250, 1.9], [290, 2.0], [500, 2.7], [710, 3.5], [750, 3.7], [1000, 4.4], [1500, 6.1], [2000, 7.9], [2500, 9.5], [3000, 11.1], [4000, 14.5]], corners: two('X30D'), cornerArmMm: 500,
    source: P + ' ; longueur des coins : ' + CAT, url: 'https://prolyte.com/products/aluminium-truss/triangular-truss/x30d-triangular-truss-length', checked: '2026-11-25' },
  { id: 'prolyte-h40d', maker: 'Prolyte', name: 'H40D', shape: 'tri', sectionMm: 387, tube: 'triangulaire, membrures 48 × 3 mm, raccord CCS6', stepMm: 250,
    lengths: [[250, 2.35], [500, 3.3], [750, 4.34], [810, 4.7], [1000, 5.7], [1500, 8.1], [2000, 10.2], [2500, 13.1], [3000, 15.1], [3500, 17.4], [4000, 20.0]], corners: two('H40D'), cornerArmMm: 600,
    source: P + ' ; longueur des coins : ' + CAT, url: 'https://prolyte.com/products/aluminium-truss/triangular-truss/h40d-l100-triangle-40-length-100-cm-48x3', checked: '2026-11-25' },
  { id: 'prolyte-h30l', maker: 'Prolyte', name: 'H30L', shape: 'ladder', sectionMm: 287, tube: 'échelle, membrures 48 × 3 mm, diagonales 16 × 2 mm, raccord CCS6', stepMm: 250,
    lengths: [[250, 1.1], [290, 1.2], [500, 1.8], [750, 2.4], [1000, 3.1], [1500, 4.4], [2000, 5.6], [2500, 7.0], [3000, 8.2], [4000, 11.0]], corners: [{ code: 'H30L-C003', label: 'coin 2 départs 90°', ways: 2, angleDeg: 90, kg: null }], cornerArmMm: null,
    source: P + ' (longueur prise par un coin d’échelle non relevée)', url: 'https://prolyte.com/products/aluminium-truss/ladder-truss/h30l-l100-ladder-30-length-100-cm-48x3', checked: '2026-11-25' },
  { id: 'prolyte-x30l', maker: 'Prolyte', name: 'X30L', shape: 'ladder', sectionMm: 290, tube: 'échelle, membrures 51 × 2 mm, diagonales 16 × 2 mm, raccord CCS6', stepMm: 250,
    lengths: [[250, 1.03], [290, 1.09], [500, 1.5], [710, 1.91], [750, 1.97], [1000, 2.47], [1500, 3.44], [2000, 4.4], [2500, 5.36], [3000, 6.33], [4000, 8.25]], corners: [{ code: 'X30L-C003', label: 'coin 2 départs 90°', ways: 2, angleDeg: 90, kg: null }], cornerArmMm: null,
    source: P + ' (longueur prise par un coin d’échelle non relevée)', url: 'https://www.prolyte.com/products/aluminium-truss/ladder-truss/x30l-l100-ladder-30-length-100-cm', checked: '2026-11-25' },
  { id: 'prolyte-h40l', maker: 'Prolyte', name: 'H40L', shape: 'ladder', sectionMm: 387, tube: 'échelle, membrures 48 × 3 mm, raccord CCS6', stepMm: 250,
    lengths: [[250, 1.2], [500, 1.9], [750, 2.6], [810, 2.73], [1000, 3.3], [1500, 4.7], [2000, 5.9], [2500, 7.3], [3000, 8.7], [4000, null]], corners: [{ code: 'H40L-C003', label: 'coin 2 départs 90°', ways: 2, angleDeg: 90, kg: null }], cornerArmMm: null,
    source: P + ' (poids de l’élément de 4 m non relevé)', url: 'https://prolyte.com/products/aluminium-truss/ladder-truss/h40l-l100-ladder-40-length-100-cm-48x3', checked: '2026-11-25' },
];
// corrections et compléments des gammes déjà présentes
const PATCH = {
  'prolyte-h30v': { box: { code: 'BOX-30V', kg: { 2: 12.2, 3: 13.5, 4: 14.8, 5: 16.1, 6: 17.4 } }, source2: 'cube d’angle : ' + CAT },
  'prolyte-x30v': { lengths: [[250, 2.7], [290, 2.8], [500, 3.8], [710, 4.8], [750, 4.9], [1000, 6.0], [1500, 8.3], [2000, 10.7], [2500, 12.8], [3000, 15.4], [4000, 20.0]], box: { code: 'BOX-30V', kg: { 2: 12.2, 3: 13.5, 4: 14.8, 5: 16.1, 6: 17.4 } }, source2: 'poids de toutes les longueurs : ' + P + ' ; cube d’angle : ' + CAT },
  'prolyte-h40v': { cornerArmMm: 600, box: { code: 'BOX-40V', kg: { 2: 14.1, 3: 15.4, 4: 16.7, 5: 18.0, 6: 19.3 } }, source2: 'longueur des coins (600 mm) et cube d’angle : ' + CAT },
  'global-f34': { cornerKg: { 'F34 C30': 11.5 }, source2: 'coin 3 départs C30 : fiche thomann « Global Truss F34C30 90° Corner », relevé le 25.11.2026' },
};
export function extendTruss(C){ const L = C.TRUSS_LIB;
  for (const [id, p] of Object.entries(PATCH)){ const se = L.find(x => x.id === id); if (!se || se._ext) continue; se._ext = true; if (p.lengths) se.lengths = p.lengths; if (p.cornerArmMm != null) se.cornerArmMm = p.cornerArmMm; if (p.box) se.box = p.box; if (p.cornerKg) for (const c of se.corners) if (p.cornerKg[c.code] != null) c.kg = p.cornerKg[c.code]; if (p.source2) se.source += ' ; ' + p.source2; }
  for (const se of NEW) if (!L.some(x => x.id === se.id)) L.push(se);
  return L; }

// Line arrays : données publiées par les fabricants (ou, quand c'est dit, par un revendeur). Une valeur non trouvée reste null : elle s'affiche « inconnu ».
// kg : poids net d'une boîte. w, h, d : millimètres. angles : angles possibles entre deux boîtes (degrés) ; null avec « step » : pas connu, plage à lire dans la notice.
// hd : ouverture horizontale nominale. vd : ouverture verticale nominale d'une boîte, quand le fabricant la publie. spl : niveau maximal publié (dB).
export const LA_LIB = [
  { id: 'kara2', maker: 'L-Acoustics', name: 'Kara II', kg: 26, w: 733, h: 252, d: 500, angles: [0, 1, 2, 3, 4, 5, 7.5, 10], hd: 110, hdNote: '70°, 90° ou 110° (Panflex)', vd: 10, spl: 142, frame: { name: 'M-BUMP', kg: null },
    source: 'l-acoustics.com, page produit Kara II (poids, dimensions, directivité, SPL) ; angles : fiches de location reprenant la fiche technique', url: 'https://l-acoustics.com/products/kara-ii', checked: '2026-11-19' },
  { id: 'v8', maker: 'd&b audiotechnik', name: 'V8', kg: 34, w: 700, h: 310, d: 460, angles: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], hd: 80, vd: null, spl: 142, frame: { name: 'cadre V', kg: null },
    source: 'dbaudio.com, page produit V8', url: 'https://www.dbaudio.com/global/en/products/series/v-series/v8/', checked: '2026-11-19' },
  { id: 'y8', maker: 'd&b audiotechnik', name: 'Y8', kg: 20, w: 630, h: 257, d: 375, angles: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], hd: 80, vd: null, spl: 139, frame: { name: 'cadre Y', kg: null },
    source: 'dbaudio.com, page produit Y8', url: 'https://www.dbaudio.com/global/en/products/series/y-series/y8/', checked: '2026-11-19' },
  { id: 'vtxa8', maker: 'JBL', name: 'VTX A8', kg: 29.5, w: 761, h: 227, d: 375, angles: [0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8, 10], hd: 110, vd: null, spl: 139, frame: { name: 'VTX A8 AF', kg: 20.2 },
    source: 'jblpro.com (directivité, SPL) ; poids, dimensions et angles : fiche du revendeur soundpro.com ; cadre : fiche JBL VTX A8 AF (20,2 kg avec la barre d\'extension)', url: 'https://jblpro.com/en/products/vtx-a8', checked: '2026-11-19' },
  { id: 'hdl20', maker: 'RCF', name: 'HDL 20-A', kg: 30.2, w: 705, h: 294, d: 445, angles: null, step: 2, hd: 100, vd: 15, spl: 135, frame: { name: 'Fly Bar HDL 20', kg: null },
    source: 'rcf.it, page produit HDL 20-A ; angles par pas de 2° d\'après la fiche technique, plage à lire dans la notice', url: 'https://www.rcf.it/en/products/product-detail/hdl-20-a', checked: '2026-11-19' },
];
export const LA_FREE = { id: 'libre', maker: '', name: 'Modèle libre', kg: null, w: 700, h: 300, d: 450, angles: null, step: .5, hd: 100, vd: null, spl: null, frame: { name: 'cadre', kg: null }, source: 'valeurs saisies par l\'utilisateur', url: '', checked: '' };

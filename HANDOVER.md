# StageFactory — passation (version 3.12.0, 19.11.2026)

> **RÈGLE DE LIVRAISON (Benjamin, rappelée le 20.11.2026)** : il travaille sur l'ARTEFACT. Chaque lot = publier l'artefact, rien d'autre. Ne construire et n'envoyer les installeurs QUE si le changement touche ce qui est propre au PC local (passerelle `local/serveur.js`, connecteur `local/mcp.js`, `pack/`, DMX/réseau local) ou s'il le demande.
> **DÉPÔT GIT** : `/home/claude` est un dépôt git local (branche `main`, depuis la 4.0.6). Un enregistrement par lot. Destination prévue : GitHub `benouzi/stagefactory` (privé) — pas encore poussé le 20.11.2026 : GitHub n'est pas relié à Claude.


StageFactory (ex-Onex Previz) : logiciel de prévisualisation de spectacle de Benjamin (régisseur général AV, Genève). Réponses en français, simples, résultat d'abord ; commandes shell en blocs de code.

## Objectif en cours
StageFactory est le logiciel unique : la base est Onex Previz, on y fusionne ScenoFactory (autre code, fourni à part).
1. création de salle depuis des plans (PDF, DWG, DXF, images) — FAIT en 3.1.0, voir plus bas
2. ponts et rigging (ponts par fabricant, palans, élingues, gestionnaire de charges) — prochaine étape
3. personnages (19 modèles MakeHuman CC0) et catalogue de modèles 3D
4. mise en page des plans et paperasse

## Fenêtres (3.2.0)
app/wins.js (window.WINS) : chaque panneau (Salle, Atelier, Plan technique, Pupitre, Assistant, Musique, Mur LED, Bibliothèques, Position, Aide) porte une languette en haut ; on la glisse pour détacher le panneau, qui flotte alors avec une barre de titre (déplacer, « Ancrer », double-clic pour ancrer) et une poignée de taille en bas à droite. Barre, languette et poignée sont des éléments à part posés par-dessus, car les panneaux réécrivent leur contenu. Positions gardées dans le stockage du navigateur (`onex.wins`). Un panneau détaché ne réduit plus la vue 3D (événement `wins` écouté par plan.js et desk.js ; classe `confl` quand l'Atelier flotte). Affichage → Ancrer toutes les fenêtres.
Vue 3D sur un autre écran (Affichage) : une vraie fenêtre reçoit l'image du canevas en direct (captureStream) et relaie souris et molette vers la vue ; double-clic = plein écran. C'est la même caméra que dans la fenêtre principale, pas une seconde vue. Essai : tools/t55.py. Jamais essayé sur deux écrans réels ; non géré dans l'artefact en ligne (fenêtres surgissantes). Les fenêtres modales (plan de charge, DMX, créer la salle) ne sont pas détachables.

3.2.2 : l'Atelier fermé ne sortait de l'écran que de 360 px ; élargi puis ancré, il restait à moitié visible, rogné par le bord droit. Il sort maintenant de sa propre largeur, et se ferme aussi quand il flotte.

## Fond et grille de la vue 3D (3.3.0)
app/view.js (window.VIEW3D) : bouton « ▦ Fond et grille » en bas à gauche de la vue (aussi dans Affichage). Couleur du fond (pastilles ou couleur libre ; le brouillard suit), grille de repère sans fin (un grand plan, traits calculés dans le shader, effacés au loin) avec pas 0,5 / 1 / 2 m, niveau plateau ou sol, couleur, intensité, axes (nez de scène en rouge, axe de la salle en vert), masquée en mode spectacle par défaut. Réglages gardés dans le navigateur (`onex.view3d`), pas dans le projet. Essai : tools/t57.py.

## Points de vue 3D et options du plan 2D (3.4.0)
view.js : le bouton s'appelle « ▦ Vue ». Points de vue : Perspective, Isométrique (cour et jardin : caméra en perspective très serrée, 14°, pour garder la souris et les outils habituels), Dessus et Côté (les vraies vues à plat existantes, setMode), Depuis la salle / le lointain / jardin / cour ; réglette d'angle de champ. Les positions se calculent sur venueBounds, donc suivent la salle. Le brouillard et le plan lointain de la caméra s'écartent pour les vues éloignées.
plan.js : bouton ▦ dans la barre du plan. Thèmes (Papier, Blanc, Gris, Noir, Bleu de plan), couleur du fond, couleur du tracé, grille oui/non, pas (0,5 / 1 / 2 / 5 m), couleur de grille. Les couleurs secondaires se déduisent du fond et du tracé (theme()). Gardé dans `onex.plan2d`. L'export PNG prend le fond choisi. Essai : tools/t58.py.
3.4.1 : la grille du plan était presque invisible (gris très clair, traits de 0,35) et absente dès qu'un plan était importé. Elle couvre maintenant toute la fenêtre, plus contrastée, et reste sous un plan vectoriel ou par-dessus un plan en image.

## Salles enregistrées et parc de matériel (3.5.0)
app/parc.js (window.PARC). Une salle se garde à part des projets : `PARC.REC[vid] = { vid, name, salle, parc, types, fixed }`. Version PC : fichier `venues.json` du dossier de réglages (route `/api/venues`, copie `.bak` à chaque écriture) ; ailleurs : `onex.venues` dans le navigateur. La fiche suit la salle ouverte (sync toutes les 1,5 s : dimensions, objets marqués `fix`, types utilisés). La dernière version ouverte d'une salle écrase sa fiche.
- Identité : `salle.vid`. Donnée par creer_salle, par la confirmation de la fenêtre « Créer la salle », ou à la première modification du parc. La salle d'Onex intégrée a l'identité fixe `onex`.
- Parc : lignes `{ cat, label, type, qty }`, catégories lum / son / vid / plateau / micros / backline. Fenêtre « Parc de la salle » (menu Salle, panneau Salle, onglet « Salle » de la bibliothèque). Une ligne sans type est gardée pour mémoire.
- Bibliothèque : onglet « Salle » (stage.js, libHtml) = types du parc avec « n posés sur stock » ; un line array compte ses boîtes. Alerte (toast) quand un type dépasse son stock, quelle que soit la façon de poser.
- Types à la volée : `PARC.createType` clone un type de base selon la forme (FORMES), identifiant `u-<nom>`, marqué `user`. Poids non donné = `w: 0` et `noW: true` (signalé ⚠, jamais estimé). Ils vivent dans la bibliothèque du projet et dans la fiche de la salle.
- Matériel fixe : objets marqués `fix` (et verrouillés). Nouveaux types de décor : cyclo, frise, rideau-n (kind `drape`), boite. Rideau de fond et pendrillons d'une salle sur mesure : `salle.curt = [fond, p1, p2, p3]` (indice de perche, -1 = absent). Gradateurs : `salle.dimmers`, circuits par perche dans `pipes[i].c`.
- Nouveau projet dans une salle enregistrée : Fichier → Nouveau projet vierge liste les salles ; `PARC.newProjectIn` ramène salle, perches, matériel fixe, types, parc.
- Projets mis de côté : `PARC.backup` garde les trois derniers projets remplacés (`onex.backups`), Fichier → Projets mis de côté.
- Outils (assistant et connecteur, 34 outils publiés) : creer_salle (refuse sans `confirme` si un projet est ouvert), creer_type, ecrire_parc, lire_parc, poser_materiel_fixe. La méthode rendue par lister_documents est en trois passes : salle et perches, parc avec quantités, matériel fixe.
- Défauts corrigés : une salle créée depuis une fiche naît sans perche (`salle.noPipes`) ; poser_perche(s) prend `reference: plateau | sol` et rend les deux hauteurs ; `circuits` inscrit directement, `chargeRepartieLueKg` / `chargePonctuelleLueKg` gardées dans `pipes[i].wll / wllPt` et seulement PROPOSÉES dans le plan de charge (bouton Valider, perche par perche, par projet) ; plus aucune salle créée par-dessus le projet ouvert sans accord (ensureParam refuse, la fenêtre demande confirmation).
- Essais : tools/t59.py (recette en trois passes avec les quantités de la fiche d'Onex), t54 étendu (parc par le connecteur, venues.json, rechargement).
- Jamais vérifié : l'import réel de la fiche PDF d'Onex par Claude Desktop avec cette version (le PDF n'était pas joint ; dans t59 les types Titan sont remplacés par des types créés à la volée). Le pilotage DMX d'un type créé à la volée reprend l'ordre de canaux du type de base, pas celui de l'appareil réel.

## Fiche technique réaliste : ponts, moteurs, DMX, couverture sonore (3.6.0)
Demande de Benjamin sur la fiche de la salle communale d'Onex (juin 2026) : tout doit se mettre en place avec un maximum de réalisme.
- Perches en pont : `pipes[i].st = 'truss'`, `sec` (cm), `kgm` (poids au mètre, vide si inconnu), `mot` (moteurs), `mx` (positions). index.html : trussGeo (pont carré, dessous à la hauteur de la perche), percheShape (géométrie, moteurs jaunes, câbles aux moteurs). plan.js : double trait, moteurs, « n circ. », « kg lus ». rig.js : un pont repose sur ses moteurs ; charge totale et reprise par moteur vérifiées, ni contrainte ni flèche. Outils : poser_perche(s) prend structure, sectionCm, moteurs, positionsMoteursM, poidsPontKgParM.
- DMX : creer_type prend `modesDmx` (ordre réel des canaux par mode → `t.chs`, lu par dmx.js). 1 canal = gradateur (`chs: [['dim']]`). Plusieurs canaux sans ordre : `noDmx`, patchable mais pas pilotable, signalé. Le DMX exact des automatiques vient de Titan (titan_import) : jamais essayé ici, Titan absent.
- Son : creer_type prend splMaxDb, ouvertureHDeg, ouvertureVDeg ; sans niveau, `noSpl`. Outil couverture_son (carte splMap étendue à l'emprise de toute salle sur mesure) ; rend maxi, médiane, et les enceintes dont le niveau est supposé. Modèle : niveau direct, sans réverbération.
- Stock : add_objects rend « n posés sur stock » et les types hors parc ; un objet fixe peut valoir plusieurs pièces (`o.qte`).
- La méthode de lister_documents dit tout cela, et ajoute une suite « scénographie / plan de feu » avec le matériel de la salle.
- Essai : tools/t60.py, sur la vraie fiche (FICHE=/chemin, non jointe aux sources : elle contient des coordonnées et un mot de passe). Import scripté avec les valeurs lues dans la fiche : 9 ponts motorisés (distances, 5,10 m du sol = 3,90 m du plateau, 72 circuits, charges lues), parc complet, matériel fixe, couverture, plan de feu patché. Le lecteur PDF lit bien le tableau « circuits — kg » de la page 9.
- Supposé dans cet essai, à lever : dimensions de la salle et du gradin (la fiche ne les donne pas), nombre de moteurs par perche (2, dessin peu lisible), section des ponts, niveaux et ouvertures des Nexo, DMX des cinq automatiques (créés à la volée faute de Titan).
- Limites : plateau rectangulaire unique (le proscenium de 10,80 m et la cage de 14,6 m ne sont pas distingués), pas de balcon, pont carré seulement.

## Feuille de route décidée le 19.11.2026
Benjamin veut finir le logiciel avant de pousser l'IA. Ordre validé : 1. pose en série à la souris (fait, 3.7.0) ; 2. praticables en bloc (fait, 3.8.0 ; tracer un rectangle qui se remplit de modules 2 × 1, et saisie lignes × colonnes) ; 3. ponts et structures truss (modèles tout faits : grill, portique, pont simple, totem ; et tracé libre à la souris avec découpe en longueurs standard, angles, pieds ou moteurs) — c'est aussi le chantier « ponts et rigging » de la fusion ScenoFactory ; 4. line array (mécanique : boîtes, angles, poids, point d'accroche ; et couverture en coupe, visée de chaque boîte sur le public). « Créer une scène doit être simple. »
La base de métier et le plugin d'agents existent (dossier `docs/base-metier`, `plugin/stagefactory-equipe`, non joints aux sources) : en attente, on y revient après.

## Pose en série (3.7.0)
Quand un type est armé dans la bibliothèque, un bandeau donne « Quantité », « ou un tous les (m) » et « Symétrique à l'axe » (`UI.serie`, `UI.serieStep`, `UI.serieSym`, champs `data-ser`). Presser et tirer une ligne pose la série d'un coup, au même écartement, premier et dernier objets aux deux bouts. Sur une perche la ligne reste sur la perche et les objets s'y accrochent ; ailleurs ils se posent sur le sol, le plateau ou un gradin. Molette pendant le tracé : quantité. Un seul Ctrl+Z retire la série.
- `stage.js` : `seriePts(a, b, n, pas)`, `percheNear(x, z)`, `hitAt(x, z, pi)` (rayon vers le bas, la surface la plus haute sous 3 m), `placeSeries(typeId, pts, pi, base)`, `place(typeId, hit, quiet)`. Dans `bindCanvas` : écouteurs en capture, `A.orbit` et `A.orthoCtl` coupés pendant le tracé, aperçu `serG` (sphères jaunes) et étiquette `#serieTip`. Le tracé ne prend la main que si quantité > 1 ou pas fixe ; sinon on tourne la caméra comme avant.
- `plan.js` : nouveauté, on peut poser depuis le plan 2D (un clic = un objet, une ligne = une série) ; `drag.ser`, aperçu dans `draw()`.
- Essai : `tools/t63.py`.

## Praticables en bloc (3.8.0)
Quand le praticable est armé dans la bibliothèque (tout type `kind: 'riser'` d'au moins 1 m de large, `blkType`), le bandeau de série laisse la place à « Colonnes », « Rangées », « Hauteur » (20 à 160 cm), « Tourner les modules » (`UI.blkCols`, `blkRows`, `blkH`, `blkRot`).
- Tracer un rectangle (vue 3D ou plan 2D) : il se remplit de modules jointifs, au moins un, arrondi au module (`blkCells(t, a, b)`).
- Un clic : bloc colonnes × rangées centré sous le pointeur (`blkCells(t, a)`).
- Aimant : le coin de départ se colle au bord d'un praticable voisin à moins de 25 cm (`blkSnap`).
- Tous les modules d'un bloc sont au même niveau (celui du point de départ), reçoivent le même groupe « Scène n » et sont sélectionnés ; un seul Ctrl+Z retire le bloc (`placeBlock`).
- « Scène en praticables… » (bibliothèque, onglet Structure, et menu Salle) : largeur, profondeur, hauteur, recul ; scène centrée sur l'axe, du nez de scène vers le lointain.
- `place()` a un quatrième paramètre `init` (valeurs appliquées avant la construction 3D).
- Essai : `tools/t64.py`. Les essais longs se lancent en arrière-plan avec sortie dans un fichier (120 s de limite en avant-plan).
- Pas encore fait : outil du connecteur pour l'IA (poser un bloc, habiller une scène).

## État des lieux de la fusion (19.11.2026)
`docs/fusion-scenofactory-stagefactory.md` (hors sources) : tableau fonction par fonction des deux logiciels, proposition « on garde lequel », question de fond (base StageFactory ou base ScenoFactory) et ordre de portage. Envoyé à Benjamin pour correction ; **ne rien coder de nouveau avant sa réponse**. Lu pour l'écrire : PASSATION.md, l'aide intégrée de ScenoFactory (`src/helpText.ts`, 42 rubriques, la meilleure description de ce qu'il fait), `App.tsx` (métiers, outils, ancrage), `tokens.css`, les exports de `rigging.ts`. `journal/features.csv` est une vieille matrice, dépassée.

## Refonte à la ScenoFactory, étape 2 : rail d'outils et ancrage (3.12.0, artefact seulement)
Reproche de Benjamin le 19.11.2026 : « tu n'as pas beaucoup intégré ScenoFactory ». C'est exact. Jusqu'ici seuls sa note de passation et ses jetons de style avaient été lus ; son code (React + TypeScript + Vite, 8 000 lignes dans `src/sceno/ScenoFactory-0.45.0-sources/app/src`) ne se colle pas dans StageFactory (modules simples sans compilation), donc tout est réécrit à la main, et je l'avais fait sans regarder son code de près. **À partir de maintenant : lire le fichier ScenoFactory correspondant avant d'écrire chaque morceau** (App.tsx pour la disposition et les outils, Sheet.tsx pour le plan et les outils de tracé, StructureTool.tsx, trussLib.ts, trussSnap.ts, structures.ts et rigging.ts pour les ponts, Domains.tsx pour les inspecteurs, View3D.tsx pour la barre de la vue 3D).
- **`app/dock.js`** (nouveau, chargé depuis stage.js après wins.js, copié par build.sh) : `window.DOCK`.
  - **Métiers** dans la barre du haut (`#doms`) : Lumière, Rigging, Vidéo, Son, Scène, repris de `DOMAINS` dans App.tsx. Le métier choisit les outils du rail et la catégorie de la bibliothèque.
  - **Rail d'outils** (`#rail`) : Sélection, Sélection par rectangle, puis les outils du métier (Projecteur, Perche, Viser ; Pont, Perche ; Écran, Mur LED, Vidéoprojecteur ; Enceinte ; Praticable, Scène en praticables, Escalier, Rideau, Décor), puis Mesurer, Ajuster le plan, Bibliothèque, Environnement, ⇄. Un outil arme le type correspondant (`UI.placing`) ; une ligne d'aide (`#toolHint`) explique l'outil actif en haut de la vue 3D. Pas encore de raccourcis clavier propres aux outils (V, P, L, T, R, C, E, W dans ScenoFactory entrent en conflit avec ceux de StageFactory).
  - **Ancrage** : `D = { rail, atelier, env, plan }`, chacun `left` ou `right`, retenu dans `dock`. `layout()` empile les panneaux ancrés de chaque côté, puis partage la zone centrale entre le plan et la vue 3D (`P.frac` = part de la 3D). Boutons ⇄ sur le rail, dans l'en-tête du plan, de l'Atelier et de l'Environnement ; mêmes commandes dans le menu Affichage. `plan.js layout()` délègue à `DOCK.layout()`.
  - La vue 3D ne commence plus au bord gauche : variables `--vx` (bord gauche), `--vw` (largeur), `--vr` (distance au bord droit) ; `VX()` dans index.html ; les quatre calculs de pointeur (`pickObj`, `pickScene`, tracé de série, souris des rideaux) retranchent `VX()`.
  - Les panneaux ne recouvrent plus la vue 3D : ils la bordent.
- **Pas encore fait** : glisser un panneau pour l'ancrer (dans ScenoFactory, lâcher à moins de 70 px d'un bord) ; ancrage en bas (tiroir à onglets Patch, Bibliothèque, Liste, Rigging et charges…) ; Inspecteur à la place de l'Atelier ; seconde barre (titre, Nouveau / Ouvrir / Enregistrer, vues Plan / Coupe / 3D / Plan + 3D, Publier en PDF) ; barre de réglages de la vue 3D ; outils de tracé de ScenoFactory (perche, pont, point d'accroche tracés à la souris sur le plan).

## Refonte à la ScenoFactory, étape 1 (3.11.0, artefact seulement)
Benjamin a envoyé deux captures de ScenoFactory (projet ouvert et projet vide) : c'est la cible, disposition et habillage. Décisions prises le 19.11.2026 :
- **Le mot « lieu » est abandonné** au profit d'**Environnement** : c'est un module (murs, plateau, perches, import de plans), **fermé par défaut**. Menu « Environnement », « Panneau Environnement » (Tab), « Créer l'environnement depuis des plans », « environnement enregistré ». Le parc s'appelle « Parc de matériel » et son onglet de bibliothèque « Parc ». Les élisions ajoutées utilisent l'apostrophe typographique (’) pour ne pas casser les chaînes entre apostrophes.
- **Ouverture** : toujours un projet vierge « Sans titre » dans un espace vide (`A.VOPEN`, `blankShow()` dans stage.js), sans dialogue ni accueil. Le projet précédent, s'il n'était pas vide, est copié dans `lastShow` et se rouvre par Fichier → « Reprendre le dernier projet » (commande `resume`). La démonstration : Fichier → « Ouvrir la démonstration ».
- **Disposition de départ** (fin d'`initWS` dans app.js) : plan technique et vue 3D côte à côte, grille 3D allumée, panneau Environnement fermé, repère (zone, distance) masqué, Atelier ouvert sur la bibliothèque si la fenêtre fait au moins 1150 px.
- **Espace vide** : la grille 3D passe au-dessus du sol nu (view.js) ; le plan 2D ne montre que la grille, l'axe et « NEZ DE SCÈNE », cadré sur 18 m autour du zéro ou sur le matériel (`fit()` dans plan.js).
- **Habillage** : bloc « habillage StageFactory » à la fin des styles d'index.html, jetons repris de `ScenoFactory/app/src/tokens.css` (fond #15171c, surface #1d2027, bordure #343945, texte #e9ebf0, accent ambre #f2a93b, rayons 4 à 6 px). Les couleurs violettes et turquoise écrites en dur ont été remplacées dans les styles (index.html et styles injectés par les modules), pas dans les couleurs de lumière des projets. Marque « StageFactory » en ambre à gauche de la barre ; l'ancien bouton `#menuBtn` reste dans la page, caché.
- **Essais** : l'ancien démarrage (dernier projet ou démonstration) reste disponible avec `?demo` dans l'adresse ; tous les essais `tools/t*.py` et `tools/h.py` l'utilisent. `SF_BLANK=1` fait démarrer `h.py` sur le projet vierge. t60 et les essais plus anciens n'ont pas été relancés depuis.
- **Reste à faire pour ressembler à ScenoFactory** (ordre proposé) : 1. plan à gauche et 3D à droite (aujourd'hui l'inverse : les calculs de pointeur de la vue 3D supposent qu'elle commence au bord gauche) ; 2. rail d'outils vertical à gauche (sélection, mesure, projecteur, pont…) et ligne d'aide de l'outil ; 3. seconde barre : titre du projet, Nouveau / Ouvrir / Enregistrer, onglets de métier (Lumière, Rigging, Vidéo, Son, Scène), vues Plan / Coupe / 3D / Plan + 3D, Publier en PDF ; 4. Inspecteur à droite (Projet, Cartouche, Impression, Fond de plan, Calques) à la place de l'Atelier à onglets ; 5. panneau du bas à onglets (Patch, Bibliothèque, Liste des projecteurs, Rigging et charges, Sécurité, Console, Avertissements) ; 6. barre de réglages de la vue 3D (Déplacer / Tourner, aimant, faisceaux, brume, lumière, sol, exposition, rendu).

## Vocabulaire générique et plein air (3.10.0, artefact seulement)
Demande de Benjamin : plus aucune référence à Onex dans l'interface, et un vocabulaire qui ne suppose pas une salle (une scénographie peut être en plein air), « comme Vectorworks ».
- **Mots retenus** : le conteneur s'appelle un **lieu** (menu Lieu, panneau Lieu, onglet Lieu de la bibliothèque, « Parc du lieu », « Dimensions du lieu », « Créer le lieu depuis des plans », « lieu enregistré »). La zone des spectateurs s'appelle le **public** (étiquette PUBLIC sur le plan, « Lumière public », vues « Depuis le public », ambiance « Public tamisé »). L'ancienne salle d'Onex est la **Salle de démonstration** ; ses projets s'appellent « Démo — … ».
- **Inchangé exprès** : les identifiants internes (`type: 'onex'`, `salle` dans le projet, `onex.` dans le stockage, dossier OnexPreviz) et tout ce que lit l'IA (noms d'outils `creer_salle`, `lire_salle`, `regler_salle`, descriptions, méthode en trois passes) : ils disent encore « salle ». À reprendre le jour où l'on retravaille l'IA, avec le plugin d'agents.
- **Nouveau projet** (app.js `newProject`, `wsNewOk`) : titre « Nouveau projet », un seul choix « Point de départ » : Espace vide — plein air ; Lieu à décrire ; lieux enregistrés ; Salle de démonstration. Les réglages de la démonstration (configuration, hauteur des perches, rideaux) n'apparaissent que si on la choisit (`#npDemo`). Le dernier choix est retenu (`newFrom`).
- **Plein air** : lieu `param` avec `open: true` (venueNorm) → ni murs, ni plateau, ni perches (`shell: false`, `noPipes: true`, sol de 60 × 60 m). `setVenue` ne construit pas le plateau ; le plan 2D ne dessine ni plateau ni cote de plateau et écrit « bord de scène 0,00 ». On y construit la scène avec les praticables et, bientôt, les ponts.
- Reste à faire : dans le panneau d'un lieu en plein air, les champs « plateau », « cadre », « cage de scène » sont encore affichés ; l'aide « Bienvenue » parle encore de configurations de la démonstration.

## Mode spectacle sans lumière (3.9.1, artefact seulement, pas d'installeur)
Benjamin a signalé « mode spectacle, aucune lumière » dans l'artefact. Non reproduit : dans le projet de démonstration et dans une salle sur mesure avec des projecteurs, la lumière sort (essais avec `tools/h.py`). Cause probable : un projet sans projecteur ou avec tout à zéro, où le mode spectacle coupe l'éclairage de service et laisse un écran noir. Corrections :
- `noLight()` et `A.liveGuard` (stage.js) : en mode spectacle sans projecteur allumé, sans vidéoprojecteur et sans DMX reçu, un message l'explique et une veilleuse reste (`applyAmb` dans index.html garde l'hémisphère à 0,1). Revérifié toutes les 0,8 s.
- index.html : l'avertissement de fluidité appelait `STAGE.toast` alors que `STAGE` y désigne les projecteurs de service du plateau ; une image sautait avec une erreur quand l'affichage passait sous 20 images/s. Corrigé en `window.STAGE.toast`.
- L'outil de vérification dans la vraie visionneuse d'artefact n'est pas disponible dans cette session : si le problème persiste, demander une capture et le projet.

## Habillage de scène et formes spéciales (3.9.0)
Nouveaux types dans `LIB` (onglet Structure) : `prat-1` (1 × 1 m), `prat-tri` (triangle, `shape: 'tri'`), `prat-qr` (quart de rond, `shape: 'quart'`), `escalier` (`kind: 'stairs'`, size = [largeur, –, hauteur], marches de 20 cm, giron 28 cm, le haut au bord de la scène, descend vers z local positif), `garde-corps` (`kind: 'rail'`, `len`, lisse à 1,10 m), `jupe` (`kind: 'drape'`, `skirt: true`). Les poids de ces types sont des ordres de grandeur, pas des données fabricant.
- Triangle et quart de rond : angle droit au coin jardin-lointain du module, on tourne avec la rotation. Ils se posent à l'unité (`blkType` les refuse).
- `stageEdges(mods)` : pourtour extérieur d'un groupe de praticables rectangulaires, par tronçons { side, f, a, b, h, y } ; les bords communs à deux modules s'annulent (découpe en unités de 50 cm). Fonctionne pour une scène en L ou à plusieurs niveaux.
- `dressStage(grp, { jupe: [côtés], rail: [côtés], stair: côté, keep })` : pose jupes (une par tronçon), garde-corps (en longueurs de 2 m puis le reste, à hauteur du plateau) et un escalier au milieu du plus long tronçon du côté choisi ; le garde-corps s'ouvre devant l'escalier. Les objets créés portent `dress: 1` et le groupe de la scène ; refaire l'habillage remplace l'ancien. Côtés : avant (public), arriere, jardin, cour.
- Entrées : bouton « Habiller la scène… » dans les réglages d'un praticable (action `dress`) ; mêmes cases dans le dialogue « Scène en praticables… ».
- Plan 2D : symboles pour triangle, quart de rond, garde-corps (trait épais et poteaux), escalier (marches et flèche de descente), jupe (tireté), rideau (trait épais).
- Essai : `tools/t65.py`.
- Pas fait : main courante d'escalier, rampe d'accès, jupe et garde-corps sur les bords d'un triangle ou d'un quart de rond, contrôle de charge au mètre carré des praticables.

## Double-clic dans la liste des objets (3.6.2)
Double-clic sur une ligne de l'onglet « Objets » : l'objet est sélectionné et l'Atelier passe sur « Réglages ». Le code est dans `stage.js`, action `sel` de `onClick` : il lit le compteur de clics (`e.detail`) et exige que les deux clics tombent sur la même ligne (`lastSel`). Ne pas utiliser l'événement `dblclick` ici : le premier clic redessine la liste, la ligne visée est détachée et l'événement ne remonte plus jusqu'à `#console`. L'œil et le cadenas gardent leur rôle. Essai : `tools/t62.py`.

## Pilotage DMX obligatoire (3.6.1)
Pour Benjamin, pouvoir piloter les appareils en DMX est primordial.
- creer_type REFUSE un appareil lumière de plusieurs canaux sans `modesDmx` (le message donne l'ordre : titan_search / titan_import, puis notice du fabricant, puis `sansDmx: true` en dernier recours, pour une simple implantation).
- `PARC.dmxOk(t)` : pilotable quand chaque mode a un ordre de canaux de la bonne longueur (DMX.layout : `t.chs`, ou personnalités intégrées GEN). ecrire_parc et lire_parc rendent `nonPilotables` ; l'onglet « Salle » affiche « DMX à décrire » ; la fenêtre du parc a une colonne DMX (✓ n can. / ✗ à décrire).
- Décrire le DMX à la main : clic sur la colonne DMX → une ligne par mode, « Nom : dimmer, rouge, … » (`PARC.setDmx`).
- Outil verifier_dmx : type pilotable, adresse, chevauchements, univers reçu, état de la passerelle ; rend le patch (univers.adresse, mode) et, avec detail, l'ordre des canaux, à recopier dans la console. 36 outils publiés.
- Essai : tools/t61.py, version installée, vraie trame Art-Net (tools/send_dmx.js) à travers la passerelle : gradateurs, automatique décrit (dimmer, couleur, pan/tilt, zoom), appareil non décrit muet puis décrit à la main et répondant.
- Fonctions DMX reconnues par la prévisualisation : dimmer (8 ou 16 bits), pan/tilt (8 ou 16 bits), RVB + blanc, CMJ, zoom, strobe, shutter. Le reste (roue de couleurs, gobos, CTO, ambre, prisme, iris, couteaux) garde sa place dans l'ordre des canaux mais n'est pas rendu.
- Toujours non vérifié : les vraies personnalités Titan des Astera AX5, Martin ELP, Mini-B, Arolla Profile MP, Sunstrip T10 et Phantom 1220 (Titan absent ici ; l'essai t45 sur un .d4 réel demande un fichier non joint), et la réception depuis un vrai Titan (un seul univers avec le T1).

## Installeur Windows (3.2.1)
L'installeur demandait de redémarrer Windows à chaque fois : quand node.exe est tenu ouvert par le connecteur Claude, il est renommé puis effacé avec `/REBOOTOK`, ce qui lève la demande de redémarrage. `/REBOOTOK` retiré ; le fichier renommé est effacé à l'installation suivante. Constaté chez Benjamin, correction non confirmée.

## Nom
Le nom affiché est StageFactory partout. Restent volontairement à l'ancien nom, pour que l'existant continue de marcher : dossier de réglages `OnexPreviz` (clé API, cache du connecteur), dossier d'installation Windows et clés de registre `OnexPreviz` (mise à jour en place : le chemin de mcp.js déjà inscrit dans Claude Desktop reste valable), préfixe `onex.` du stockage du navigateur, `window.ONEX_LIBS`, sonde `/__onex`, variable `ONEX_PORT`. Sur Mac l'application s'appelle StageFactory.app : le chemin du connecteur change, à réinscrire.

## Création de salle depuis des plans (3.1.0)
- app/venue.js : fenêtre « Créer la salle » (Fichier ou menu Salle), lecture des fichiers, résumé des plans de CAO pour l'IA, outils du créateur (lister_documents, voir_document, lire_texte_pdf, caler_plan, caler_plan_cao, regler_salle, poser_perches, poser_perche, retirer_perches, lire_salle, noter_faits), calage à la main (échelle par deux points, zéro, alignement, quarts de tour), calques et murs, perches une à une, faits retenus. window.VENUE
- app/cad.js : DXF (app/vendor/dxf-parser.js, assemblé par esbuild depuis dxf-parser 1.1.2, MIT) et DWG (LibreDWG en WebAssembly, chargé dans la page à la première utilisation) ; repris de cad.ts / cad.mjs
- Trois chemins pour l'IA : assistant local (/api/ai/chat, clé de l'utilisateur, images envoyées, une passe = un seul Ctrl+Z, la conversation continue pour « améliorer ») ; connecteur Claude (mêmes outils publiés par MCP, mcp.js rend les pages en image quand le résultat porte `__mcp`) ; version en ligne (window.claude sample : sans image, textes seulement)
- Modèle de salle (index.html, venueNorm / setVenue) : la salle « param » gagne cadre (prosW, prosH, prosZ), cage (cageH), gril (gridH), gradin (rows, rowD, rowH, rowHLast, rowStart), fosse (pitD, pitY, pitW), passerelles (galHs, galW, backGalH), shell: false (murs venus du plan), pipes (perches une à une : n, z, len, y, x ; 60 au plus, PERCHES grandit à la demande, P.off pour celles rangées), plan (fiche légère : id, k, ax, ay, rot, hidden, walls, wallH), facts / questions / notes
- Plan importé : la fiche légère est dans le projet (annulable) ; les traits ou l'image sont dans APP.PLANS (mémoire), IndexedDB `stagefactory` (retrouvés au rechargement, 12 plans gardés) et dans le fichier exporté (`planData`). Pas dans l'enregistrement en ligne ni dans localStorage. Repère du plan : unités du dessin ou pixels, Y vers le bas ; APP.planXf fait le passage vers la salle
- Règles tenues : aucune perche inventée, aucune charge admissible remplie par l'IA, chaque fait porte sa source et sa confiance
- Bibliothèques : en ligne par jsdelivr (pdfjs-dist 4.6.82, @mlightcad/libredwg-web 0.8.8) ; version installée dans app/lib (build.sh), donc hors ligne

## Arborescence
- app/ : l'application (page web, modules ES, three.js 0.170 par importmap)
  - index.html : salle d'Onex (bâti, tribune, fosse, perches, rideaux), salles sur mesure (VEN, setVenue, venueBounds), rendu, barre du haut, coupe par lancer de rayons (sectionPoints)
  - venue.js, cad.js, vendor/dxf-parser.js : création de salle depuis des plans (voir plus haut)
  - stage.js : Atelier (bibliothèque, objets, mémoires, import GDTF/MVR/.d4 Avolites, scènes par configuration, undo). window.STAGE
  - prog.js : moteur lumière type grandMA (programmeur, tracking, exécuteurs). window.ENG
  - desk.js : pupitre et ligne de commande ; plan.js : plan 2D + coupe ; rig.js : plan de charge (poutre continue FEM) ; dmx.js : réception Art-Net/sACN ; audio.js ; led.js : mur LED ; cine.js : show démo cinéma ; lib.js : bibliothèques Titan et GDTF Share ; ai.js : assistant, outils, boucle du connecteur MCP ; app.js : menus, raccourcis
  - scene-data.json : géométrie d'Onex (générée par tools/gen_onex.py)
- local/ : version installée. serveur.js (passerelle Node sans dépendance : fichiers, WebSocket DMX, /api/lib, /api/ai, /api/mcp), mcp.js (connecteur MCP stdio pour Claude Desktop), build.sh (assemble dist/ avec les bibliothèques en local)
- pack/ : pack.sh (installeur NSIS Windows + deux .app Mac). Il faut retélécharger les exécutables Node 22 (win-x64, darwin-arm64, darwin-x64) dans pack/rt — ils ne sont pas dans cette archive (552 Mo).
- tools/ : h.py (harnais Playwright + SwiftShader ; rendu très lent : couper la boucle avec APP.renderer.setAnimationLoop(null) et avancer à la main), essais t40 (pupitre, 35 points), t44 (show démo), t45 (.d4), t46 (bibliothèques, faux GDTF Share), t47 (assistant, fausse API), t48/t49 (connecteur MCP), t50 (salles sur mesure), t51 (liste d'outils MCP), t52 (création de salle : modèle, DXF, DWG, PDF, image, calage, outils), t53 (capture 3D d'un plan DXF), t54 (version installée : créateur face à la fausse IA tools/mockai.js, puis connecteur MCP avec images). t45, t46, t47 et t49 demandent des fichiers absents de l'archive (un .d4, /tmp/mock.js, /tmp/mockai.js, /tmp/titanlib) : non relancés en 3.1.0. tools/npmx-package.json liste aussi dxf-parser, pdfjs-dist, libredwg-web et esbuild. Les plans d'essai viennent de l'archive ScenoFactory (app/test/salle.pdf, app/test/samples)

## Conventions
Y vers le haut, mètres, origine au nez de scène ; X+ = cour ; Z+ vers le public. Plateau à y = 0.
Projet (STAGE.S) : objs, lib, cues, prog, xseq, salle ({type:'onex'} ou {type:'param', w, d, h, stageW, stageD, stageH, perches, percheLen, percheY}), room (état de la salle d'Onex), rig, audio, pal.
Artefact publié : slug 602929ae-bbc6-46ab-a952-23cdb5d71d38, titre « StageFactory », republié en 3.12.0 le 19.11.2026 (version 1795111550-d055, 21 fichiers avec dock.js : tout `app/` tel quel, `vendor/dxf-parser.js` compris). Publication : `list_files`, puis `publish_files` avec `base_version`. Essai avant publication : `tools/h.py` (`open_app`) charge `app/` sans passerelle.

**Règle de travail décidée le 19.11.2026** : on travaille dans l'artefact. Chaque évolution d'interface est republiée dans l'artefact et Benjamin l'essaie là. Pas d'installeur tant qu'aucune fonction locale n'est à essayer (DMX Art-Net/sACN, connecteur Claude, bibliothèque Titan, DWG, fichiers de salles sur disque, vue 3D sur un autre écran). Le numéro de version continue de monter ; l'installeur se refait à la demande ou quand une fonction locale change.
Les routes de la passerelle sont sous /api/… (jamais /lib/, qui sert les bibliothèques three.js).

## Jamais vérifié sur une vraie machine
Installeurs Windows et Mac, réception DMX depuis Titan (T1 : un seul univers), GDTF Share réel (API écrite de mémoire, testée sur un faux serveur), API Anthropic réelle pour l'assistant local, dictée locale, show démo à l'oreille, enregistrement vidéo.
Constaté chez Benjamin : le connecteur MCP est chargé par Claude Desktop (18 outils). L'installeur échouait sur node.exe verrouillé ; corrigé en 2.5.1 par renommage, non confirmé.
Je n'ai pas pu piloter Titan par clics (sans effet) ni par son API web (indisponible avec le T1).

## Jamais vérifié en 3.1.0
Le créateur de salle n'a tourné que face à une fausse IA et sur de petits plans d'essai : jamais sur un vrai dossier de salle avec la vraie API, ni depuis Claude Desktop. LibreDWG lu sur six petits DWG seulement. L'artefact en ligne (chargement de pdf.js et du DWG par jsdelivr sous sa politique de sécurité) n'a pas été essayé. pack.sh a été renommé mais pas relancé (exécutables Node absents).

## Limites connues des salles
Salle symétrique sur l'axe, murs de la boîte droits (les murs obliques viennent du plan de CAO), un seul gradin sans balcon, 60 perches au plus, pas de pont ni de perche oblique, un seul plan par projet, PDF posé en image (pas en traits). Les murs tirés du plan sont des cloisons minces sans ouverture. Configurations et show démo restent propres à Onex.

## 4.0.0 — fusion ScenoFactory, points 1 à 7 (19.11.2026)

Demande de Benjamin : porter les points 1 à 7 du tableau de fusion sur la base StageFactory, livrer un installeur, choisir la fonction la plus aboutie pour les doublons et signaler ceux qui ne sont pas tranchés.

**Principe retenu : on ne réécrit pas ScenoFactory, on le compile.** `sfb/` (esbuild) assemble les modules TypeScript de ScenoFactory en deux fichiers lus par StageFactory :
- `app/sceno-core.js` (47 Ko) : `trussLib.ts`, `structures.ts`, `rigging.ts`, `beam.ts`, `model.ts` (evenPoints, defaultSafety). Commande : `cd sfb && npx esbuild core.ts --bundle --format=esm --target=es2020 --outfile=../app/sceno-core.js`.
- `app/sceno-props.js` (7 Mo, lu seulement au besoin) : `props.ts`, `props3d.ts`, `kit3d.ts`, `propsHD.ts`, `peopleData.ts`. Commande : `cd sfb && node alias.mjs` (three reste externe ; `three/examples/jsm/` est renvoyé sur `three/addons/`).
- `app/decor-list.js` : liste fabriquée (clé, nom, groupe, cotes) pour que les types existent dès l'ouverture d'un projet.
- `app/vendor/pdf-lib.js` : pdf-lib, comme ScenoFactory.
Si ScenoFactory évolue, on relance ces commandes : pas de portage à la main.

**Nouveaux modules**
- `ponts.js` (`window.PONTS`) : ponts gardés au format `Support` de ScenoFactory dans `S.sups` (mm, y = −z, `zMm` = hauteur sous pont ; `kind:'totem'` pour les totems). Tracé à la souris (plan et 3D, repris de `trussSnap.ts`), raccords et angles de coins, structures (`planStructure`), 3D en `InstancedMesh`, dessin dans le plan et la coupe par `window.PLANX`, accroche des appareils (`o.hang='pont'`, `o.sid`), Inspecteur du pont (`propHtml`), volets « Rigging et charges » et « Sécurité ». `doc()` fabrique le document que lit `rig()`. `S.safety` = réglages de sécurité.
- `drawer.js` (`window.DRAWER`) : tiroir du bas. `stage.js render()` renvoie les onglets lib/list/con vers le tiroir ; l'Atelier devient l'Inspecteur (Réglages, Projet). `A.bindPanel(el)` branche les gestes du module principal sur n'importe quel panneau.
- `decor.js` (`window.DECOR`) : types `sf-<clé>` (kind `sprop`, catégorie de bibliothèque « Décor »), modèles lus à la demande, vignettes.
- `publish.js` (`window.PUB`) : cotes (`S.dims`), calques (`S.layers`, `A.layHid(o)`), cartouche (`S.layers.cart`), PDF (`PLAN.sheet()` rend une vue hors écran), rapport de sécurité.
- `linearray.js` (`window.LARRAY`) + `la-data.js` : données fabricants sourcées, `S.arrays`, types `lab-<modèle>` (kind `labox`).
- `plan.js` : `PLAN.world`, `PLAN.sheet`, crochets `window.PLANX` (dessin en plus), `A.layHid`.

**Doublons : ce qui a été choisi**
- Tranché pour StageFactory : environnement paramétrique et création depuis des plans, import PDF/DWG/DXF, DMX (entrée Art-Net/sACN, pupitre), assistant et connecteur Claude.
- Tranché pour ScenoFactory : ponts, structures, points d'accroche, calcul des charges des ponts, sécurité, décor et personnages, PDF.
- Non tranché, à regarder avec Benjamin : (1) perches du lieu calculées par `rig.js` (tube, contrainte, flèche, appuis qui se détendent) et ponts par `rigging.ts` (deux méthodes, cas défavorable) : deux présentations ; (2) GDTF : StageFactory lit modes et canaux, ScenoFactory construit aussi le modèle 3D (`gdtf3d.ts`, non porté) ; (3) MVR : `mvr.ts` de ScenoFactory non comparé en détail ; (4) coupe : faisceaux en coupe de `section.ts` non portés ; (5) anciens personnages et instruments stylisés de StageFactory encore dans « Structure » à côté du nouveau « Décor » ; (6) anciens objets « Line array 6/8 boîtes » à côté du nouveau module.

**Pas fait** : l'IA ne connaît pas encore les ponts, le décor ni le line array (outils MCP inchangés, 36) ; glisser-ancrer des panneaux ; seconde barre ; raccourcis d'outils ; pose élément par élément d'un pont (`placePiece`) ; échelles et bras de déport dessinés en 3D ; flèche et contrainte d'une perche par `beam.ts`.

**Essais** : `t66` (ponts, calcul, tiroir), `t67` (décor, cotes, calques, PDF, line array), `t68` (version installée). `t62` adapté au tiroir. Jamais vérifié sur une vraie machine ni dans la vraie visionneuse d'artefact.

## 4.0.1 — audit après la fusion (19.11.2026)

Trois passes : `tools/a1.py` (toutes les commandes, outils, onglets, types d'objets : erreurs de script), `tools/a2.py` (captures en 1366 × 768), `tools/a3.py` (gestes à la souris, clavier, annulation). Corrigé :
- **Caméra accrochée après un tracé de pont en 3D** : le clic était retiré à OrbitControls (`stopImmediatePropagation` sur `pointerup`). Désormais `stage.js` ignore le clic quand `PONTS.tl` est actif, et OrbitControls reçoit tout.
- Saisie : après un changement, le panneau était redessiné et le champ suivant perdait la main. `A.keepFocus(fn)` redessine puis rend la main au champ où l'on est arrivé (Inspecteur, pont, patch, sécurité).
- Sélection d'un objet : désélectionne le pont (et inversement).
- Barre du haut : tenait sur 1376 px, coupée à 1366. Marges réduites sous 1560 px.
- Inspecteur : bouton ⇄ qui restait collé par-dessus le contenu en défilant ; tableau des points d'accroche illisible (colonnes fixes, libellés courts) ; champs du détail trop étroits.
- Pupitre ouvert : le rail d'outils et l'Inspecteur passaient dessus.
- Coupe et plan d'un espace ouvert : cadrage sur le matériel et les ponts (la coupe se cadrait sur 60 m).
- Plan détaché : ne se redimensionnait plus avec le tiroir (règle `bottom` forcée) ; une fenêtre lâchée trop bas garde son coin de redimensionnement à l'écran.
- Projet vierge chargé en mode spectacle : restait noir. Le mode spectacle se coupe s'il n'y a aucune source.
- Line array : la visée automatique pouvait envoyer une boîte devant le premier rang ou derrière le dernier.
- Diagramme des charges : numéro de point et charge superposés. Patch : en-tête qui masquait la première ligne. PDF : colonnes de la liste du matériel.
- Essais `t55` et `t62` remis à jour pour le rail et le tiroir.
Reste vu et non corrigé : voir la réponse à Benjamin (liste « à voir ensemble »).

## 4.0.2 — retours de Benjamin à l'usage (à partir du 19.11.2026 au soir)
Benjamin commence un vrai projet et signale les défauts un par un. Chaque correction part tout de suite dans l'artefact ; l'installeur est refait par lots.
1. « Passer le plan 2D en plein écran sans la 3D » : trois vues exclusives dans la barre du haut, **3D**, **Plan + 3D**, **Plan** (`DOCK.view('3d'|'split'|'plan')`, `D.pfull`, classe `body.planfull`, Maj + P). En plan seul la vue 3D n'est plus calculée (`draw()` sort tout de suite). Essai `t69`.
2. « Poser d'abord mes points d'accroche avec mes moteurs ; la truss ne se met pas sans moteur ; elle ne respecte pas les longueurs réelles, il faut optimiser les bouts » :
   - **Points d'accroche libres** : `S.sups` accueille des objets `kind:'point'` (`a` = `b` = position, `zMm` = hauteur du point du bâtiment ou null, `pt:{kind,capacityKg,hoistKg,cls,secondary,originCapKg}`). Outil « Point d'accroche » (`PONTS.tool('point')`, rail Rigging) : un clic, seul ou en grille nx × nz. `link()` (appelé par `snap()` à chaque `touch`) fait de tout point libre situé à moins de 35 cm de l'axe d'un pont un point de ce pont (`p.pid`), tient sa position à jour et recopie ses données ; un point d'angle porte plusieurs ponts. Les réglages d'un point `pid` faits depuis le pont sont écrits dans le point libre.
   - **Pont sans moteur** : option « Accroche » de l'outil (`O.hang` : `auto`, `none`, `legs`). Un pont tracé au-dessus de points déjà posés ne reçoit aucun moteur automatique.
   - **Découpe optimisée** : `bestComp`/`nearComps` (programmation dynamique au centimètre sur toutes les longueurs du catalogue ; coût = écart en cm + 2,5 par pièce + 2 par pièce hors pas). Longueur tapée dans la barre de l'outil (Entrée) ou dans l'Inspecteur : la découpe la plus proche est posée et gardée dans `s.pieces` ; les longueurs voisines sont proposées. À la souris, la longueur reste au pas de la série (éléments standard). Essai `t70`.
3. « Pouvoir snapper les objets sur les perches et les ponts, comme dans ScenoFactory » : **aimant** (`stage.js` : `magnet`, `supportNear`, `magState`, `magSay` ; `PONTS.nearest`). En glissant dans le plan, un projecteur, une enceinte (hors sub et retour) ou un vidéoprojecteur qui passe à moins de 40 pixels (0,8 m au plus) d'une perche ou d'un pont s'y accroche et se cale sur l'axe ; il change de support en passant de l'un à l'autre ; tiré hors de portée, il se décroche (accroche fixe à sa hauteur s'il était suspendu au départ, retour au sol sinon). Alt : sans aimant. Avec les flèches de la vue 3D, l'aimant joue en fin de geste à 60 cm en vraie distance (hauteur comprise). Un moteur libre glissé près d'un pont se cale sur son axe ou sur son bout et devient un de ses points. Essai `t71`.
4. « Poser les bouts de poutre un par un ; vraiment bosser cet outil ; regarde la vidéo Braceworks (https://youtu.be/RKQ3k78EwR8) » : vidéo de promotion de 88 s de Vectorworks Braceworks, regardée image par image dans le navigateur intégré (Gemini répondait 503). Ce qu'on y voit : outil « Insert Truss » qui pose les éléments un à un avec raccord automatique au bout (aperçu rouge), cubes d'angle et tours, moteurs avec leur chaîne jusqu'au point du bâtiment, charges dessinées en flèches (jaunes ponctuelles, bleues réparties), courbes d'efforts le long des ponts, dialogue « Calculation Overview » avec feu tricolore et taux de charge, rapport. Repris :
   - **Pièce par pièce** (`PONTS.tool('piece')`, bouton dans la barre de l'outil Pont) : palette des longueurs de la série, `placePiece()` repris de `trussSnap.ts` (prolongement = le pont s'allonge et garde `s.pieces` dans l'ordre ; côté = nouveau pont en coin au catalogue), l'outil reste accroché au bout posé (`t.from`), Retour arrière (`pieceBack`, par annulation), R, Échap (lâcher le bout), raccord à un bout existant, ajout en tête.
   - **Pièces dans l'Inspecteur** : `piecesOf`, `setPieces` — remplacer, retirer, ajouter une pièce.
   - **Charges en 3D** (`loads3d`, `O.show3d`) : flèches, étiquette de la charge à retenir par point, courbe du moment.
   - **Feu tricolore** en tête du volet Rigging et charges.
   Pas repris : ponts courbes et cercles, cubes d'angle modélisés en 3D (le coin est compté dans la nomenclature, pas dessiné), calcul par éléments finis de l'ensemble de la structure (chaque pont reste calculé seul). Essai `t72`.
5. Cubes d'angle (4.0.5, 20.11.2026) — suite de la vidéo Braceworks, « Vas y » de Benjamin.
   - `PONTS.nodes()` (ponts.js) : même règle que `trussBom` de ScenoFactory — bouts à moins de 60 mm et même hauteur (±60 mm), ou tête de tour (`leg` au bout). Nœud `{at, z, members:[{s, along, dir}], tower, ways, ang, code, label, kg, sec, se}`. 180° = simple raccord, pas de cube.
   - 3D : `cubes3d()` (groupe à part, refait dans `changed()`), 12 arêtes + noyau sombre. Plan : carré plein + fin de la référence (C003) quand on zoome.
   - Poids : tous `null` dans la bibliothèque → saisie par référence dans la nomenclature (`data-ck`), gardée dans `S.cornerKg` (enregistré avec le projet, annulable). `PONTS.bom()` enveloppe `C.trussBom` (utilisé aussi par publish.js). Dans `doc()`, le poids du coin devient une charge ponctuelle synthétique (`corner:true`, jamais écrite dans `s.loads`) au bout de chaque pont relié, poids / nombre de ponts. `results()` et `beamPlan` lisent donc `d.supports[s.id]` (copie) et plus `s`.
   - Corrigé dans la copie de `trussLib.ts` (et recompilé dans sceno-core.js) : une tête de tour prenait le premier coin 2 départs du catalogue (45°) ; elle prend maintenant le 90°.
   - Limites : jonction en T au milieu d'un pont non reconnue ; le bras du coin n'est pas retiré de la longueur des pièces (note de la nomenclature). Essai `t73`.
   Reste de la vidéo : ponts courbes et cercles ; calcul d'ensemble d'une structure.
6. Faisceaux volumétriques (4.0.6, 20.11.2026) — « est-ce que le chevauchement des lumières colle physiquement ? ». L'addition était déjà juste (AdditiveBlending dans le tampon HDR du composer, ACES ensuite), mais le faisceau était une coquille. `beamVS/beamFS` (stage.js) : cône fermé (`beamGeo` avec bouchons), intersection analytique regard/cône tronqué dans le repère du cône, 8 pas avec décalage par pixel, éclairement en 1/section (1/d²), bord adouci (`soft` selon le type), diffusion vers l'avant (Henyey-Greenstein g = 0,3), flux relatif `lumens/8000`. Face avant = première moitié du trajet, face arrière = seconde (caméra dans le cône : tout sur la face arrière) : un objet dans le faisceau cache ce qui est derrière lui, sans texture de profondeur. `BEAMK` = réglage d'affichage. Pas fait : ombre portée dans la fumée (un objet ne coupe pas le faisceau en aval), barre LED toujours en cône. Essai `t74` (captures, pas d'assertion d'image).

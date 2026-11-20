# Fusion ScenoFactory × StageFactory — état des lieux

19.11.2026. À corriger par Benjamin avant toute nouvelle ligne de code.

## Ce qui a été lu

- ScenoFactory 0.45.0 : la note de passation en entier ; les 42 rubriques de l'aide intégrée (le début de chacune) ; la disposition, les outils et les métiers dans `App.tsx` ; les jetons de style ; les fonctions exportées du calcul de charges.
- Pas lu ligne à ligne : le calcul de charges, le plan 2D (`Sheet.tsx`), la vue 3D (`View3D.tsx`), le catalogue de décors, les exports PDF et MVR. Chaque fichier sera lu avant d'être porté.
- StageFactory : connu par le travail des derniers jours.

## Fonction par fonction

« Mieux » = plus complet d'après ce qui a été lu. À corriger si l'usage dit autre chose.

| Fonction | ScenoFactory | StageFactory | Proposition |
|---|---|---|---|
| Disposition : métiers, rail d'outils, inspecteur, tiroir du bas, vues détachables | Complet | Rail et métiers depuis aujourd'hui ; pas d'inspecteur ni de tiroir | Reprendre ScenoFactory |
| Tracer à la souris : perche, pont, point d'accroche, praticable, rideau, écran | Oui, sur le plan | Non (on pose des objets) | Reprendre ScenoFactory |
| Pose en série | « Série répartie » | Ligne tirée à la souris, 3D et plan | Garder StageFactory |
| Praticables en bloc, habillage (jupe, garde-corps, escalier) | Duplication bord à bord | Rectangle tracé, habillage d'un clic | Garder StageFactory |
| Ponts par fabricant (Prolyte H30V, H40V, X30V, Global Truss F34), raccords, angles | Oui | Un pont générique | Reprendre ScenoFactory |
| Structures : portique, gril sur tours, pont suspendu, totems | Oui | Non | Reprendre ScenoFactory |
| Calcul de charges : poutre continue, trois chiffres par point, moment, tranchant | Oui | Charge totale et par moteur seulement | Reprendre ScenoFactory |
| Charges de rigging libres, bras de déport, échelles | Oui | Non | Reprendre ScenoFactory |
| Élingue, palonnier, point du bâtiment | Oui | Non | Reprendre ScenoFactory |
| Classes de moteurs D8 / D8+ / C1, personnes sous les charges | Oui | Non | Reprendre ScenoFactory |
| Onglet Sécurité, rapport PDF, estimation électrique | Oui | Non | Reprendre ScenoFactory |
| Charge lue dans une fiche, proposée puis validée | Non | Oui | Garder StageFactory |
| Salle paramétrique (plateau, cadre, gradin, gril, passerelles, fosse) | Oui, avec types tout faits | Oui | À comparer |
| Espace vide, plein air | Projet vide | Oui | Garder StageFactory |
| Import de plans DXF, DWG, PDF, image, calage | Oui | Oui | À comparer |
| Création de la salle par l'IA depuis les plans | Oui | Oui (repris de ScenoFactory) | Déjà fusionné |
| Parc de matériel par salle, stock, alertes | Non | Oui | Garder StageFactory |
| Bibliothèque GDTF, GDTF Share | Oui | GDTF oui | À comparer |
| Bibliothèque Avolites Titan | Non | Oui | Garder StageFactory |
| Numérotation et patch, conflits | Oui, avec tableau | Oui | Tableau de ScenoFactory, moteur de StageFactory |
| Recevoir le DMX d'une console (Art-Net, sACN) | Oui | Oui | À comparer |
| Pupitre, mémoires, effets, enchaînement, réaction à la musique | Non | Oui | Garder StageFactory |
| Mode spectacle | Lumière « service » ou spectacle | Oui | Garder StageFactory |
| Export MVR vers grandMA3 | Oui | Oui | À comparer |
| Écran, vidéoprojecteur (distance, taille d'image, éclairement), mapping | Oui | Vidéoprojecteur oui | Reprendre ScenoFactory |
| Mur LED configurable (dalles, pas, poids) | À faire | Oui | Garder StageFactory |
| Enceintes : ouverture dessinée | Oui | Oui | — |
| Recouvrement sonore (carte de niveau) | Non | Oui | Garder StageFactory |
| Line array | Non | Non | À construire |
| Décor, mobilier, instruments (54 modèles), 19 personnages | Oui | Une quinzaine d'objets | Reprendre ScenoFactory |
| Atelier de modèles 3D personnels | Oui | Non | Reprendre ScenoFactory |
| Cotes sur le plan | Oui | Mesure en 3D seulement | Reprendre ScenoFactory |
| Vue en coupe | Oui | Oui | À comparer |
| Publier en PDF : plan à l'échelle, cartouche, légende, liste | Oui | Export PNG | Reprendre ScenoFactory |
| Calques | Quatre calques | Masquer objet par objet | Reprendre ScenoFactory |
| Rendu de la vue 3D (sol réfléchissant, éclat, foule) | Soigné | Plus simple | Reprendre ScenoFactory, à vérifier |
| Rendu IA de la vue 3D | Oui | Non | Reprendre ScenoFactory |
| Assistant IA et connecteur Claude | Oui | Oui | À comparer |
| Annulation de toute modification | Oui, par construction | Oui | — |
| Essais automatiques | 28 suites | Une vingtaine d'essais | — |

## Bilan

- ScenoFactory est en avance sur le dessin, le rigging, la sécurité, le décor, la mise en page.
- StageFactory est en avance sur le spectacle : pupitre, mémoires, Titan, parc, recouvrement sonore, mur LED.
- Sur une dizaine de fonctions, les deux font la même chose : il faudra les comparer une par une.

## La question de fond

Au départ, tu as demandé de fusionner **dans** Onex Previz, devenu StageFactory. Au vu de ce tableau, la plus grande partie de ce qui reste à porter vient de ScenoFactory. L'autre sens existe : partir de ScenoFactory et y porter le moteur de spectacle de StageFactory.

| | Base StageFactory (choix actuel) | Base ScenoFactory |
|---|---|---|
| À porter | Dessin, rigging, sécurité, décor, PDF, inspecteur, tiroir | Pupitre, mémoires, effets, Titan, parc, recouvrement, mur LED, pose en série, praticables |
| Ce qui est déjà fait | Tout le travail de ces derniers jours | Disposition et habillage que tu veux retrouver |
| Façon de construire | Modules simples, pas de compilation, artefact direct | Plus stricte, tout passe par des commandes annulables, compilation nécessaire |
| Risque | Réécrire beaucoup de choses qui marchent déjà ailleurs | Rebrancher le moteur lumière sur un autre modèle de données |

Je n'ai pas assez lu les deux codes pour trancher avec certitude. Avis provisoire : rester sur StageFactory, parce que le moteur de spectacle (pupitre, DMX, effets) est la partie la plus délicate à rebrancher, alors que le dessin et le rigging de ScenoFactory sont des modules assez séparés pour être portés un par un.

## Ordre de portage proposé (base StageFactory)

1. Ponts : bibliothèque par fabricant, tracé à la souris, raccords, structures toutes faites.
2. Points d'accroche, moteurs, calcul de charges complet, classes de moteurs.
3. Inspecteur à droite et tiroir du bas (patch, bibliothèque, liste, rigging et charges, sécurité).
4. Décor, mobilier, instruments, personnages.
5. Cotes, calques, publication PDF.
6. Onglet Sécurité et rapport.
7. Line array.
8. Comparaisons une par une des fonctions en double.

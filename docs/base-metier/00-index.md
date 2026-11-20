# Base métier StageFactory — index

Mise à jour : 18.11.2026.

But : donner aux agents de StageFactory les règles de métier dont ils ont besoin pour implanter une salle, un plan de feu, une diffusion, une accroche, de la vidéo. La base grossit par petites fiches. Chaque agent lit les fichiers de son métier, plus la fiche du style et la fiche de la configuration demandés.

## Trois axes

### A. Par métier (les règles générales)
| Fichier | Métier | Agent | État |
|---|---|---|---|
| 01-lumiere-concert.md | Lumière | tech lumière | v0.1, validé pour l'instant, à reprendre |
| 02-son-concert.md | Son : diffusion et plateau | tech son | v0.1, à corriger |
| 03-rigging.md | Ponts, moteurs, charges | spécialiste rig | v0.1, à corriger ; règle suisse à compléter |
| 04-video.md | Projection, écrans LED | vidéaste | v0.1 |
| 05-scenographie.md | Implantation, vues du public, circulation | scénographe | v0.1, surtout de l'usage courant |
| 06-regie-generale.md | Coordination, ordre de travail, arbitrages | régisseur général | v0.1 |
| 07-choix-par-defaut.md | La méthode retenue quand les pros divergent | tous | v0.1 |

### B. Par style (ce qui change d'une musique ou d'un spectacle à l'autre)
Une fiche courte par style, dans `styles/`. Chaque fiche répond aux mêmes questions pour tous les métiers.

Faits (v0.1) : rock, metal, pop-variete, chanson-acoustique, jazz, classique, electro-dj, theatre, danse, conference.

À faire : hip-hop, musiques du monde, comédie musicale, jeune public.

### C. Par configuration (ce qui change d'un lieu à l'autre)
Une fiche courte par type de lieu, dans `configurations/`.

Faits (v0.1) : bar-sans-accroche, salle-ponts-motorises, theatre-cage-de-scene, plein-air, festival-multi-groupes.

À faire : scène mobile, bi-frontal et central, salle debout / assise.

## Modèle d'une fiche de style

```
# Style : <nom>
Formation type : <qui est sur scène, combien>
Plateau : <implantation habituelle, praticables, backline>
Lumière : intention · familles prioritaires · couleurs · rythme des changements · à éviter
Son : niveau visé · ce qu'on reprend ou non · grave · retours · à éviter
Vidéo : usage habituel
Séquences types : <liste des tableaux>
Exceptions connues
Sources
```

## Modèle d'une fiche de configuration

```
# Configuration : <nom>
Ce que le lieu offre : accroches, hauteur, électricité, recul
Lumière : où va la face, où va le contre, ce qui est impossible
Son : où va la façade, subs, rappels, délais
Rigging : ce qui porte, ce qui ne porte pas
Pièges
Sources
```

## Règles de la base

1. Une règle = une ligne, avec son niveau : [consensus], [débat], [usage] (pratique courante non sourcée), [défaut] (choix de l'agent), [à valider], et [Benjamin] quand il a tranché.
1b. Quand les pros divergent, l'agent suit `07-choix-par-defaut.md`. Plusieurs méthodes cohérentes sont acceptables ; l'incohérence ne l'est pas.
2. [Benjamin] l'emporte sur tout le reste.
3. Un chiffre sans source est marqué [à valider] tant qu'il n'a pas été confirmé.
4. Les désaccords entre pros restent écrits, avec les deux positions.
5. Les sources sont listées en bas de chaque fichier. Rien n'est recopié mot pour mot.
6. Charges, sécurité, électricité : seules les normes, les notices fabricants et le régisseur font foi, jamais un forum.

## Comment l'alimenter

- Une remarque de terrain de Benjamin (« non, on ne fait jamais ça ») devient une ligne [Benjamin] dans le fichier du métier.
- Une fiche technique ou un plan de feu réel devient un exemple dans la fiche du style.
- Un essai dans StageFactory qui tourne mal devient une ligne « à éviter ».

# Base métier StageFactory — 03 · Ponts, moteurs, charges

Version 0.1 du 18.11.2026. Tiré de notices et documents de fabricants (Prolyte, GIS, Movecat), du standard allemand IGVW SQ P2 et, pour deux repères seulement, de forums. Ce fichier sert à **alerter et à poser les bonnes questions**, jamais à valider une accroche : seul le régisseur ou le responsable du lieu valide.

Niveaux : **[fabricant]** notice ou table de charge · **[standard]** IGVW SQ P2 · **[forum]** repère de terrain, à vérifier dans la notice · **[à valider]** proposé pour StageFactory.

---

## 1. Ce que l'agent ne fait jamais

1. Il n'invente ni ne « estime » une charge admissible. Sans valeur lue (fiche du lieu, table du fabricant), la perche est « non vérifiable ». [à valider]
2. Il ne déclare jamais une accroche sûre. Il dit « dans la limite lue » ou « dépasse la limite lue ». [à valider]
3. Il ne mélange pas charge répartie et charge ponctuelle (voir 2). [fabricant]

## 2. Lire une table de charge de pont

- Une table donne, pour chaque portée, plusieurs limites différentes : charge **répartie** (kg par mètre), charge **ponctuelle au centre**, et charges ponctuelles aux tiers, aux quarts, aux cinquièmes. [fabricant]
- La charge admissible chute vite quand la portée augmente. Exemple lu sur la table Prolyte H40R : environ 331 kg/m en réparti à 7 m de portée, 198 kg/m à 9 m, 91 kg/m à 13 m. [fabricant]
- Une charge concentrée au centre est bien plus contraignante que la même charge répartie : même table, 13 m de portée, environ 592 kg au centre contre 91 kg/m répartis (soit près de 1 180 kg au total). [fabricant]
- Ces valeurs valent pour des charges **statiques** et une portée sur **deux appuis**, un à chaque bout. [fabricant]
- Les charges se suspendent à la membrure basse. [fabricant]
- Chez Prolyte le poids propre du pont est déjà déduit dans la table ; ce n'est pas le cas chez tous les fabricants : lire la notice. [fabricant]
- La flèche (le pont qui se creuse) est donnée dans la table. Elle compte pour les rideaux : un pont qui fléchit fait traîner le tissu au sol. [fabricant]

## 3. Répartition sur les moteurs

- Pont sur deux points, charge répartie entre eux : moitié sur chaque point. [fabricant]
- Charge ponctuelle entre deux points : chaque point reprend la charge au prorata de la distance à l'autre point. Part du point 1 = charge × distance au point 2 ÷ portée. [forum, formule de statique]
- Trois points ou plus : ce n'est plus une simple addition. Sur trois points en charge répartie, le point central reprend plus de la moitié. Les réactions d'un pont continu se font calculer par une personne compétente. [fabricant]
- Des moteurs pas tout à fait à la même hauteur changent tout : sur quatre moteurs, un quart de maillon d'écart sur deux d'entre eux peut laisser tout le pont porté par les deux autres. [fabricant]
- Charge au crochet du moteur = matériel + pont + câblage + moteur lui-même s'il monte avec le pont, puis facteur de charge selon le lieu. [fabricant]
- Porte-à-faux (ce qui dépasse au-delà du dernier point) : possible, avec prudence. Repère de terrain : pas plus d'un sixième de la longueur du pont. [forum]

## 4. Moteurs : D8, D8+, C1

| Classe | Au-dessus de personnes | Bouger pendant le spectacle |
|---|---|---|
| D8 | seulement à l'arrêt **et** avec une sécurité secondaire indépendante | non |
| D8+ | à l'arrêt, sans sécurité secondaire | non, personne dessous pendant le mouvement |
| C1 | oui | oui |

[standard, fabricant]

- La sécurité secondaire d'un D8 (élingue câble ou chaîne) se dimensionne pour le double de la charge nominale. [fabricant]
- Un appareil de levage ordinaire n'est pas conçu pour tenir une charge au-dessus de personnes. [fabricant]
- Ces classes viennent d'un standard allemand. La règle qui s'applique en Suisse (SUVA, normes du lieu) n'a pas encore été vérifiée ici : **à compléter**.

## 5. Chaque appareil accroché

- Une élingue de sécurité par projecteur, enceinte ou accessoire suspendu au-dessus de personnes, adaptée à son poids. [fabricant]
- Les accessoires (volets, porte-filtres) sont assurés eux aussi. [à valider]

## 6. Ce que l'agent doit vérifier dans StageFactory [à valider]

1. Chaque perche ou pont a-t-il une charge admissible **lue** ? Sinon : « non vérifiable », question au régisseur.
2. Total accroché (matériel + câblage estimé à 10 %) contre la limite répartie lue.
3. Appareil lourd isolé (automatique de plus de 20 kg, grappe d'enceintes) : le comparer à la limite **ponctuelle**, pas à la limite répartie.
4. Pont motorisé : charge par moteur, y compris le poids du pont. Alerte si un moteur dépasse 80 % de sa capacité lue.
5. Rien de lourd au-delà du dernier moteur ; alerte si le porte-à-faux dépasse un sixième de la longueur.
6. Équilibre gauche-droite : alerte si un moteur porte plus de 1,5 fois l'autre.
7. Classe des moteurs inconnue : le signaler, et rappeler la question de la sécurité secondaire.
8. Appareil sans poids connu : total incomplet, le dire.

## Choix par défaut

Les points en [débat] et les chiffres [à valider] de ce chapitre sont tranchés dans `07-choix-par-defaut.md`. Benjamin corrige à l'usage ; ses corrections s'écrivent ici en lignes [Benjamin].

---

## Sources

- Prolyte, table de charge H40R : https://www.cpl.tech/wp-content/uploads/2018/11/Prolyte-H40R-Loading-Table.pdf
- Prolyte, manuel X & H 30-40 : https://vsl-uk.com/wp-content/uploads/2025/08/Prolyte_Truss_30-40_User_Manual.pdf
- Prolyte, Black Book 2020 (réactions d'appui) : https://issuu.com/prolyte_group/docs/blackbook2020_en/35
- Prolyte, Black Book 2024 en français : https://www.prolyte.com/getmedia/0a750bc3-acd0-444b-be5f-e1ac516b3da7/Black-Book-2024-French-Edition-(website-V1)_2.pdf.aspx
- IGVW, SQ P2 (palans à chaîne) : https://www.igvw.org/wp-content/uploads/IGVW_SQP2_web_EN.pdf
- GIS, D8 / D8+ : https://gis-gmbh.de/en/entertainment/services/know-how
- Movecat, notice D8 / D8 Plus / C1 : https://moveket.de/wp-content/uploads/2025/04/MK-UM_EN_Chainhoists_2.3.pdf
- Stagecraft, calcul des charges aux points : https://stagecraftproductionservice.com/lighting-truss-loading/index.htm
- Communauté française de Belgique, circulaire sur le levage au-dessus des personnes : https://gallilex.cfwb.be/sites/default/files/imports/30774_000.pdf
- Blue Room, « Hanging lights outside span » (repère du sixième) : https://www.blue-room.org.uk/topic/47841-hanging-lights-outside-span/

Limites : les documents n'ont été lus que par extraits ; les valeurs de la table H40R sont à relire dans le PDF complet avant tout usage. Rien sur l'élingage en patte d'oie, les charges dynamiques, le plein air et le vent : à faire.

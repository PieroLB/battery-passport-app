# 01 – Spécification produit

## Rôles
| Rôle (enum) | Qui | Interface | Peut |
|---|---|---|---|
| `GARAGISTE` | Garagiste | Tablette | Scanner, lire un passeport, saisir un diagnostic, **demander** le passage en Waste |
| `PROPRIETAIRE_BP` | Constructeur, responsable du BP | Desktop | Valider/refuser les demandes de statut, valider l'archivage, consulter archives et filiation, valider la purge |
| `CENTRE_TRI` | Centre de tri | Mobile | Scanner, diagnostiquer les modules, décider recyclage ou réemploi, déclencher `Create New BP from Old` |
| `RECYCLEUR` | Recycleur | Mobile | Scanner, confirmer la fin du recyclage avec certificat (`Prepare for Archive`) |
| `CONFORMITE` | Responsable conformité (rôle ajouté, optionnel) | Desktop | Consulter archives et journaux d'audit, co-valider la purge |

## Parcours global (rappel)
`Original` → (demande garagiste, validation propriétaire) → `Waste` → (décision centre de tri)
→ soit **seconde vie** (nouveau BP : `Reused` / `Remanufactured` / `Repurposed`, ancien BP `Archived/SUPERSEDED`),
→ soit **recyclage** (confirmation recycleur, validation propriétaire) → `Archived/RECYCLED`.

## User stories et critères d'acceptation

### US-01 Scanner un passeport (tous rôles)
Un utilisateur connecté scanne le QR code (ou saisit l'identifiant) et voit le passeport adapté à son rôle.
- Le QR encode l'URL `https://<domaine>/p/<batteryPassportId>`.
- Si non connecté, redirection vers la connexion puis retour sur le passeport.
- La vue affiche : identification, statut (badge couleur), modules (5) avec résistance interne et
  seuil, historique des événements, actions autorisées (`allowedActions`).

### US-02 Garagiste : demander le passage en Waste
- Le garagiste saisit un diagnostic (motif, modules en défaut, remarque) sur un passeport `Original`.
- Une demande `PENDING` est créée ; le propriétaire reçoit une notification.
- Le garagiste ne peut **pas** changer le statut lui-même (l'API répond `FORBIDDEN_ROLE`).
- Une seconde demande identique pendant qu'une demande est `PENDING` est refusée (idempotence).

### US-03 Propriétaire : valider Original → Waste
- Liste des demandes en attente avec diagnostic joint.
- Approuver crée un `StatusEvent` (Original → Waste), passe le statut à `Waste`, incrémente `version`,
  notifie le garagiste et le centre de tri désigné.
- Refuser enregistre le motif et notifie le garagiste.

### US-04 Centre de tri : constater le statut
- Scan → le passeport indique clairement `Waste`, la date et l'auteur du changement.

### US-05 Centre de tri : décider recyclage ou réemploi de modules
- Pour un passeport `Waste`, le centre de tri enregistre une décision avec justification.
- Option « réemploi » : sélection des modules (voir US-07). Option « recyclage » : le passeport reste
  `Waste` jusqu'à la confirmation du recycleur.

### US-06 Prepare for Archive (recycleur puis propriétaire)
Voir `docs/03-archive-rules.md` pour le détail. Critères :
- Le recycleur confirme « recyclage terminé » et joint la référence d'un certificat → création d'une
  `ArchiveRequest` en `PENDING_VALIDATION`.
- Préconditions vérifiées par l'API : statut `Waste`, certificat présent, chaque module soit recyclé
  soit déjà transféré vers un nouveau BP, aucune demande concurrente.
- Le propriétaire valide → l'API, **en une transaction** : crée `StatusEvent` Waste → Archived
  (raison `RECYCLED`), fige l'instantané des données dynamiques, pseudonymise, génère le paquet
  d'archive (JSON-LD) + empreinte SHA-256, crée `ArchiveRecord` (échéance calculée), passe le BP en
  lecture seule (`readOnly = true`), désactive le QR (`qrActive = false`).
- Le QR d'un BP archivé affiche « Batterie recyclée – passeport archivé » (pas les données détaillées).
- Rejouer la validation ne crée pas de doublon.

### US-07 Create New BP from Old (centre de tri)
- Sélection des modules à réemployer parmi ceux d'un BP `Waste`, choix du statut cible
  (`Reused` / `Remanufactured` / `Repurposed`), de l'opérateur qui remet la batterie sur le marché.
- L'API refuse les modules hors seuils (résistance interne > max, SOH < minimum configuré, accident déclaré)
  avec un motif par module.
- Création d'un **nouveau BP** (nouvel identifiant, nouveau QR), relation `DERIVED_FROM` vers l'ancien,
  relations `REUSES_MODULE`, duplication selon `docs/03-archive-rules.md` (section duplication).
- Ancien BP : `Archived` avec raison `SUPERSEDED` (même transaction).
- Si au moins un module est réemployé, l'ancien BP n'est **pas** archivé en `RECYCLED`.

### US-08 Consulter une archive et sa filiation (propriétaire, conformité)
- Recherche par identifiant. Affichage : statut final, événements, liens ancêtres/descendants
  (`DERIVED_FROM`), échéance de conservation, **vérification de l'empreinte** (alerte si invalide).
- Aucune donnée personnelle visible (identifiants pseudonymes uniquement).
- Chaque consultation est journalisée (`AccessLog`).

### US-09 Valider la purge à l'échéance (propriétaire + conformité)
- Liste des archives échues dont aucun descendant n'est encore conservé et qui ne sont pas en `LEGAL_HOLD`.
- Il faut **deux validations** (propriétaire ET conformité) pour exécuter la purge.
- La purge supprime le paquet et sa copie de sauvegarde, conserve une trace minimale
  (id, date, raison, empreinte) et passe l'`ArchiveRecord` en `PURGED`.
- Option « gel » (`LEGAL_HOLD`) avec raison obligatoire : bloque la purge.

### US-10 Notifications in-app
- Cloche avec compteur de non lus ; liste ; marquer comme lu. Rafraîchissement par polling (10 s)
  ou SSE.

## Script de démo (2–3 minutes)
1. **Garagiste (tablette)** : scanne `BP-DEMO-001` (Original). Le module M3 a une résistance au-dessus du max.
   Il demande le passage en Waste.
2. **Propriétaire (desktop)** : reçoit la notification, valide → `Waste`.
3. **Centre de tri (mobile)** : scanne `BP-DEMO-001`, constate `Waste`.
4. **Centre de tri** : ouvre `BP-DEMO-002` (Waste, modules 1, 2, 4 sains), sélectionne ces modules,
   choisit `Remanufactured` → nouveau BP créé, ancien en `Archived/SUPERSEDED`. Montrer la filiation.
5. **Recycleur (mobile)** : ouvre `BP-DEMO-003` (Waste, tous modules en fin de vie), confirme le
   recyclage avec un certificat.
6. **Propriétaire** : valide l'archivage → `Archived/RECYCLED`, empreinte et échéance visibles.
7. **Conformité** : consulte l'archive, vérifie l'empreinte, valide une purge sur `BP-DEMO-007` (échue).

## Données de démonstration (seed)
| Identifiant | État initial | Sert à |
|---|---|---|
| `BP-DEMO-001` | `Original`, module M3 hors seuil | Cas d'usage global (US-02 à US-04) |
| `BP-DEMO-002` | `Waste`, modules 1, 2, 4 sains, 3 et 5 hors seuil | US-07 |
| `BP-DEMO-003` | `Waste`, tous modules hors seuil | US-06 |
| `BP-DEMO-004` | `Archived/RECYCLED`, échéance dans 10 ans | US-08 |
| `BP-DEMO-005` → `BP-DEMO-006` | 005 `Archived/SUPERSEDED`, 006 `Reused` dérivé de 005 | Filiation (US-08) |
| `BP-DEMO-007` | `Archived/RECYCLED`, échéance dépassée (date de démo) | US-09 |

Le seed réutilise les nœuds `Model`, `Type`, `Company`, `EconomicOperator` **déjà présents dans le dump**
et crée les `BatteryInstance`, `Module`, `User`, etc. Il doit être idempotent (relançable sans doublons).

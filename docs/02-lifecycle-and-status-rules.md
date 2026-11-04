# 02 – Cycle de vie et règles de statut

## Statuts
| Statut | Signification | Détenteur des données |
|---|---|---|
| `Original` | Première vie, suivi par le constructeur | Constructeur (propriétaire du BP) |
| `Waste` | Hors d'usage, en attente de décision | Producteur, organisme de responsabilité élargie ou opérateur de gestion des déchets désigné |
| `Reused` | Remise en service pour le même usage | Opérateur qui la remet en service |
| `Remanufactured` | Remise à niveau puis remise sur le marché | Opérateur qui la remet sur le marché |
| `Repurposed` | Réaffectée à un autre usage | Opérateur qui la remet sur le marché |
| `Archived` | Passeport clos, lecture seule. **Statut ajouté par l'équipe** | Détenteur désigné pour la durée de conservation |

`Archived` porte une raison : `RECYCLED` (batterie recyclée) ou `SUPERSEDED` (remplacé par un nouveau
passeport après réemploi de modules).

## Matrice des transitions (source de vérité : `packages/shared`)
| De \ Vers | Original | Waste | Reused / Remanufactured / Repurposed | Archived |
|---|---|---|---|---|
| Original | non | oui | non | non |
| Waste | non | idempotent | oui (**nouveau BP**) | oui (recyclage) |
| Seconde vie | non | oui | non | non |
| Archived | non | non | non | non |

Interdictions de fond :
- Une batterie ne redevient jamais `Original`.
- Pas de passage direct entre deux secondes vies : on repasse par `Waste` (nouveau diagnostic).

## Transitions, déclencheurs et acteurs
| Transition | Déclencheur | Acteur | Effet |
|---|---|---|---|
| Original → Waste | Défaut critique (ex. résistance interne d'un module > max constructeur, accident) | Garagiste demande, propriétaire valide | `StatusEvent` avec diagnostic joint |
| Waste → Reused / Remanufactured / Repurposed | Décision du centre de tri | Centre de tri | **Nouveau BP** lié à l'ancien (`DERIVED_FROM`), ancien `Archived/SUPERSEDED` |
| Waste → Archived (RECYCLED) | Recyclage terminé | Recycleur confirme, propriétaire valide | Passeport en lecture seule, échéance de conservation |
| Seconde vie → Waste | Fin de la seconde vie | Propriétaire actuel | Même logique que le premier passage en Waste |

## Règles de changement de statut (à implémenter côté API)
1. **Transitions valides uniquement.** Hors matrice → erreur `INVALID_TRANSITION` avec motif.
2. **Rôle autorisé par transition.** Le garagiste ne change jamais un statut, il fait une demande.
   Le propriétaire valide `Original → Waste`, le centre de tri décide de la seconde vie, le recycleur
   confirme la fin du recyclage, le propriétaire valide l'archivage.
3. **Justification obligatoire.** `Original → Waste` exige un diagnostic joint. `Waste → seconde vie`
   exige les valeurs relevées par module et une justification. Un manque → `PRECONDITION_FAILED`.
4. **Preuve pour Archived.** `Waste → Archived` exige une référence de certificat de recyclage.
5. **Un statut, un événement.** Chaque changement crée un `StatusEvent` immuable (qui, quand, de quoi
   vers quoi, pourquoi, preuve). Le statut courant se lit sur `BatteryInstance.status` et se justifie par
   le dernier événement.
6. **Seconde vie = nouveau passeport.** Création du nouveau BP + `DERIVED_FROM` + ancien en
   `Archived/SUPERSEDED`, **dans la même transaction**.
7. **Responsabilité en cas de Waste.** L'événement enregistre le nouveau responsable de l'exactitude
   des informations (champ `responsibleOperatorId`).
8. **Instantané des données dynamiques.** À chaque changement de statut, on fige les valeurs
   dynamiques (SoC, résistance interne par module, cycles, accidents) dans `StatusEvent.snapshot`.
   Après `Waste`, l'ingestion de télémétrie s'arrête (hors périmètre du PoC, mais ne pas écrire de
   nouvelles mesures sur un BP `Waste` ou `Archived`).
9. **`Archived` est terminal.** Lecture seule (`readOnly = true`), aucune transition possible.
10. **Idempotence et concurrence.** Rejouer la même requête ne crée pas de second événement
    (en-tête `Idempotency-Key`). Deux requêtes simultanées sont départagées par `version`
    (`expectedVersion` dans le corps → `VERSION_CONFLICT` si différent).
11. **Notification.** Chaque transition notifie les acteurs concernés.
12. **Priorité d'archivage.** Si au moins un module est réemployé, l'ancien BP est archivé
    `SUPERSEDED` (jamais `RECYCLED`). Le recyclage des modules restants est consigné dans
    `ArchiveRecord.notes`, sans second archivage.

## Paramétrage (jamais codé en dur)
| Paramètre | Valeur par défaut | Rôle |
|---|---|---|
| `REUSE_MIN_SOH_PERCENT` | 70 | SOH minimal d'un module réemployable (proposition d'équipe) |
| `REUSE_MAX_RESISTANCE_FACTOR` | 1.0 | Résistance interne max = facteur × max constructeur du module |
| `ARCHIVE_REQUIRES_OWNER_VALIDATION` | true | Le propriétaire valide l'archivage |

Ces seuils sont des **choix de modélisation de l'équipe**, pas des valeurs réglementaires.

## Code partagé attendu (`packages/shared`)
```ts
export const STATUSES = ['Original','Waste','Reused','Remanufactured','Repurposed','Archived'] as const;
export type Status = typeof STATUSES[number];
export const SECOND_LIFE = ['Reused','Remanufactured','Repurposed'] as const;
export const STATUS_TRANSITIONS: Record<Status, readonly Status[]> = {
  Original: ['Waste'],
  Waste: ['Reused','Remanufactured','Repurposed','Archived'],
  Reused: ['Waste'], Remanufactured: ['Waste'], Repurposed: ['Waste'],
  Archived: [],
};
export const canTransition = (from: Status, to: Status) => STATUS_TRANSITIONS[from].includes(to);
```

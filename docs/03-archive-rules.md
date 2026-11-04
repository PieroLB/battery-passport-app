# 03 – Règles d'archivage

> Les durées et seuils ci-dessous sont des **propositions de l'équipe** à faire valider par un juriste
> ou un délégué à la protection des données. Ne pas les présenter comme des exigences légales.

## Principes
- **Archiver n'est pas garder un passeport vivant.** D'après les analyses consultées du règlement
  (UE) 2023/1542 (art. 77), le passeport cesse d'exister une fois la batterie recyclée. Notre archive est
  un **dossier interne de conservation** (analyse, traçabilité, réemploi de modules), pas un passeport exposé.
- **Durée de base** : aucune durée propre aux données archivées d'un passeport n'a été trouvée.
  On s'aligne sur une obligation voisine : le fabricant conserve la documentation technique et la déclaration
  de conformité 10 ans après la mise sur le marché de la dernière batterie du modèle.
- **Règle proposée** : `retainUntil = max(archivedAt + 10 ans, lastPlacedOnMarket(model) + 10 ans)`.
  Si `lastPlacedOnMarket` est absent du modèle, utiliser `archivedAt + 10 ans`.
- **Purge validée, jamais silencieuse** : à l'échéance, deux validations (propriétaire + conformité).
  On conserve une trace minimale (identifiant, date, raison, empreinte) sans les données.
- **Ordre de purge** : un passeport ancêtre n'est jamais purgé avant ses descendants (`DERIVED_FROM`).

## Table des règles par type de donnée
| Donnée archivée | Déclencheur | Durée proposée | Format | Lieu / détenteur |
|---|---|---|---|---|
| Passeport figé (attributs statiques + instantané dynamique final) | Waste → Archived | Durée de base | JSON-LD + export graphe (CSV) | Archive en lecture seule, propriétaire du BP |
| Journal des événements de statut | Waste → Archived | Durée de base | JSON-LD | Archive, propriétaire du BP |
| Preuves (certificat de recyclage, manifeste, accusé) | Dépôt de la preuve | Durée de base | PDF/A + empreinte SHA-256 | Archive documentaire |
| Lien de filiation et modules réemployés | Création d'un nouveau BP | Durée de base du dernier descendant | Relations du graphe + extrait JSON | Graphe d'archive |
| Télémétrie brute | Passage en Waste | 12 mois après Waste puis suppression (proposition) | CSV / séries temporelles | Stockage opérationnel (hors PoC) |
| Identités utilisateurs et contacts personnels | Archivage | Dissociés à l'archivage ; table de correspondance supprimée après 12 mois (proposition) | Identifiant pseudonyme dans l'archive | Table séparée à accès restreint |
| Journaux d'accès et d'audit | En continu | 5 ans (proposition) | Journal horodaté ISO 8601 | Journalisation sécurisée |
| Sauvegarde indépendante de l'archive | Création de l'archive | Même durée que l'archive | Archive chiffrée | Prestataire tiers (**simulé** en PoC) |

## Implémentation PoC
- Paquet d'archive : fichier `archives/<archiveId>.jsonld` sur un volume Docker (`ARCHIVE_DIR`),
  copie « sauvegarde indépendante » simulée dans `ARCHIVE_BACKUP_DIR` (second dossier/volume).
- Empreinte : SHA-256 du fichier, stockée dans `ArchiveRecord.sha256`. La consultation recalcule et compare.
- Les preuves (PDF) sont **simulées** : on stocke une référence de certificat et, si fourni, un petit fichier
  téléversé. Ne pas implémenter de vraie génération PDF/A (hors périmètre).
- Format JSON-LD : contexte minimal propre au projet (`@context` local), pas de vocabulaire externe obligatoire.

## Cas « Prepare for Archive » (après recyclage complet)
Acteurs : recycleur (déclenche), propriétaire du BP (valide), système (exécute).

Préconditions : BP `Waste` ; batterie démantelée ; certificat reçu ; aucun transfert en cours ;
chaque module est soit recyclé soit déjà transféré vers un nouveau BP ; `version` à jour.

Déroulement :
1. Le recycleur scanne le QR, choisit « Recyclage terminé », joint la référence du certificat → `ArchiveRequest` (`PENDING_VALIDATION`).
2. Le propriétaire valide.
3. L'API, **dans une transaction** : vérifie les préconditions → crée `StatusEvent` Waste → Archived (`RECYCLED`)
   avec l'instantané final → dissocie la batterie (`qrActive = false`) → pseudonymise → génère le paquet
   JSON-LD + SHA-256 → copie de sauvegarde → crée `ArchiveRecord` (`retainUntil`) → `readOnly = true`, `version + 1`.
4. Notifications : propriétaire et centre de tri.

Alternatives : certificat manquant → `PRECONDITION_FAILED` ; module réemployé non transféré → l'API
indique d'utiliser `Create New BP from Old` ; échec de génération du paquet → **rollback complet** et
nouvelle tentative possible sans doublon (idempotence).

## Cas « Create New BP from Old » (réemploi de modules)
Acteurs : centre de tri (décide), opérateur qui remet sur le marché (détenteur du nouveau BP), propriétaire
d'origine (informé), système.

Préconditions : ancien BP `Waste` ; modules identifiés individuellement ; chaque module retenu respecte les
seuils (résistance ≤ max, SOH ≥ `REUSE_MIN_SOH_PERCENT`, aucun accident déclaré).

Règles de duplication (ancien BP → nouveau BP) :
| Donnée | Traitement |
|---|---|
| Identifiants du passeport et de la batterie | **Nouveaux** |
| Composition et chimie | Copiées ou liées (relation vers le même nœud `Composition`) |
| Tensions min / nominale / max | Copiées |
| Résistance interne initiale par module | Copiée |
| Instantané dynamique des modules (SOH, résistance, cycles) | Copié, daté, marqué `inherited = true` |
| Événements de l'ancien passeport | **Liés, non copiés** (via `DERIVED_FROM`) |
| Opérateur et contacts | **Nouveaux** (pas de reprise de données personnelles) |
| Accidents / événements négatifs | Copiés pour les modules concernés |

Déroulement : sélection des modules → contrôle des seuils par module (refus motivé) → choix du statut cible et
de l'opérateur → création du nouveau BP (nouveau QR) → duplication → `DERIVED_FROM` + `REUSES_MODULE` →
ancien BP `Archived/SUPERSEDED` (génération du paquet d'archive comme ci-dessus) → transfert de propriété →
notifications. **Tout dans une seule transaction.**

## Pseudonymisation (à l'archivage)
- `StatusEvent.actorId` = UUID opaque de l'utilisateur (jamais nom ni e-mail dans l'archive).
- Contacts du nœud `EconomicOperator` (nom, e-mail, téléphone) remplacés par une référence d'organisation (`orgRef`).
- Aucune identité de client dans le passeport. Si un identifiant client existait, il serait dissocié à l'archivage.
- La table de correspondance = nœuds `User`. Pseudonymiser n'est pas anonymiser : tant que la table existe, les
  données restent personnelles. En PoC, documenter la suppression de la table après 12 mois, ne pas l'automatiser.

## Journal d'accès aux archives
Chaque lecture d'un BP archivé crée un `AccessLog` : `{id, archiveId, actorId, at (ISO 8601), action}`.

# 04 – Modèle de données Neo4j

## Règle d'or
Le dump fourni fait foi pour le **schéma existant**. Avant tout code, l'agent doit l'inspecter :
```cypher
CALL db.schema.visualization();
CALL db.labels();
CALL db.relationshipTypes();
CALL db.propertyKeys();
MATCH (n) RETURN labels(n) AS labels, count(*) AS n ORDER BY n DESC;
```
Puis consigner les écarts avec ce document dans `docs/decisions/0001-schema-dump.md`.

## Modèle existant (d'après la figure 1 du sujet – à vérifier contre le dump)
Nœuds et propriétés principales (les noms exacts peuvent différer) :
| Label | Propriétés (indicatif) |
|---|---|
| `Company` | `name` |
| `Type` | `name` |
| `Model` | `modelId`, `name` |
| `EconomicOperator` | `name`, `address`, `country`, `email`, `phone`, `website` |
| `Certification` | `separateCollectionSymbol`, `EUDeclarationOfConformity`, `EUDeclarationOfConformityId` |
| `Circularity` | `extinguishAgent`, `partNumbers` |
| `StaticPerformance` | `minimalVoltage`, `nominalVoltage`, `maximalVoltage` |
| `StaticDurability` | `expectedBatteryLifetimeCycles`, `cRateRelevantCycleLifeTest` |
| `CarbonFootprint` | `carbonFootprintDeclared`, `performanceClass`, `lifeStudy` |
| `Composition` | `composition_id`, `batteryChemistry` |
| `Anode`, `Cathode`, `Electrolyte` | identifiant, liste de matériaux, pourcentages, `isRenewable` |
| `BatteryInstance` | `batteryId`, `batteryPassportId`, `status` |
| `DynamicDurability` | `warranty`, `accidents` |
| `DynamicPerformance` | `soce`, `soc` (indicatif) |

Relations (indicatif) :
```
(Type)-[:HAS_TYPE]-(Company)            (Company)-[:HAS_ECONOMIC_OPERATOR]->(EconomicOperator)
(Type)-[:HAS_MODEL]->(Model)
(Model)-[:HAS_CERTIFICATION|HAS_CIRCULARITY|HAS_STATIC_PERFORMANCE|HAS_STATIC_DURABILITY|
        HAS_COMPOSITION|HAS_CARBON_FOOTPRINT]->(...)
(Composition)-[:HAS_ANODE|HAS_CATHODE|HAS_ELECTROLYTE]->(...)
(Model)-[:HAS_BATTERY_INSTANCE]->(BatteryInstance)
(EconomicOperator)-[:BUILD]->(BatteryInstance)
(EconomicOperator)-[:HAS_CARBON_FOOTPRINT]->(CarbonFootprint)
(BatteryInstance)-[:HAS_DYNAMIC_DURABILITY]->(DynamicDurability)
(BatteryInstance)-[:HAS_DYNAMIC_PERFORMANCE]->(DynamicPerformance)
```
Sens et noms exacts : à confirmer dans le dump.

## Extensions à ajouter (migrations)
Stocker les migrations dans `apps/api/src/db/migrations/` (fichiers Cypher numérotés, rejouables,
tracés par un nœud `(:Migration {id, appliedAt})`).

### Contraintes et index
```cypher
CREATE CONSTRAINT bp_id IF NOT EXISTS FOR (b:BatteryInstance) REQUIRE b.batteryPassportId IS UNIQUE;
CREATE CONSTRAINT module_id IF NOT EXISTS FOR (m:Module) REQUIRE m.moduleId IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:StatusEvent) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT request_id IF NOT EXISTS FOR (r:StatusRequest) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT archreq_id IF NOT EXISTS FOR (r:ArchiveRequest) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT archive_id IF NOT EXISTS FOR (a:ArchiveRecord) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT user_username IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE;
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE INDEX bp_status IF NOT EXISTS FOR (b:BatteryInstance) ON (b.status);
CREATE INDEX archive_retain IF NOT EXISTS FOR (a:ArchiveRecord) ON (a.retainUntil);
```
(Neo4j Community : une seule base de données, pas de contraintes d'existence de propriété.)

### Propriétés ajoutées à `BatteryInstance`
| Propriété | Type | Rôle |
|---|---|---|
| `status` | string | `Original`, `Waste`, `Reused`, `Remanufactured`, `Repurposed`, `Archived` |
| `version` | int | verrouillage optimiste, +1 à chaque changement de statut |
| `readOnly` | bool | true une fois `Archived` |
| `qrActive` | bool | false une fois la batterie dissociée du passeport |
| `archiveReason` | string? | `RECYCLED` ou `SUPERSEDED` si `Archived` |
| `responsibleOperatorId` | string? | responsable de l'exactitude des informations |

### Nouveaux nœuds
```
(:User {id, username, passwordHash, role, displayName, organization})
(:Module {moduleId, index, internalResistanceMilliOhm, internalResistanceMaxMilliOhm,
          sohPercent, nominalVoltage, hasAccident, inherited, recycled})
(:StatusRequest {id, requestedStatus, state: PENDING|APPROVED|REJECTED, diagnostic (JSON string),
                 createdAt, decidedAt, decisionReason})
(:StatusEvent {id, from, to, reason, at, justification, proofRef, snapshot (JSON string),
               responsibleOperatorId})
(:ArchiveRequest {id, state: PENDING_VALIDATION|VALIDATED|REJECTED, certificateRef, createdAt, decidedAt})
(:ArchiveRecord {id, reason: RECYCLED|SUPERSEDED, archivedAt, retainUntil, format, sha256, packagePath,
                 state: ACTIVE|LEGAL_HOLD|PURGED, notes, purgeOwnerValidatedAt, purgeComplianceValidatedAt,
                 holdReason})
(:AccessLog {id, archiveId, actorId, at, action})
(:Notification {id, type, message, createdAt, read})
(:Migration {id, appliedAt})
```
Les champs JSON (`diagnostic`, `snapshot`) sont stockés **en chaîne JSON** (Neo4j ne stocke pas d'objets imbriqués).

### Nouvelles relations
```
(BatteryInstance)-[:HAS_MODULE]->(Module)
(BatteryInstance)-[:HAS_STATUS_EVENT]->(StatusEvent)
(BatteryInstance)-[:HAS_REQUEST]->(StatusRequest)
(BatteryInstance)-[:HAS_ARCHIVE_REQUEST]->(ArchiveRequest)
(BatteryInstance)-[:ARCHIVED_AS]->(ArchiveRecord)
(new:BatteryInstance)-[:DERIVED_FROM {at, reason}]->(old:BatteryInstance)
(new:BatteryInstance)-[:REUSES_MODULE]->(Module)
(StatusRequest|ArchiveRequest|StatusEvent)-[:BY]->(User)
(BatteryInstance)-[:OWNED_BY {since, until}]->(EconomicOperator)    // historique de propriété
(Notification)-[:FOR]->(User)
(AccessLog)-[:ON]->(ArchiveRecord)
```

## Requêtes de référence (esquisses, à adapter au dump)

### Archivage (Prepare for Archive, étape de validation)
```cypher
MATCH (b:BatteryInstance {batteryPassportId: $bpId, status: 'Waste'})
WHERE b.version = $expectedVersion AND coalesce(b.readOnly, false) = false
CREATE (e:StatusEvent {id: $eventId, from: 'Waste', to: 'Archived', reason: 'RECYCLED',
  at: datetime(), justification: $justification, proofRef: $certRef, snapshot: $snapshotJson})
CREATE (b)-[:HAS_STATUS_EVENT]->(e)
WITH b, e
MATCH (u:User {id: $actorId}) CREATE (e)-[:BY]->(u)
WITH b
CREATE (a:ArchiveRecord {id: $archiveId, reason: 'RECYCLED', archivedAt: datetime(),
  retainUntil: date($retainUntil), format: 'JSON-LD', sha256: $hash, packagePath: $path, state: 'ACTIVE'})
CREATE (b)-[:ARCHIVED_AS]->(a)
SET b.status = 'Archived', b.readOnly = true, b.qrActive = false,
    b.archiveReason = 'RECYCLED', b.version = b.version + 1
RETURN b.batteryPassportId AS id, b.version AS version
```
Si aucune ligne n'est retournée (statut ou `version` différents), l'API répond `VERSION_CONFLICT` ou
`INVALID_TRANSITION` selon le cas (relire le passeport pour distinguer).

### Création d'un nouveau BP depuis un ancien
```cypher
MATCH (old:BatteryInstance {batteryPassportId: $oldId, status: 'Waste'})
WHERE old.version = $expectedVersion
MATCH (old)-[:HAS_MODULE]->(m:Module) WHERE m.moduleId IN $reusedModuleIds
WITH old, collect(m) AS mods
MATCH (model:Model)-[:HAS_BATTERY_INSTANCE]->(old)
CREATE (new:BatteryInstance {batteryPassportId: $newId, batteryId: $newBatteryId,
  status: $targetStatus, version: 1, readOnly: false, qrActive: true})
CREATE (model)-[:HAS_BATTERY_INSTANCE]->(new)
CREATE (new)-[:DERIVED_FROM {at: datetime(), reason: $targetStatus}]->(old)
FOREACH (m IN mods | CREATE (new)-[:REUSES_MODULE]->(m))
RETURN new.batteryPassportId AS newId
```
Les copies de modules (`inherited = true`), `StatusEvent`, archivage de l'ancien BP et transfert de propriété
s'ajoutent dans la **même transaction** (une seule session `executeWrite`).

### Filiation (ancêtres et descendants)
```cypher
MATCH path = (start:BatteryInstance {batteryPassportId: $id})-[:DERIVED_FROM*0..10]-(other:BatteryInstance)
RETURN path
```

### Archives échues et purgeables
```cypher
MATCH (b:BatteryInstance)-[:ARCHIVED_AS]->(a:ArchiveRecord {state: 'ACTIVE'})
WHERE a.retainUntil <= date()
AND NOT EXISTS {
  MATCH (child:BatteryInstance)-[:DERIVED_FROM]->(b)
  WHERE NOT EXISTS { MATCH (child)-[:ARCHIVED_AS]->(:ArchiveRecord {state: 'PURGED'}) }
}
RETURN b.batteryPassportId AS id, a.id AS archiveId, a.retainUntil AS retainUntil
```
(Un ancêtre n'est purgeable que si tous ses descendants sont déjà purgés.)

## Seed
Script idempotent (`MERGE`) `apps/api/src/db/seed.ts` : utilisateurs, modules, batteries de démo
(voir `docs/01-product-spec.md`), archives de démo. Il s'attache aux `Model`/`EconomicOperator` **existants** du dump.

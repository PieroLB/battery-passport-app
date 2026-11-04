# 05 – Contrat d'API REST

Base : `/api` côté public (le reverse proxy retire le préfixe) ; l'API écoute sur `/` en interne.
Format JSON, UTF-8. Dates en ISO 8601 (UTC).

## Conventions
- Auth : `Authorization: Bearer <JWT>` (sauf `/auth/login` et `/health`).
- Rôles : `GARAGISTE`, `PROPRIETAIRE_BP`, `CENTRE_TRI`, `RECYCLEUR`, `CONFORMITE`.
- Écritures idempotentes : en-tête `Idempotency-Key: <uuid>` recommandé sur tous les POST d'action.
- Concurrence : corps `expectedVersion` (entier) sur les actions qui changent un passeport.
- Erreurs (format unique) :
```json
{ "error": { "code": "INVALID_TRANSITION", "message": "Transition Original → Archived interdite",
             "details": { "from": "Original", "to": "Archived" } } }
```
Codes : `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN_ROLE` (403), `NOT_FOUND` (404),
`INVALID_TRANSITION` (409), `VERSION_CONFLICT` (409), `PRECONDITION_FAILED` (422), `INTEGRITY_ERROR` (409),
`INTERNAL` (500).
- Validation : zod sur toutes les entrées/sorties ; schémas partagés dans `packages/shared`.

## Santé
`GET /health` → `200 {"status":"ok","neo4j":"up"}` (utilisé par Docker et le déploiement).

## Authentification
- `POST /auth/login` `{username, password}` → `{token, user:{id, displayName, role, organization}}`
- `GET /me` → utilisateur courant

## Passeports
- `GET /passports?status=&q=&limit=&cursor=` → liste (rôles : tous, selon droits)
- `GET /passports/:id` → vue du passeport adaptée au rôle :
```json
{ "id":"BP-DEMO-001", "status":"Original", "version":3, "readOnly":false, "qrActive":true,
  "model":{"modelId":"...","name":"..."}, "operator":{"name":"..."},
  "modules":[{"moduleId":"...","index":3,"internalResistanceMilliOhm":9.8,"internalResistanceMaxMilliOhm":4.0,
              "sohPercent":55,"overLimit":true}],
  "events":[{"id":"...","from":"Original","to":"Waste","at":"...","actorRef":"u-123"}],
  "allowedActions":["REQUEST_WASTE"] }
```
`allowedActions` est calculé par l'API (statut + rôle + préconditions). Le front s'en sert pour afficher les boutons.
- `GET /passports/:id/events` → événements (ordre chronologique)
- `GET /passports/:id/qr.png` → image QR (encode `https://<domaine>/p/<id>`)

Pour un BP `Archived`, `GET /passports/:id` renvoie une vue **réduite** : statut, raison, date d'archivage,
message « batterie recyclée / remplacée », lien vers l'archive pour les rôles autorisés.

## Demandes de statut (garagiste → propriétaire)
- `POST /passports/:id/status-requests` (GARAGISTE)
  `{requestedStatus:"Waste", diagnostic:{reason, moduleIds:[...], note}, expectedVersion}` → `201`
- `GET /status-requests?state=PENDING` (PROPRIETAIRE_BP)
- `POST /status-requests/:id/approve` (PROPRIETAIRE_BP) `{expectedVersion}` → crée `StatusEvent`, statut `Waste`
- `POST /status-requests/:id/reject` (PROPRIETAIRE_BP) `{reason}`

## Décision et seconde vie (centre de tri)
- `POST /passports/:id/decision` (CENTRE_TRI) `{decision:"RECYCLE"|"REUSE_MODULES", justification}` → enregistre la décision
- `POST /passports/:id/derive` (CENTRE_TRI) — **Create New BP from Old**
  `{targetStatus:"Reused"|"Remanufactured"|"Repurposed", moduleIds:[...], newOperatorId, justification, expectedVersion}`
  → `201 {newPassportId, oldPassportId, oldStatus:"Archived", archiveId}` ; refus par module :
  `422 PRECONDITION_FAILED` avec `details.modules:[{moduleId, reasons:["RESISTANCE_OVER_LIMIT","SOH_BELOW_MIN"]}]`

## Archivage (recycleur → propriétaire)
- `POST /passports/:id/recycling-confirmation` (RECYCLEUR) `{certificateRef, expectedVersion}` → `201 ArchiveRequest`
- `GET /archive-requests?state=PENDING_VALIDATION` (PROPRIETAIRE_BP)
- `POST /archive-requests/:id/validate` (PROPRIETAIRE_BP) → exécute **Prepare for Archive**
  → `200 {archiveId, retainUntil, sha256}`
- `POST /archive-requests/:id/reject` (PROPRIETAIRE_BP) `{reason}`

## Archives (consultation, purge)
- `GET /archives?state=&q=` (PROPRIETAIRE_BP, CONFORMITE)
- `GET /archives/:id` → détail + **vérification d'intégrité** (`integrity: {ok:boolean, expected, actual}`) ; crée un `AccessLog`
- `GET /archives/:id/lineage` → `{ancestors:[...], descendants:[...]}`
- `GET /archives/due` → archives échues purgeables
- `POST /archives/:id/hold` (CONFORMITE) `{reason}` → `LEGAL_HOLD` ; `POST /archives/:id/release-hold`
- `POST /archives/:id/purge-validation` (PROPRIETAIRE_BP | CONFORMITE) → enregistre la validation du rôle ;
  la purge s'exécute quand **les deux** ont validé : supprime paquet + sauvegarde, `state = PURGED`, trace minimale conservée
- `GET /audit/access-logs?archiveId=` (CONFORMITE)

## Notifications
- `GET /notifications?unread=true`
- `POST /notifications/:id/read`
- (optionnel) `GET /notifications/stream` (SSE)

## Notifications émises
| Événement | Destinataires |
|---|---|
| Demande de passage en Waste | Propriétaire du BP |
| Demande approuvée / refusée | Garagiste demandeur ; centre de tri si approuvée |
| Confirmation de recyclage | Propriétaire du BP |
| Archivage validé | Recycleur, centre de tri |
| Nouveau BP créé depuis un ancien | Propriétaire d'origine, nouvel opérateur |
| Archive échue | Propriétaire du BP, conformité |

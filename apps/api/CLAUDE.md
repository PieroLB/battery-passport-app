# apps/api – consignes spécifiques

- Fastify + TypeScript strict + zod pour valider toutes les entrées et sorties.
- Structure : `src/modules/<domaine>/{routes,service,repository,schemas}.ts`.
  Les requêtes Cypher vivent **uniquement** dans les `repository`. Pas de Cypher dans les routes.
- Toute écriture dans Neo4j qui modifie un passeport se fait dans **une transaction** et
  vérifie `version` (verrouillage optimiste). Incrémente `version` à chaque changement de statut.
- Erreurs : format décrit dans `docs/05-api-spec.md`, codes d'erreur stables.
- Les règles de transition viennent de `@bp/shared` (`STATUS_TRANSITIONS`, `canTransition`).
- Auth : JWT, rôles `GARAGISTE | PROPRIETAIRE_BP | CENTRE_TRI | RECYCLEUR | CONFORMITE`.
  Chaque route déclare explicitement les rôles autorisés.
- Journalise les accès aux passeports archivés (voir `docs/03-archive-rules.md`).
- Tests : vitest. Les tests d'intégration utilisent un Neo4j éphémère (docker) ou un mock du
  repository ; ne dépends jamais de la base de production.

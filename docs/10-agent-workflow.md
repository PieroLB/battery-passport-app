# 10 – Façon de travailler avec l'agent

## Boucle de travail par tâche
1. Lire la tâche dans `docs/09-backlog.md` et les docs liées (à la demande).
2. **Planifier d'abord** : annoncer les fichiers à créer/modifier et les risques ; poser les questions bloquantes.
3. Créer la branche `feat/T-xx-titre`.
4. Implémenter par petits commits (Conventional Commits en anglais : `feat(api): ...`, `fix(web): ...`, `chore(ci): ...`).
5. Écrire/mettre à jour les tests **avec** le code.
6. Lancer `pnpm lint && pnpm typecheck && pnpm test` (et `pnpm build` si applicable) jusqu'à ce que tout passe.
7. Vérifier les critères d'acceptation (✅) de la tâche, un par un.
8. Mettre à jour les docs si une décision a changé (et créer un ADR dans `docs/decisions/`).
9. Ouvrir une PR (description : objectif, changements, comment tester, captures si UI). **Ne pas merger sur `main`** :
   le merge déclenche un déploiement en production, il est fait par un humain après CI verte.

## Définition de « terminé »
- Tests passants, lint et typecheck OK, build OK.
- Critères d'acceptation de la tâche vérifiés.
- Aucun secret, aucune donnée réelle, aucun `console.log` de debug.
- Les règles métier sont côté API et couvertes par des tests (transitions, rôles, préconditions).
- Docs et `.env.example` à jour.
- PR décrite.

## Quand poser une question (et ne pas deviner)
- Écart entre le dump réel et la doc de données.
- Règle métier absente de `docs/` ou contradictoire.
- Choix qui engage l'architecture, la sécurité, la facture (service tiers payant) ou la conformité.
- Toute action sur le VPS, les secrets GitHub ou la production.

## Garde-fous
- Ne jamais afficher, journaliser ni committer un secret.
- Ne jamais exécuter de commande destructive sur le VPS (voir `docs/08-devops.md`, « Interdits »).
- Ne jamais pousser en force, ne jamais réécrire l'historique de `main`.
- Ne pas contourner la CI (`--no-verify`, tests désactivés) pour « faire passer » une PR.
- Ne pas présenter les choix de PoC (statut `Archived`, durées, seuils) comme des obligations légales.
- Requêtes Cypher toujours paramétrées ; jamais de concaténation de chaînes avec des entrées utilisateur.

## Travailler à plusieurs (équipe de 7)
- Une personne = une tâche = une session d'agent = une branche. Éviter que deux sessions touchent les mêmes fichiers.
- Partir de `main` à jour ; rebaser avant la PR ; PR petites et fréquentes.
- Les contrats partagés (`packages/shared`, `docs/05-api-spec.md`) sont modifiés **en premier**, dans une PR dédiée,
  avant que l'API et le front en dépendent.
- Ordre conseillé pour paralléliser : M0 (une seule session, d'abord), puis API et front de chaque jalon en parallèle
  une fois le contrat d'API d'un jalon figé.

## Prompt de démarrage (à coller dans la première session)
```
Lis CLAUDE.md puis docs/00-context.md et docs/09-backlog.md.
Commence par la tâche T-00. Avant de coder, donne-moi ton plan (fichiers, commandes, risques) et pose
les questions bloquantes listées dans docs/12-assumptions-and-open-questions.md si elles ne sont pas encore tranchées.
Travaille sur une branche, fais des commits courts, lance lint + typecheck + test avant la PR.
Ne touche ni au VPS ni aux secrets.
```

## Prompts types par jalon
- **M1** : « Réalise T-10. Restaure le dump, inspecte le schéma réel, écris l'ADR 0001 et mets à jour docs/04. Ne code rien d'autre. »
- **M4** : « Réalise T-40 puis T-41. Les transitions viennent de packages/shared. Montre-moi les tests des règles avant le front. »
- **M5/M6** : « Réalise T-50. Tout l'archivage doit tenir dans une seule transaction avec rollback testé. »
- **M8** : « Réalise T-80 : rejoue le script de démo de docs/01 en test automatisé. »

## Repères Claude Code (à vérifier dans la doc officielle)
- Le fichier `CLAUDE.md` à la racine est chargé au démarrage de chaque session ; les `CLAUDE.md` de sous-dossiers
  (`apps/api`, `apps/web`) sont lus à la demande quand l'agent touche ces fichiers.
- Garder `CLAUDE.md` court : les docs détaillées sont référencées en chemins (pas en imports `@`) pour ne pas tout charger.
- Documentation : https://docs.claude.com/en/docs/claude-code/overview (mémoire : /en/docs/claude-code/memory).

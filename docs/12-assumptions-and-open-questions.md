# 12 – Hypothèses faites et questions ouvertes

## Hypothèses retenues par défaut (à corriger si faux)
| # | Sujet | Hypothèse | Si faux |
|---|---|---|---|
| H1 | Stack back | Node LTS + TypeScript + Fastify | Adapter `docs/07` et les `CLAUDE.md` |
| H2 | Stack front | Nuxt 3 (SPA) + Tailwind + Pinia | Adapter `docs/06`, `docs/07`, `apps/web/CLAUDE.md` |
| H3 | Front | **Une seule appli** avec layouts par rôle (tablette/desktop/mobile), pas trois apps | Revoir `docs/06` et la structure |
| H4 | Gestionnaire de paquets | pnpm workspaces (sans Turborepo/Nx) | Adapter scripts et Dockerfiles |
| H5 | Hébergement du code et CI | GitHub + GitHub Actions + registre GHCR | Réécrire `docs/08` (GitLab CI, Docker Hub, etc.) |
| H6 | VPS | Debian/Ubuntu, ≥ 2 Go de RAM, accès SSH par clé, Docker installable | Ajuster mémoire Neo4j et procédure |
| H7 | Reverse proxy | Caddy dans le compose, HTTPS automatique | Si Nginx/Traefik déjà présent sur le VPS, adapter |
| H8 | Domaine | Un nom de domaine pointe vers le VPS (**HTTPS requis** pour la caméra du scanner sur mobile) | Démo mobile impossible sans HTTPS |
| H9 | Neo4j | Édition Community, image `neo4j:5-community`, une seule base | Aligner sur la version réelle du dump |
| H10 | Auth | Comptes seedés + JWT, pas de SSO | Hors périmètre PoC |
| H11 | Notifications | In-app uniquement (polling 10 s), pas d'e-mail | Ajouter un service d'envoi |
| H12 | Preuves de recyclage | Simulées (référence de certificat), pas de PDF/A réel | Ajouter génération/téléversement |
| H13 | Langue | UI et docs en français ; code, commits et identifiants en anglais | Adapter les consignes |
| H14 | Merge sur `main` | Fait par un humain après CI verte ; l'agent n'y pousse pas | Adapter `docs/10` |
| H15 | Rôle conformité | Rôle ajouté par l'équipe (non prévu par le sujet) | Retirer le rôle, la double validation devient propriétaire seul |

## Questions à trancher avant ou pendant T-00 (l'agent doit les poser s'il manque une réponse)
1. **Version et origine du dump Neo4j** : version de Neo4j qui l'a produit (4.4 ? 5.x ?) et nom du fichier ?
2. **Le VPS** : OS, RAM, existe-t-il déjà un reverse proxy ou des conteneurs sur les ports 80/443 ?
3. **Domaine** : lequel, et le DNS pointe-t-il déjà vers le VPS ?
4. **Dépôt GitHub** : organisation ou compte personnel ? Dépôt privé ou public (visibilité des images GHCR) ?
5. **Stack front/back** : la stack par défaut (H1, H2) convient-elle à toute l'équipe ?
6. **Où tourne l'agent** : en local sur le poste d'une personne, ou à distance ? (impacte l'accès au Docker et au VPS)
7. **Mot de passe de démo** : valeur de `SEED_DEFAULT_PASSWORD` pour l'environnement de démo ?
8. **Nombre d'environnements** : seulement la production sur le VPS, ou aussi une préproduction ?
9. **Rôle conformité** : on le garde ou on reste sur les trois rôles du sujet ?
10. **Seuils de réemploi** (`REUSE_MIN_SOH_PERCENT`, facteur de résistance) : valeurs par défaut acceptées par l'équipe ?

# Battery Passport – PoC (Hackathon ESILV × Capgemini Engineering)

Proof of concept d'un Digital Battery Passport. Défi traité : **n°6 – archivage des données en fin de vie**.

> Ce README est destiné aux humains. L'agent de développement lit `CLAUDE.md` et `docs/`.

## Démarrage rapide (local)
```bash
cp .env.example .env            # puis renseigner les valeurs
pnpm install
docker compose up -d neo4j
pnpm --filter @bp/api seed
pnpm dev
```
- Front : http://localhost:3000
- API : http://localhost:4000 (santé : `/health`)

## Comptes de test (environnement de démo uniquement)
| Rôle | Identifiant | Interface |
|---|---|---|
| Garagiste | `garagiste` | tablette |
| Propriétaire du BP (constructeur) | `proprietaire` | desktop |
| Centre de tri | `centretri` | mobile |
| Recycleur | `recycleur` | mobile |
| Responsable conformité | `conformite` | desktop |

Mot de passe : défini par `SEED_DEFAULT_PASSWORD` (valeur de démo dans `.env.example`, **à changer en production**).

## Rejouer la démo
Voir `docs/01-product-spec.md`, section « Script de démo ».

## Déploiement
Chaque merge sur `main` déclenche : CI → build des images Docker → push sur GHCR → déploiement SSH sur le VPS.
Détail et préparation du VPS : `docs/08-devops.md`.

## Documentation
Tout est dans `docs/` (index dans `CLAUDE.md`).

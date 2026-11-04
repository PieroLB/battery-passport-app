# 0001 – Pas de dump Neo4j : schéma défini par l'équipe

Date : 2026-11-04 · Statut : acceptée

## Contexte
Le sujet annonçait un dump Neo4j fourni. Finalement, **aucun dump n'a été fourni**. La doc prévoyait de
l'inspecter (règle 7 de `CLAUDE.md`), de le restaurer (`neo4j-restore`) et de rattacher le seed à ses nœuds.

Sources disponibles (`docs/sources/`, non versionnées) : le sujet (figure 1 « Modèle de données pour un Battery
Passport ») et la liste d'attributs Battery Pass (longlist v1.2).

## Options
1. Attendre un dump : bloquant pour tout le jalon M1.
2. Recréer le schéma à partir de la figure 1, étendu pour le défi 6.

## Décision
Option 2. `docs/04-data-model-neo4j.md` devient la référence : modèle de base = figure 1 (noms, sens des
relations, types), extensions = les nôtres. Chaque attribut est relié à son numéro dans la longlist Battery Pass.

Corrections par rapport à la version indicative de `docs/04` : `EconomicOperator.weblink` (et non `website`),
`CarbonFootprint.linkStudy` (et non `lifeStudy`), `(Company)-[:HAS_TYPE]->(Type)` (sens fixé), propriétés exactes
d'`Anode`/`Cathode`/`Electrolyte` (listes parallèles).

## Conséquences
- Suppression du service `neo4j-restore`, du dossier `neo4j/dump/` et des procédures de restauration.
- Le seed (T-12) crée tout le graphe, y compris le modèle de base, avec des valeurs fictives.
- Neo4j reste en 5 LTS (`neo4j:5-community`) : plus de contrainte de version imposée par un dump.
- Les documents sources ne sont pas versionnés : le repo est public et leur redistribution n'est pas acquise.

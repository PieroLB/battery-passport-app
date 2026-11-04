# 11 – Notes de conformité (RGPD, ISO, règlement batteries)

> Ce document n'est pas un avis juridique. Les points réglementaires proviennent de **sources secondaires**
> (analyses de cabinets et de blogs spécialisés) et sont à relire dans le texte officiel avant d'être cités :
> Règlement (UE) 2023/1542, article 77 — https://eur-lex.europa.eu/eli/reg/2023/1542

## Règlement batteries : points à vérifier
- Après préparation au réemploi, requalification d'usage ou remise à neuf, l'opérateur qui remet la batterie sur le marché
  reprend la responsabilité et crée un **nouveau passeport lié à l'original**.
- Réemploi direct sans passage par le statut déchet : une source indique qu'aucun nouveau passeport n'est alors exigé.
  Le PoC ne couvre que `Waste → seconde vie` (préparation au réemploi).
- Le passeport **cesse d'exister** une fois la batterie recyclée. L'archive du PoC est donc une **conservation interne**.
- Au passage en `Waste`, la responsabilité de l'exactitude des informations passe au producteur, à son organisme de
  responsabilité élargie ou à l'opérateur de gestion des déchets désigné.
- Les données dynamiques doivent être mises à jour au minimum à chaque changement de statut.
- La durée de 10 ans est citée pour la documentation technique et la déclaration de conformité du fabricant, **pas** pour
  les données archivées d'un passeport.
- Cas non résolu : une batterie mise sur le marché avant février 2027 n'a pas de passeport d'origine ; non traité.
- Plusieurs sources indiquent que le passeport doit rester accessible même si l'opérateur cesse son activité, avec une
  sauvegarde chez un tiers indépendant (simulée par `archives_backup` dans le PoC).

## RGPD
Les données techniques d'une batterie ne sont en principe pas des données personnelles ; elles le deviennent si elles
peuvent être reliées à une personne identifiable.

| Donnée | Pourquoi elle peut être personnelle | Traitement |
|---|---|---|
| Contacts des opérateurs (nom, e-mail, téléphone) | Peut désigner une personne physique | Remplacés par un identifiant d'organisation à l'archivage |
| Comptes utilisateurs | Identifient la personne qui a agi | Identifiant pseudonyme (UUID) dans les événements ; table de correspondance séparée |
| Lien batterie – véhicule – client | Permet de remonter à un client | Ne pas stocker l'identité du client dans le passeport |
| Journaux d'accès | Contiennent des identifiants d'utilisateurs | Durée limitée, accès restreint |

Principes appliqués : minimisation et limitation de la conservation (art. 5), protection dès la conception et sécurité
(art. 25 et 32), droit à l'effacement pour les données personnelles (art. 17). La base légale est à qualifier avec un
juriste ou un DPO. **Pseudonymiser n'est pas anonymiser** : tant qu'une table de correspondance existe, les données restent personnelles.

## Référentiels (bonnes pratiques à citer, pas des exigences du règlement)
| Référentiel | Usage dans le projet |
|---|---|
| ISO 14721 (OAIS) | Structure du paquet d'archive : données, métadonnées, empreinte |
| ISO 15489-1 | Authenticité, fiabilité, intégrité, exploitabilité de l'archive |
| ISO 19005 (PDF/A) | Format des documents archivés (preuves) — non implémenté dans le PoC |
| ISO/IEC 27001 | Contrôle d'accès, journalisation, sauvegarde, chiffrement |
| ISO/IEC 27701 | Cadre de mise en œuvre du RGPD |
| ISO 8601 | Horodatage des événements et journaux |
| ISO 14040 / 14044 | Analyse du cycle de vie (base de l'empreinte carbone du passeport) |
| DIN DKE SPEC 99100 | Contenu du passeport (hors ISO) ; base de la liste d'attributs fournie |

## Traçabilité implémentée
- Journal d'événements immuable (`StatusEvent`), état courant déduit de l'historique.
- Filiation `DERIVED_FROM` entre passeports.
- Empreinte SHA-256 des paquets d'archive, vérifiée à chaque consultation.
- Acteurs pseudonymisés ; droits par rôle ; `AccessLog` sur les archives.

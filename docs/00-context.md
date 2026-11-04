# 00 – Contexte et périmètre

## Le hackathon
- Hackathon ESILV × Capgemini Engineering, sujet « Battery Passport ».
- **Durée : 2 jours. Équipe : 7 personnes.**
- Livrables attendus : slides de synthèse (10–15), maquettes et/ou diagrammes (BPMN/UML/Archimate),
  démo (URL ou vidéo de 2–3 min) avec jeu de données et scripts, README pour rejouer la démo
  (pré-requis, étapes, comptes de test).
- Chaque équipe traite le **cas d'usage global** + au moins un défi. **Notre défi : n°6.**

## Pourquoi un Battery Passport
Le règlement européen sur les batteries (UE) 2023/1542 impose un passeport numérique pour les
batteries de véhicules électriques, de mobilité légère et industrielles > 2 kWh, accessible via
un QR code. Il centralise les données de fabrication, d'usage, de performance et de fin de vie.

## Cas d'usage global (obligatoire)
1. Un client se rend chez son garagiste pour un problème de batterie.
2. Le **garagiste** scanne le QR code, constate un défaut critique, et prévient le
   **propriétaire du BP** (représentant du constructeur), qui passe le statut de `Original` à `Waste`
   et organise le transfert vers un **centre de tri**.
3. Le **centre de tri** scanne le QR code et constate que le statut est à jour (`Waste`).

## Défi 6 – Archivage des données (notre défi)
Le centre de tri décide que la batterie doit être recyclée. Une fois démantelée, la batterie est
dissociée de son BP. Les données ne doivent pas être détruites avec la batterie : elles sont
archivées (analyse) ou dupliquées si des modules sont réemployés dans un autre pack.

À livrer :
- schéma fonctionnel du cycle de vie du BP (statuts, acteurs, déclencheurs) → `docs/02-...`
- table des règles d'archivage (durée, format, déclencheur) → `docs/03-...`
- cas d'usage `Prepare for Archive` et `Create New BP from Old` → `docs/01-...`
- réflexion sur la traçabilité et la conformité (ISO, RGPD) → `docs/11-...`

## Périmètre du PoC
**Inclus** : cas d'usage global, cycle de vie et règles de statut, `Prepare for Archive`,
`Create New BP from Old`, consultation d'archive et de filiation, validation de purge,
authentification par rôles, QR codes, notifications in-app, déploiement automatisé.

**Hors périmètre** (à mentionner comme évolutions dans les slides) : défi 1 (télémétrie BMS /
Wokwi), défi 2 (logistique de transfert), défi 3 (aide à la décision multicritère), défi 4
(widget 3DEXPERIENCE), défi 5 (roadmap), envoi d'e-mails, vraie signature électronique, vrai
prestataire de sauvegarde tiers (simulé par un second dossier), passage direct Original → Reused.

## Sources de référence
- Le sujet du hackathon (PDF) et la liste d'attributs `2023_Battery_Passport_Data_Attributes.xlsx`
  (Battery Pass consortium, longlist v1.2, base DIN DKE SPEC 99100).
- Règlement (UE) 2023/1542, article 77 (à relire sur EUR-Lex : eur-lex.europa.eu/eli/reg/2023/1542).

# 06 – Spécification front-end

Nuxt 4 en SPA (`ssr: false`, `nuxt generate`), TypeScript, Tailwind, Pinia. Interface en français. Une seule appli,
des layouts selon le rôle, **responsive** : tablette (garagiste), desktop (propriétaire, conformité),
mobile (centre de tri, recycleur).

## Routes
| Route | Rôle(s) | Contenu |
|---|---|---|
| `/login` | public | Connexion (identifiant + mot de passe) |
| `/` | connecté | Redirection vers l'accueil du rôle |
| `/p/[id]` | tous | **Vue passeport** (cible du QR code), adaptée au rôle |
| `/scan` | tous | Scanner QR (caméra) + saisie manuelle de l'identifiant |
| `/garagiste` | GARAGISTE | Accueil tablette : scanner, derniers passeports, mes demandes |
| `/garagiste/demande/[id]` | GARAGISTE | Formulaire de diagnostic et demande de passage en Waste |
| `/proprietaire` | PROPRIETAIRE_BP | Tableau de bord : demandes de statut, demandes d'archivage, notifications |
| `/proprietaire/passeports` | PROPRIETAIRE_BP | Liste filtrable des passeports |
| `/proprietaire/archives` | PROPRIETAIRE_BP, CONFORMITE | Archives, échéances, purges à valider |
| `/archives/[id]` | PROPRIETAIRE_BP, CONFORMITE | Détail d'archive, intégrité, filiation, journal d'accès |
| `/centre-tri` | CENTRE_TRI | Accueil mobile : scanner, passeports `Waste` |
| `/centre-tri/decision/[id]` | CENTRE_TRI | Diagnostic des modules, décision, **Create New BP from Old** |
| `/recycleur` | RECYCLEUR | Accueil mobile : scanner, batteries à recycler |
| `/recycleur/confirmation/[id]` | RECYCLEUR | Confirmer « recyclage terminé » + certificat |
| `/conformite` | CONFORMITE | Archives, purges à co-valider, gels, journaux d'audit |

Garde de route : middleware qui redirige vers `/login` si non connecté et vers l'accueil du rôle si le rôle
n'a pas accès. Le **contrôle réel** reste côté API.

## Vue passeport `/p/[id]` (écran clé)
- En-tête : identifiant, **badge de statut** (couleurs : `Original` vert, `Waste` rouge, seconde vie bleu/teal,
  `Archived` gris), version, dernier changement (date + auteur pseudonyme).
- Bloc modules : 5 cartes (M1–M5) avec résistance interne, seuil max, SOH ; module hors seuil signalé en rouge
  (couleur + icône + texte, jamais la couleur seule).
- Chronologie des événements (`timeline`) : changement de statut, demande, décision, archivage.
- Filiation : si `DERIVED_FROM`, liens vers ancêtres/descendants.
- Boutons d'action = `allowedActions` renvoyées par l'API (aucune logique de droits dans le front).
- BP `Archived` : vue réduite « Batterie recyclée – passeport archivé » + lien vers l'archive pour les rôles autorisés.

## Parcours par rôle (cas de démo)
1. **Garagiste (tablette)** : `/scan` → `/p/BP-DEMO-001` → « Demander le passage en Waste » → formulaire diagnostic → confirmation.
2. **Propriétaire (desktop)** : cloche + carte « Demandes en attente » → détail du diagnostic → Approuver/Refuser.
3. **Centre de tri (mobile)** : `/scan` → `/p/BP-DEMO-001` : badge `Waste` clair. Puis `/centre-tri/decision/BP-DEMO-002` :
   cases à cocher par module (les modules hors seuil sont désactivés avec le motif), choix du statut cible,
   opérateur, justification, bouton « Créer le nouveau passeport ».
4. **Recycleur (mobile)** : `/recycleur/confirmation/BP-DEMO-003` → référence du certificat → « Recyclage terminé ».
5. **Propriétaire** : carte « Demandes d'archivage » → Valider → toast avec échéance et empreinte.
6. **Conformité / Propriétaire** : `/archives/BP-DEMO-004` → empreinte vérifiée, filiation, journal d'accès ;
   `/proprietaire/archives` → purge de `BP-DEMO-007` (double validation).

## Composants à créer
`StatusBadge`, `ModuleCard`, `EventTimeline`, `LineageTree` (liste imbriquée ; graphe visuel optionnel),
`QrScanner` (html5-qrcode + saisie manuelle), `NotificationBell`, `ConfirmDialog`, `ErrorBanner`
(affiche `error.message` de l'API), `RoleLayout` (tablette/desktop/mobile).

## Comportements
- `useApi()` : ajoute le JWT, convertit les erreurs API en objet `ApiError {code, message, details}`.
- Sur `VERSION_CONFLICT` : message « Ce passeport a été modifié, rechargez » + bouton recharger.
- Actions longues : bouton désactivé + indicateur ; pas de double soumission (envoyer `Idempotency-Key`).
- Notifications : polling toutes les 10 s (ou SSE).
- Textes : français, ton simple et direct ; pas de jargon sans explication (ex. « SOH » avec infobulle « état de santé »).
- Accessibilité : contrastes AA, étiquettes de champs, focus visible, cibles tactiles ≥ 44 px, navigation clavier sur desktop.

## Maquettes
Si l'équipe fournit des maquettes (Figma/PNG), les placer dans `docs/design/` et les référencer ici ;
sinon appliquer la présente spécification avec un style sobre (Tailwind, palette neutre + couleurs de statut).

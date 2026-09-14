# Comptage d'inventaire — Shop Santé

Page web de comptage pour les tablettes de l'entrepôt. Aucune connexion, aucun
compte : les tablettes ouvrent simplement une adresse web.

- `index.html` — la page de comptage (interface identique à la version Claude)
- `Code.gs` — le script Google Apps Script qui reçoit les décomptes dans le Google Sheet

## 1. Publier la page (une seule fois)

Dans ce dépôt : **Settings → Pages → Branch : `main` / `(root)` → Save**.
Après 1–2 minutes, la page est en ligne à :

```
https://camille234.github.io/comptage-inventaire/
```

## 2. Brancher le Google Sheet (une seule fois)

1. Ouvrir le Google Sheet « Comptage inventaire Shop Santé ».
2. **Extensions → Apps Script**.
3. Effacer le contenu de `Code.gs` et y coller le contenu du fichier `Code.gs` de ce dépôt. Enregistrer.
4. **Déployer → Nouveau déploiement → Type : Application web**.
   - Description : `Comptage tablettes`
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Autoriser l'accès quand Google le demande (« Paramètres avancés » → « Accéder à … »).
6. Copier l'**URL de l'application web** (elle se termine par `/exec`).

## 3. Relier la page au Sheet

Sur chaque tablette : ouvrir la page, toucher le badge de synchro en haut à droite,
coller l'URL `/exec`, valider. La tablette retient l'adresse.

Une fois l'URL connue, elle peut aussi être inscrite directement dans `index.html`
(constante `ENDPOINT` en haut du script) — les tablettes n'ont alors plus rien à
configurer.

## Comportement

- Chaque décompte enregistré part vers le Sheet et se propage aux autres tablettes
  (rafraîchissement toutes les 15 secondes).
- Sans réseau, tout continue de fonctionner : les décomptes sont conservés sur la
  tablette et partent dès le retour du wifi (le badge indique le nombre en attente).
- Le bouton « Exporter CSV » télécharge l'état de la tablette à tout moment.

<p align="center">
  <img src="icon.png" width="96" alt="Nintendo Music PC">
</p>

<h1 align="center">Nintendo Music PC 🎧</h1>

<p align="center">
  Un client de bureau <b>non-officiel</b> pour <a href="https://music.nintendo.com/">Nintendo Music</a>, basé sur Electron.<br>
  Rich Presence Discord dynamique, thèmes personnalisables, CSS injecté et bien plus.
</p>

<p align="center">
  <img alt="platform" src="https://img.shields.io/badge/plateforme-Windows%20%7C%20Linux%20%7C%20macOS-blue">
  <img alt="electron" src="https://img.shields.io/badge/Electron-42%20(Castlabs%2FWidevine)-9feaf9">
  <img alt="status" src="https://img.shields.io/badge/statut-non--officiel-orange">
</p>

---

> ⚠️ **Avertissement** : ce projet n'est ni développé, ni approuvé, ni affilié à Nintendo Co., Ltd. ou à l'une de ses filiales. Il s'agit d'un client tiers qui affiche le site officiel [music.nintendo.com](https://music.nintendo.com/) dans une fenêtre Electron et y ajoute des fonctionnalités de confort (thèmes, Discord, notifications...). Un compte Nintendo avec un abonnement **Nintendo Switch Online** actif reste nécessaire pour écouter les morceaux, exactement comme sur le site web officiel.

## 📚 Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
  - [Utilisateurs (recommandé)](#utilisateurs-recommandé)
  - [Depuis les sources](#depuis-les-sources)
- [Compiler l'application](#️-compiler-lapplication)
- [Guide d'utilisation](#-guide-dutilisation)
  - [Barre de menu](#barre-de-menu)
  - [Icône dans la zone de notification (tray)](#icône-dans-la-zone-de-notification-tray)
  - [Raccourcis clavier](#raccourcis-clavier)
- [Rich Presence Discord](#-rich-presence-discord)
- [Éditeur de thèmes](#-éditeur-de-thèmes)
  - [Thèmes palette](#thèmes-palette)
  - [CSS personnalisé](#css-personnalisé)
  - [Import / Export](#import--export)
- [Fichiers de configuration](#-fichiers-de-configuration)
- [Vie privée & sécurité](#-vie-privée--sécurité)
- [Dépannage (FAQ)](#-dépannage-faq)
- [Contribuer](#-contribuer)
- [Remerciements](#-remerciements)
- [Licence](#-licence)

## 🚀 Fonctionnalités

### 🎵 Lecture & compatibilité
- **Support DRM natif (Widevine)** grâce au build Electron spécialisé de [Castlabs](https://github.com/castlabs/electron-releases), qui évite l'erreur fatale `9012-4001` rencontrée avec un Electron standard.
- **Instance unique** : relancer l'application ramène simplement la fenêtre existante au premier plan au lieu d'ouvrir un second processus.
- **Session isolée** (`persist:nintendoMusic`) et **User-Agent personnalisé** pour une compatibilité maximale avec le site.
- **Blocage des trackers** : les requêtes vers Google Analytics et Sentry sont interceptées et annulées avant de partir.
- **Touches multimédias globales** : la touche *Lecture/Pause* de votre clavier fonctionne même quand l'application est en arrière-plan.
- **Fenêtre système** : réduction dans la zone de notification au lieu de se fermer, options de démarrage automatique et de démarrage minimisé, accélération matérielle activable/désactivable.

### 🎮 Rich Presence Discord
- Détection en temps réel de la lecture (via `navigator.mediaSession` et les balises `<audio>`/`<video>` de la page).
- Affiche le **titre du morceau**, le **nom du jeu** (quand le site le fournit) et la **pochette officielle** sur votre profil Discord.
- **Barre de progression** synchronisée (temps écoulé / restant) grâce aux timestamps Discord natifs.
- Bascule automatiquement sur *"Dans les menus"* dès la mise en pause, sans attendre.
- **Mode privé** : masque le titre, l'artiste et la pochette de la musique en cours (utile en streaming ou en visio) sans avoir à couper toute la Rich Presence.
- **Anti rate-limit** : un système de cache compare l'état précédent avant chaque envoi et n'interroge Discord que si quelque chose a réellement changé.
- Activable/désactivable entièrement depuis le menu `Discord`.

### 🔔 Notifications
- Une notification système (toast Windows/Linux/macOS) s'affiche à chaque changement de morceau, avec le titre et l'artiste.
- **Interrupteur dédié** (`Système ▸ Show Track Notifications`) pour désactiver ces notifications sans toucher au reste de l'app.

### 🎨 Apparence & thèmes
- 3 thèmes intégrés : **Sombre** (par défaut), **Clair**, **Deep Purple**.
- **9 rayons de bordure** au choix, de `0px` (carré) à `50px` (pilule), appliqués dynamiquement sur toute l'interface.
- Option **Toujours au premier plan** (Always on Top).
- **Éditeur de thèmes graphique** intégré (voir plus bas) pour créer vos propres palettes de couleurs ou injecter du CSS personnalisé, sans toucher au code.
- Thèmes personnalisés sauvegardés, listés et sélectionnables directement depuis le menu `Appearance ▸ Theme ▸ Custom Themes`.

## 📦 Installation

### Utilisateurs (recommandé)

1. Rendez-vous sur la page [Releases](../../releases) du dépôt.
2. Téléchargez la dernière version de `setup.exe` (Windows).
3. Lancez l'installeur et suivez les instructions.
4. Connectez-vous avec votre compte Nintendo (abonnement Nintendo Switch Online requis) au premier lancement.

> Les builds Linux (`.AppImage`) et macOS (`.dmg`) peuvent être générés vous-même via les commandes ci-dessous — voir [Compiler l'application](#️-compiler-lapplication).

### Depuis les sources

Prérequis : [Node.js](https://nodejs.org/) 18 ou supérieur.

```bash
git clone https://github.com/Axolat000/Unofficial-Nintendo-Music-client.git
cd Unofficial-Nintendo-Music-client
npm install
npm start
```

## 🛠️ Compiler l'application

Le projet utilise [electron-builder](https://www.electron.build/). Les exécutables générés sont placés dans le dossier `dist/`.

```bash
# Windows (.exe, installeur NSIS)
npm run build:win

# Linux (.AppImage)
npm run build:linux

# macOS (.dmg)
npm run build:mac
```

## 📖 Guide d'utilisation

### Barre de menu

| Menu | Option | Description |
|---|---|---|
| **Navigation** | Home | Retourne à la page d'accueil de Nintendo Music |
| | Reload | Recharge la page |
| | Quit Client | Ferme complètement l'application |
| **Appearance** | Theme | Sombre / Clair / Deep Purple / Thèmes custom / Éditeur de thèmes |
| | Border Radius | 9 presets, de carré à arrondi maximal |
| | Always on Top | Garde la fenêtre au-dessus des autres |
| **Discord** | Enable Rich Presence | Active/désactive complètement la Rich Presence |
| | Private Mode | Masque les infos du morceau en cours dans Discord |
| **System** | Show Track Notifications | Active/désactive les notifications de changement de morceau |
| | Run at Startup | Lance l'application au démarrage de Windows/session |
| | Start Minimized to Tray | Démarre directement dans la zone de notification |
| | Hardware Acceleration | Active/désactive le rendu accéléré GPU (redémarrage requis) |

### Icône dans la zone de notification (tray)

Cliquer sur l'icône dans la zone de notification affiche/masque la fenêtre. Un clic droit ouvre un menu rapide :

- **Show / Hide** — afficher/masquer la fenêtre
- **Play / Pause** — contrôle la lecture sans rouvrir la fenêtre
- **Next Track** — piste suivante
- **🎨 Theme Editor...** — ouvre directement l'éditeur de thèmes
- **Quit** — quitte l'application

> Fermer la fenêtre (❌) ne quitte pas l'application : elle continue de tourner en arrière-plan (musique + Rich Presence) et se réduit dans le tray. Utilisez `Quit` pour quitter réellement.

### Raccourcis clavier

- **Touche Lecture/Pause multimédia** (clavier ou casque) : bascule play/pause, même fenêtre en arrière-plan.

## 🎮 Rich Presence Discord

Pour fonctionner, Discord doit être **lancé sur le même ordinateur** (l'application communique en local via l'IPC natif de Discord, aucune configuration de compte n'est nécessaire).

Ce qui est affiché sur votre profil :

```
Écoute Nintendo Music
🎵 <Titre du morceau>
   <Nom du jeu>            ← si fourni par le site, sinon "Nintendo"
   ⏱ 00:14 ────●──── 00:45
```

- Le **nom du jeu** remplace désormais l'affichage générique en double d'« Nintendo » : le mot n'apparaît plus qu'une seule fois (en info-bulle sur la pochette), et la ligne principale montre l'info la plus utile.
- En **Mode privé** (`Discord ▸ Private Mode`), tout est remplacé par *"Hidden Track" / "Private Mode"* et la pochette par défaut — personne ne voit ce que vous écoutez, mais vos amis savent que l'app tourne.
- Désactiver `Enable Rich Presence` coupe entièrement l'activité (aucune donnée n'est envoyée à Discord).

## 🎨 Éditeur de thèmes

Accessible depuis `Appearance ▸ Theme ▸ 🎨 Theme Editor...` ou depuis le menu du tray.

### Thèmes palette

Créez un thème en choisissant 6 couleurs (accent, fond principal, fond secondaire, fond tertiaire, texte principal, texte secondaire) : un aperçu en direct des pastilles vous montre le rendu avant application. Les thèmes sont listés dans la barre latérale, duplicables, renommables et supprimables.

### CSS personnalisé

Un onglet dédié permet de coller directement du CSS qui sera injecté dans la page Nintendo Music (via `insertCSS`, sans modifier les fichiers du site). Un aide-mémoire liste les principales variables CSS identifiées sur le site (couleur d'accent, fonds, panneaux...) à surcharger avec `!important`.

### Import / Export

- **Importer** un fichier `.css` (glisser-déposer ou sélection) directement dans l'éditeur.
- **Importer** un fichier `.json` contenant un ou plusieurs thèmes palette/CSS (fusion avec vos thèmes existants).
- **Exporter** tous vos thèmes personnalisés dans un `.json` partageable, ou exporter le CSS actuellement collé dans l'éditeur en `.css`.

## 🗂 Fichiers de configuration

L'application stocke ses réglages en dehors du dossier d'installation, dans le répertoire de données utilisateur d'Electron :

| Fichier | Contenu |
|---|---|
| `%APPDATA%\nintendo-music-pc\nintendo-music-config.json` | Thème actif, rayon de bordure, réglages Discord/notifications, démarrage auto, CSS custom activé, etc. |
| `%APPDATA%\nintendo-music-pc\nintendo-music-custom-themes.json` | Vos thèmes personnalisés (palettes et CSS sauvegardés). |

*(sous Linux/macOS : `~/.config/nintendo-music-pc/…`)*

Supprimer ces fichiers réinitialise l'application à ses valeurs par défaut.

## 🔒 Vie privée & sécurité

- Les requêtes de tracking (Google Analytics, Sentry) sont bloquées au niveau réseau, avant même de quitter l'application.
- Le **Mode privé** Discord permet d'écouter sans exposer le titre du morceau à vos amis.
- Aucune donnée (compte, morceaux écoutés, thèmes) n'est envoyée à un serveur tiers par cette application : tout reste local, à l'exception du strict nécessaire à la Rich Presence Discord (qui transite uniquement en local vers le client Discord installé sur votre machine).
- L'authentification Nintendo Switch Online se fait entièrement sur les serveurs officiels de Nintendo, cette application ne fait qu'afficher leur site dans une fenêtre dédiée.

## 🐛 Dépannage (FAQ)

**La lecture ne démarre pas / erreur DRM `9012-4001`**
Vérifiez que vous utilisez bien le build fourni (Electron Castlabs). Si vous compilez vous-même, n'installez pas un Electron standard à la place de la dépendance déclarée dans `package.json`.

**Discord n'affiche rien**
Assurez-vous que l'application Discord (desktop) est bien lancée *avant* ou pendant l'utilisation du client, et que `Discord ▸ Enable Rich Presence` est coché. La connexion IPC se fait automatiquement au démarrage puis retente régulièrement en cas d'échec.

**Les notifications ne s'affichent pas**
Vérifiez `Système ▸ Show Track Notifications`, ainsi que les autorisations de notification de votre système d'exploitation pour l'application.

**Mon thème custom CSS ne s'applique plus après un redémarrage**
Le CSS custom et le thème actif sont automatiquement réappliqués au chargement de la page ; si le site a changé sa structure/ses variables entre-temps, il peut être nécessaire d'ajuster votre CSS dans l'éditeur.

## 🤝 Contribuer

Les *issues* et *pull requests* sont les bienvenues : rapport de bug, idée de fonctionnalité, nouveau thème à partager, correctif de compatibilité avec une mise à jour du site officiel...

1. Forkez le dépôt
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements
4. Ouvrez une Pull Request

## 🙏 Remerciements

- [Nintendo](https://www.nintendo.com/) pour Nintendo Music — tous les morceaux, jeux et marques cités restent la propriété de leurs ayants droit respectifs.
- [Castlabs](https://github.com/castlabs/electron-releases) pour leur build d'Electron avec support Widevine.
- La communauté Discord pour la documentation du protocole IPC Rich Presence.

## 📄 Licence

Projet personnel non-officiel, fourni tel quel, sans garantie. Tous les éléments visuels et musicaux affichés par l'application appartiennent à Nintendo ; ce dépôt ne distribue que le code du client.

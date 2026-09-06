/*
 * Nintendo Music PC — unofficial desktop client for Nintendo Music
 * Copyright (C) 2026 Axolat
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details. You should have received a copy of the GNU General Public
 * License along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Not affiliated with Nintendo Co., Ltd.
 */

const { app, BrowserWindow, session, components, globalShortcut, Tray, Menu, Notification, nativeImage, ipcMain, dialog } = require('electron');
const net = require('net');
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {

  // ==========================================
  // CONFIGURATION & SAVES
  // ==========================================
  const configPath = path.join(app.getPath('userData'), 'nintendo-music-config.json');
  const customThemesPath = path.join(app.getPath('userData'), 'nintendo-music-custom-themes.json');

  const defaultConfig = {
    rpcEnabled: true,
    rpcPrivateMode: false,
    notificationsEnabled: true,
    perfMode: false,
    pageCacheEnabled: true,
    customLoader: true,
    loaderFacts: true,
    language: null,
    theme: 'dark',
    borderRadius: 'default',
    autoStart: false,
    startMinimized: false,
    alwaysOnTop: false,
    hardwareAccel: true,
    customCSS: '',
    customCSSEnabled: false,
    activeCustomTheme: null,
    redesignEnabled: false,
    redesign: {
      density: 'normal',
      cardRadius: 12,
      coverFix: true,
      hoverEffects: true,
      customScrollbar: true,
      stickyHeaders: true,
      accent: null
    },
    blockers: {
      baasAnalytics: true,
      googlePubsub: true,
      googleAnalytics: true,
      sentry: true
    }
  };

  let config = { ...defaultConfig };

  let customThemes = {};

  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Fusion en profondeur pour les sous-objets, sinon une config plus
      // ancienne écraserait les nouvelles clés par un objet incomplet.
      config = {
        ...defaultConfig,
        ...saved,
        redesign: { ...defaultConfig.redesign, ...(saved.redesign || {}) },
        blockers: { ...defaultConfig.blockers, ...(saved.blockers || {}) }
      };
    }
  } catch (e) {
    console.error("Config load error:", e);
  }

  try {
    if (fs.existsSync(customThemesPath)) {
      customThemes = JSON.parse(fs.readFileSync(customThemesPath, 'utf8'));
    }
  } catch (e) {
    console.error("Custom themes load error:", e);
  }

  function saveConfig() {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error("Config save error:", e);
    }
  }

  function saveCustomThemes() {
    try {
      fs.writeFileSync(customThemesPath, JSON.stringify(customThemes, null, 2));
    } catch (e) {
      console.error("Custom themes save error:", e);
    }
  }

  // ==========================================
  // TRADUCTIONS
  // ==========================================
  const LANGUAGES = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'it', label: 'Italiano' },
    { code: 'ja', label: '日本語' }
  ];

  const TRANSLATIONS = {
    fr: {
      'menu.settings': 'Paramètres', 'menu.openSettings': 'Ouvrir les paramètres…',
      'menu.navigation': 'Navigation', 'menu.home': 'Accueil', 'menu.reload': 'Recharger', 'menu.quit': 'Quitter',
      'menu.appearance': 'Apparence', 'menu.theme': 'Thème', 'menu.dark': 'Sombre (défaut)', 'menu.light': 'Clair',
      'menu.purple': 'Violet profond', 'menu.customThemes': 'Thèmes personnalisés', 'menu.noCustomTheme': 'Aucun thème personnalisé',
      'menu.themeEditor': 'Éditeur de thèmes…', 'menu.borderRadius': 'Arrondi des bords', 'menu.radiusDefault': 'Défaut (site)',
      'menu.alwaysOnTop': 'Toujours au premier plan', 'menu.discord': 'Discord', 'menu.enableRPC': 'Activer la Rich Presence',
      'menu.privateMode': 'Mode privé (masquer le morceau)', 'menu.system': 'Système', 'menu.notifications': 'Notifications de morceau',
      'menu.runAtStartup': 'Lancer au démarrage', 'menu.startMinimized': 'Démarrer réduit dans la zone de notification',
      'menu.hardwareAccel': 'Accélération matérielle (redémarrage requis)',
      'tray.showHide': 'Afficher / Masquer', 'tray.playPause': 'Lecture / Pause', 'tray.nextTrack': 'Morceau suivant',
      'settings.title': 'Paramètres', 'tab.performance': 'Performance', 'tab.privacy': 'Confidentialité',
      'tab.redesign': 'Redesign', 'tab.discord': 'Discord', 'tab.system': 'Système', 'tab.language': 'Langue', 'tab.about': 'À propos',
      'perf.presets': 'Préréglages', 'perf.presetNative': 'Fidèle au site', 'perf.presetNativeDesc': 'Aucune optimisation, le site tel quel.',
      'perf.presetBalanced': 'Équilibré', 'perf.presetBalancedDesc': 'Cache des pages + blocage de la télémétrie. Recommandé.',
      'perf.presetMax': 'Performance max', 'perf.presetMaxDesc': 'Tout activé, y compris les options expérimentales.',
      'perf.fluidMode': 'Mode fluide', 'perf.fluidDesc': 'Compositing GPU des éléments animés et suppression des brides de fréquence d\'images de Chromium.',
      'perf.pageCache': 'Cache des pages', 'perf.pageCacheDesc': 'Le HTML des pages repart en réseau à chaque ouverture (le site envoie max-age=0). Le mettre en cache évite cet aller-retour. Les API et jetons ne sont jamais mis en cache.',
      'perf.clearCache': 'Vider le cache', 'perf.cacheCleared': 'Cache vidé',
      'privacy.desc': 'Requêtes de télémétrie mesurées sur une session connectée : environ 28 par chargement de page, certaines entre 400 et 600 ms.',
      'privacy.baas': 'Analytique Nintendo (BaaS bigdata)', 'privacy.baasDesc': '13 requêtes par chargement. L\'authentification sur le même domaine n\'est pas touchée.',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '15 publications d\'événements analytiques par chargement.',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry (rapports d\'erreur)',
      'privacy.blocked': 'Requêtes bloquées depuis le lancement',
      'redesign.enable': 'Activer le redesign', 'redesign.desc': 'Retouche l\'interface du site. Chaque option est réversible instantanément.',
      'redesign.density': 'Densité', 'redesign.compact': 'Compact', 'redesign.normal': 'Normal', 'redesign.spacious': 'Aéré',
      'redesign.densityDesc': 'Le site laisse 48 px entre les cartes ; réduire cet espace affiche nettement plus de contenu.',
      'redesign.radius': 'Arrondi des pochettes', 'redesign.coverFix': 'Corriger la déformation des pochettes',
      'redesign.coverFixDesc': 'Le site utilise object-fit: fill, ce qui étire les images non carrées. Passe en cover.',
      'redesign.hover': 'Effets au survol', 'redesign.hoverDesc': 'Léger zoom et surélévation des cartes au survol.',
      'redesign.scrollbar': 'Barre de défilement redessinée', 'redesign.stickyHeaders': 'Titres de section collants',
      'redesign.accent': 'Couleur d\'accentuation', 'redesign.accentDefault': 'Garder le rouge Nintendo',
      'common.restartNeeded': 'Redémarrage requis', 'common.restartNow': 'Redémarrer maintenant', 'common.close': 'Fermer',
      'common.enabled': 'Activé', 'common.disabled': 'Désactivé', 'common.applied': 'Appliqué',
      'lang.desc': 'Langue de l\'application. Le site Nintendo Music garde sa propre langue.',
      'lang.auto': 'Automatique (système)',
      'about.desc': 'Client de bureau non-officiel pour Nintendo Music. Non affilié à Nintendo.',
      'loader.title': 'Écran de chargement', 'loader.enable': 'Écran de chargement personnalisé', 'loader.enableDesc': 'Remplace les trois points du site par une animation du client pendant le démarrage.', 'loader.facts': 'Anecdotes pendant le chargement', 'loader.factsDesc': 'Affiche en bas, discrètement, des infos sur Nintendo et sur les mesures faites sur le site.',
      'perf.lead': 'Réglages mesurés sur le site réel. Chaque option indique ce qu\'elle change.',
      'perf.clearCacheDesc': 'Force le rechargement complet des pages depuis le serveur.',
      'editor.title': 'Éditeur de thèmes', 'editor.newTheme': 'Nouveau thème', 'editor.duplicate': 'Dupliquer',
      'editor.apply': 'Appliquer', 'editor.save': 'Enregistrer', 'editor.delete': 'Supprimer',
      'editor.noThemes': 'Aucun thème pour l\'instant', 'editor.themeName': 'Nom du thème',
      'editor.confirmDelete': 'Supprimer ce thème ?', 'editor.namePrompt': 'Nom du thème :',
      'editor.saveAsTheme': 'Enregistrer comme thème', 'editor.invalidJson': 'JSON invalide',
      'editor.saved': 'Enregistré', 'editor.chars': 'caractères', 'editor.drop': 'Glisser-déposer ou cliquer',
      'editor.exportThemes': 'Thèmes (.json)', 'editor.exportCss': 'CSS actuel (.css)',
      'editor.siteVars': 'Variables CSS du site', 'editor.varsHint': 'Suffixer chaque valeur par',
      'editor.colorAccent': 'Accent', 'editor.colorBg': 'Fond', 'editor.colorText': 'Texte',
      'editor.preview': 'Aperçu', 'editor.cssInjected': 'CSS injecté dans Nintendo Music'
    },
    en: {
      'menu.settings': 'Settings', 'menu.openSettings': 'Open settings…',
      'menu.navigation': 'Navigation', 'menu.home': 'Home', 'menu.reload': 'Reload', 'menu.quit': 'Quit',
      'menu.appearance': 'Appearance', 'menu.theme': 'Theme', 'menu.dark': 'Dark (default)', 'menu.light': 'Light',
      'menu.purple': 'Deep purple', 'menu.customThemes': 'Custom themes', 'menu.noCustomTheme': 'No custom theme',
      'menu.themeEditor': 'Theme editor…', 'menu.borderRadius': 'Border radius', 'menu.radiusDefault': 'Default (site)',
      'menu.alwaysOnTop': 'Always on top', 'menu.discord': 'Discord', 'menu.enableRPC': 'Enable Rich Presence',
      'menu.privateMode': 'Private mode (hide track)', 'menu.system': 'System', 'menu.notifications': 'Track notifications',
      'menu.runAtStartup': 'Run at startup', 'menu.startMinimized': 'Start minimized to tray',
      'menu.hardwareAccel': 'Hardware acceleration (restart required)',
      'tray.showHide': 'Show / Hide', 'tray.playPause': 'Play / Pause', 'tray.nextTrack': 'Next track',
      'settings.title': 'Settings', 'tab.performance': 'Performance', 'tab.privacy': 'Privacy',
      'tab.redesign': 'Redesign', 'tab.discord': 'Discord', 'tab.system': 'System', 'tab.language': 'Language', 'tab.about': 'About',
      'perf.presets': 'Presets', 'perf.presetNative': 'Untouched', 'perf.presetNativeDesc': 'No optimisation, the site as-is.',
      'perf.presetBalanced': 'Balanced', 'perf.presetBalancedDesc': 'Page cache + telemetry blocking. Recommended.',
      'perf.presetMax': 'Max performance', 'perf.presetMaxDesc': 'Everything on, including experimental options.',
      'perf.fluidMode': 'Fluid mode', 'perf.fluidDesc': 'GPU compositing for animated elements and removal of Chromium frame-rate throttling.',
      'perf.pageCache': 'Page cache', 'perf.pageCacheDesc': 'Page HTML goes to the network on every open (the site sends max-age=0). Caching it removes that round trip. APIs and tokens are never cached.',
      'perf.clearCache': 'Clear cache', 'perf.cacheCleared': 'Cache cleared',
      'privacy.desc': 'Telemetry measured on a signed-in session: about 28 requests per page load, some taking 400-600 ms.',
      'privacy.baas': 'Nintendo analytics (BaaS bigdata)', 'privacy.baasDesc': '13 requests per load. Authentication on the same domain is untouched.',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '15 analytics event publishes per load.',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry (error reporting)',
      'privacy.blocked': 'Requests blocked since launch',
      'redesign.enable': 'Enable redesign', 'redesign.desc': 'Restyles the site interface. Every option is instantly reversible.',
      'redesign.density': 'Density', 'redesign.compact': 'Compact', 'redesign.normal': 'Normal', 'redesign.spacious': 'Spacious',
      'redesign.densityDesc': 'The site leaves 48 px between cards; tightening it shows noticeably more content.',
      'redesign.radius': 'Artwork corner radius', 'redesign.coverFix': 'Fix stretched artwork',
      'redesign.coverFixDesc': 'The site uses object-fit: fill, which stretches non-square images. Switches to cover.',
      'redesign.hover': 'Hover effects', 'redesign.hoverDesc': 'Subtle zoom and lift on cards when hovered.',
      'redesign.scrollbar': 'Restyled scrollbar', 'redesign.stickyHeaders': 'Sticky section titles',
      'redesign.accent': 'Accent colour', 'redesign.accentDefault': 'Keep Nintendo red',
      'common.restartNeeded': 'Restart required', 'common.restartNow': 'Restart now', 'common.close': 'Close',
      'common.enabled': 'Enabled', 'common.disabled': 'Disabled', 'common.applied': 'Applied',
      'lang.desc': 'Application language. The Nintendo Music site keeps its own language.',
      'lang.auto': 'Automatic (system)',
      'about.desc': 'Unofficial desktop client for Nintendo Music. Not affiliated with Nintendo.',
      'loader.title': 'Loading screen', 'loader.enable': 'Custom loading screen', 'loader.enableDesc': 'Replaces the three dots from the site with a client animation during startup.', 'loader.facts': 'Facts while loading', 'loader.factsDesc': 'Quietly shows notes about Nintendo and about what was measured on the site.',
      'perf.lead': 'Settings measured against the real site. Each option states what it changes.',
      'perf.clearCacheDesc': 'Forces a full page reload straight from the server.',
      'editor.title': 'Theme editor', 'editor.newTheme': 'New theme', 'editor.duplicate': 'Duplicate',
      'editor.apply': 'Apply', 'editor.save': 'Save', 'editor.delete': 'Delete',
      'editor.noThemes': 'No themes yet', 'editor.themeName': 'Theme name',
      'editor.confirmDelete': 'Delete this theme?', 'editor.namePrompt': 'Theme name:',
      'editor.saveAsTheme': 'Save as theme', 'editor.invalidJson': 'Invalid JSON',
      'editor.saved': 'Saved', 'editor.chars': 'characters', 'editor.drop': 'Drop a file or click',
      'editor.exportThemes': 'Themes (.json)', 'editor.exportCss': 'Current CSS (.css)',
      'editor.siteVars': 'Site CSS variables', 'editor.varsHint': 'Append to each value:',
      'editor.colorAccent': 'Accent', 'editor.colorBg': 'Background', 'editor.colorText': 'Text',
      'editor.preview': 'Preview', 'editor.cssInjected': 'CSS injected into Nintendo Music'
    },
    es: {
      'menu.settings': 'Ajustes', 'menu.openSettings': 'Abrir ajustes…',
      'menu.navigation': 'Navegación', 'menu.home': 'Inicio', 'menu.reload': 'Recargar', 'menu.quit': 'Salir',
      'menu.appearance': 'Apariencia', 'menu.theme': 'Tema', 'menu.dark': 'Oscuro (predeterminado)', 'menu.light': 'Claro',
      'menu.purple': 'Púrpura profundo', 'menu.customThemes': 'Temas personalizados', 'menu.noCustomTheme': 'Ningún tema personalizado',
      'menu.themeEditor': 'Editor de temas…', 'menu.borderRadius': 'Redondeo de bordes', 'menu.radiusDefault': 'Predeterminado (sitio)',
      'menu.alwaysOnTop': 'Siempre visible', 'menu.discord': 'Discord', 'menu.enableRPC': 'Activar Rich Presence',
      'menu.privateMode': 'Modo privado (ocultar pista)', 'menu.system': 'Sistema', 'menu.notifications': 'Notificaciones de pista',
      'menu.runAtStartup': 'Iniciar con el sistema', 'menu.startMinimized': 'Iniciar minimizado en la bandeja',
      'menu.hardwareAccel': 'Aceleración por hardware (requiere reinicio)',
      'tray.showHide': 'Mostrar / Ocultar', 'tray.playPause': 'Reproducir / Pausa', 'tray.nextTrack': 'Pista siguiente',
      'settings.title': 'Ajustes', 'tab.performance': 'Rendimiento', 'tab.privacy': 'Privacidad',
      'tab.redesign': 'Rediseño', 'tab.discord': 'Discord', 'tab.system': 'Sistema', 'tab.language': 'Idioma', 'tab.about': 'Acerca de',
      'perf.presets': 'Ajustes rápidos', 'perf.presetNative': 'Sitio original', 'perf.presetNativeDesc': 'Sin optimizaciones, el sitio tal cual.',
      'perf.presetBalanced': 'Equilibrado', 'perf.presetBalancedDesc': 'Caché de páginas + bloqueo de telemetría. Recomendado.',
      'perf.presetMax': 'Rendimiento máximo', 'perf.presetMaxDesc': 'Todo activado, incluidas las opciones experimentales.',
      'perf.fluidMode': 'Modo fluido', 'perf.fluidDesc': 'Compositing por GPU de los elementos animados y eliminación de los límites de fotogramas de Chromium.',
      'perf.pageCache': 'Caché de páginas', 'perf.pageCacheDesc': 'El HTML va a la red en cada apertura (el sitio envía max-age=0). Guardarlo en caché evita ese viaje. Las API y los tokens nunca se almacenan.',
      'perf.clearCache': 'Vaciar la caché', 'perf.cacheCleared': 'Caché vaciada',
      'privacy.desc': 'Telemetría medida en una sesión con sesión iniciada: unas 28 peticiones por carga, algunas de 400 a 600 ms.',
      'privacy.baas': 'Analítica de Nintendo (BaaS bigdata)', 'privacy.baasDesc': '13 peticiones por carga. La autenticación del mismo dominio no se toca.',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '15 envíos de eventos analíticos por carga.',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry (informes de errores)',
      'privacy.blocked': 'Peticiones bloqueadas desde el inicio',
      'redesign.enable': 'Activar el rediseño', 'redesign.desc': 'Rediseña la interfaz del sitio. Cada opción es reversible al instante.',
      'redesign.density': 'Densidad', 'redesign.compact': 'Compacta', 'redesign.normal': 'Normal', 'redesign.spacious': 'Amplia',
      'redesign.densityDesc': 'El sitio deja 48 px entre tarjetas; reducirlo muestra bastante más contenido.',
      'redesign.radius': 'Redondeo de las carátulas', 'redesign.coverFix': 'Corregir carátulas deformadas',
      'redesign.coverFixDesc': 'El sitio usa object-fit: fill, que estira las imágenes no cuadradas. Cambia a cover.',
      'redesign.hover': 'Efectos al pasar el ratón', 'redesign.hoverDesc': 'Ligero zoom y elevación de las tarjetas.',
      'redesign.scrollbar': 'Barra de desplazamiento rediseñada', 'redesign.stickyHeaders': 'Títulos de sección fijos',
      'redesign.accent': 'Color de acento', 'redesign.accentDefault': 'Mantener el rojo de Nintendo',
      'common.restartNeeded': 'Requiere reinicio', 'common.restartNow': 'Reiniciar ahora', 'common.close': 'Cerrar',
      'common.enabled': 'Activado', 'common.disabled': 'Desactivado', 'common.applied': 'Aplicado',
      'lang.desc': 'Idioma de la aplicación. El sitio de Nintendo Music conserva el suyo.',
      'lang.auto': 'Automático (sistema)',
      'about.desc': 'Cliente de escritorio no oficial para Nintendo Music. Sin afiliación con Nintendo.',
      'loader.title': 'Pantalla de carga', 'loader.enable': 'Pantalla de carga personalizada', 'loader.enableDesc': 'Sustituye los tres puntos del sitio por una animación del cliente durante el arranque.', 'loader.facts': 'Curiosidades durante la carga', 'loader.factsDesc': 'Muestra discretamente datos sobre Nintendo y sobre lo medido en el sitio.',
      'perf.lead': 'Ajustes medidos sobre el sitio real. Cada opción indica qué cambia.',
      'perf.clearCacheDesc': 'Fuerza una recarga completa de las páginas desde el servidor.',
      'editor.title': 'Editor de temas', 'editor.newTheme': 'Nuevo tema', 'editor.duplicate': 'Duplicar',
      'editor.apply': 'Aplicar', 'editor.save': 'Guardar', 'editor.delete': 'Eliminar',
      'editor.noThemes': 'Todavía no hay temas', 'editor.themeName': 'Nombre del tema',
      'editor.confirmDelete': '¿Eliminar este tema?', 'editor.namePrompt': 'Nombre del tema:',
      'editor.saveAsTheme': 'Guardar como tema', 'editor.invalidJson': 'JSON no válido',
      'editor.saved': 'Guardado', 'editor.chars': 'caracteres', 'editor.drop': 'Arrastra un archivo o haz clic',
      'editor.exportThemes': 'Temas (.json)', 'editor.exportCss': 'CSS actual (.css)',
      'editor.siteVars': 'Variables CSS del sitio', 'editor.varsHint': 'Añade a cada valor:',
      'editor.colorAccent': 'Acento', 'editor.colorBg': 'Fondo', 'editor.colorText': 'Texto',
      'editor.preview': 'Vista previa', 'editor.cssInjected': 'CSS inyectado en Nintendo Music'
    },
    de: {
      'menu.settings': 'Einstellungen', 'menu.openSettings': 'Einstellungen öffnen…',
      'menu.navigation': 'Navigation', 'menu.home': 'Startseite', 'menu.reload': 'Neu laden', 'menu.quit': 'Beenden',
      'menu.appearance': 'Darstellung', 'menu.theme': 'Design', 'menu.dark': 'Dunkel (Standard)', 'menu.light': 'Hell',
      'menu.purple': 'Tiefes Violett', 'menu.customThemes': 'Eigene Designs', 'menu.noCustomTheme': 'Kein eigenes Design',
      'menu.themeEditor': 'Design-Editor…', 'menu.borderRadius': 'Eckenradius', 'menu.radiusDefault': 'Standard (Website)',
      'menu.alwaysOnTop': 'Immer im Vordergrund', 'menu.discord': 'Discord', 'menu.enableRPC': 'Rich Presence aktivieren',
      'menu.privateMode': 'Privatmodus (Titel verbergen)', 'menu.system': 'System', 'menu.notifications': 'Titel-Benachrichtigungen',
      'menu.runAtStartup': 'Mit System starten', 'menu.startMinimized': 'Minimiert im Infobereich starten',
      'menu.hardwareAccel': 'Hardwarebeschleunigung (Neustart nötig)',
      'tray.showHide': 'Anzeigen / Verbergen', 'tray.playPause': 'Wiedergabe / Pause', 'tray.nextTrack': 'Nächster Titel',
      'settings.title': 'Einstellungen', 'tab.performance': 'Leistung', 'tab.privacy': 'Datenschutz',
      'tab.redesign': 'Redesign', 'tab.discord': 'Discord', 'tab.system': 'System', 'tab.language': 'Sprache', 'tab.about': 'Über',
      'perf.presets': 'Voreinstellungen', 'perf.presetNative': 'Unverändert', 'perf.presetNativeDesc': 'Keine Optimierung, die Website wie sie ist.',
      'perf.presetBalanced': 'Ausgewogen', 'perf.presetBalancedDesc': 'Seiten-Cache + Telemetrie-Blockierung. Empfohlen.',
      'perf.presetMax': 'Maximale Leistung', 'perf.presetMaxDesc': 'Alles aktiv, inklusive experimenteller Optionen.',
      'perf.fluidMode': 'Flüssig-Modus', 'perf.fluidDesc': 'GPU-Compositing animierter Elemente und Aufheben der Bildraten-Drosselung von Chromium.',
      'perf.pageCache': 'Seiten-Cache', 'perf.pageCacheDesc': 'Das Seiten-HTML geht bei jedem Öffnen ins Netz (die Website sendet max-age=0). Zwischenspeichern spart diesen Umweg. APIs und Tokens werden nie zwischengespeichert.',
      'perf.clearCache': 'Cache leeren', 'perf.cacheCleared': 'Cache geleert',
      'privacy.desc': 'In einer angemeldeten Sitzung gemessene Telemetrie: rund 28 Anfragen pro Seitenaufruf, einige mit 400-600 ms.',
      'privacy.baas': 'Nintendo-Analytik (BaaS bigdata)', 'privacy.baasDesc': '13 Anfragen pro Aufruf. Die Anmeldung auf derselben Domain bleibt unberührt.',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '15 Analytik-Ereignisse pro Aufruf.',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry (Fehlerberichte)',
      'privacy.blocked': 'Seit dem Start blockierte Anfragen',
      'redesign.enable': 'Redesign aktivieren', 'redesign.desc': 'Gestaltet die Oberfläche der Website um. Jede Option ist sofort umkehrbar.',
      'redesign.density': 'Dichte', 'redesign.compact': 'Kompakt', 'redesign.normal': 'Normal', 'redesign.spacious': 'Luftig',
      'redesign.densityDesc': 'Die Website lässt 48 px zwischen den Karten; weniger Abstand zeigt deutlich mehr Inhalt.',
      'redesign.radius': 'Eckenradius der Cover', 'redesign.coverFix': 'Verzerrte Cover korrigieren',
      'redesign.coverFixDesc': 'Die Website nutzt object-fit: fill und verzerrt damit nicht quadratische Bilder. Wechselt zu cover.',
      'redesign.hover': 'Hover-Effekte', 'redesign.hoverDesc': 'Dezentes Zoomen und Anheben der Karten.',
      'redesign.scrollbar': 'Neu gestaltete Bildlaufleiste', 'redesign.stickyHeaders': 'Fixierte Abschnittstitel',
      'redesign.accent': 'Akzentfarbe', 'redesign.accentDefault': 'Nintendo-Rot behalten',
      'common.restartNeeded': 'Neustart erforderlich', 'common.restartNow': 'Jetzt neu starten', 'common.close': 'Schließen',
      'common.enabled': 'Aktiv', 'common.disabled': 'Inaktiv', 'common.applied': 'Angewendet',
      'lang.desc': 'Sprache der Anwendung. Die Nintendo-Music-Website behält ihre eigene Sprache.',
      'lang.auto': 'Automatisch (System)',
      'about.desc': 'Inoffizieller Desktop-Client für Nintendo Music. Nicht mit Nintendo verbunden.',
      'loader.title': 'Ladebildschirm', 'loader.enable': 'Eigener Ladebildschirm', 'loader.enableDesc': 'Ersetzt die drei Punkte der Website beim Start durch eine Animation des Clients.', 'loader.facts': 'Wissenswertes beim Laden', 'loader.factsDesc': 'Zeigt dezent Hinweise zu Nintendo und zu den Messungen an der Website.',
      'perf.lead': 'An der echten Website gemessene Einstellungen. Jede Option nennt ihre Wirkung.',
      'perf.clearCacheDesc': 'Erzwingt das vollständige Neuladen der Seiten vom Server.',
      'editor.title': 'Design-Editor', 'editor.newTheme': 'Neues Design', 'editor.duplicate': 'Duplizieren',
      'editor.apply': 'Anwenden', 'editor.save': 'Speichern', 'editor.delete': 'Löschen',
      'editor.noThemes': 'Noch keine Designs', 'editor.themeName': 'Name des Designs',
      'editor.confirmDelete': 'Dieses Design löschen?', 'editor.namePrompt': 'Name des Designs:',
      'editor.saveAsTheme': 'Als Design speichern', 'editor.invalidJson': 'Ungültiges JSON',
      'editor.saved': 'Gespeichert', 'editor.chars': 'Zeichen', 'editor.drop': 'Datei ablegen oder klicken',
      'editor.exportThemes': 'Designs (.json)', 'editor.exportCss': 'Aktuelles CSS (.css)',
      'editor.siteVars': 'CSS-Variablen der Website', 'editor.varsHint': 'An jeden Wert anhängen:',
      'editor.colorAccent': 'Akzent', 'editor.colorBg': 'Hintergrund', 'editor.colorText': 'Text',
      'editor.preview': 'Vorschau', 'editor.cssInjected': 'In Nintendo Music eingefügtes CSS'
    },
    it: {
      'menu.settings': 'Impostazioni', 'menu.openSettings': 'Apri le impostazioni…',
      'menu.navigation': 'Navigazione', 'menu.home': 'Home', 'menu.reload': 'Ricarica', 'menu.quit': 'Esci',
      'menu.appearance': 'Aspetto', 'menu.theme': 'Tema', 'menu.dark': 'Scuro (predefinito)', 'menu.light': 'Chiaro',
      'menu.purple': 'Viola intenso', 'menu.customThemes': 'Temi personalizzati', 'menu.noCustomTheme': 'Nessun tema personalizzato',
      'menu.themeEditor': 'Editor dei temi…', 'menu.borderRadius': 'Arrotondamento dei bordi', 'menu.radiusDefault': 'Predefinito (sito)',
      'menu.alwaysOnTop': 'Sempre in primo piano', 'menu.discord': 'Discord', 'menu.enableRPC': 'Attiva Rich Presence',
      'menu.privateMode': 'Modalità privata (nascondi il brano)', 'menu.system': 'Sistema', 'menu.notifications': 'Notifiche dei brani',
      'menu.runAtStartup': 'Avvia all\'accensione', 'menu.startMinimized': 'Avvia ridotto nell\'area di notifica',
      'menu.hardwareAccel': 'Accelerazione hardware (riavvio necessario)',
      'tray.showHide': 'Mostra / Nascondi', 'tray.playPause': 'Riproduci / Pausa', 'tray.nextTrack': 'Brano successivo',
      'settings.title': 'Impostazioni', 'tab.performance': 'Prestazioni', 'tab.privacy': 'Privacy',
      'tab.redesign': 'Redesign', 'tab.discord': 'Discord', 'tab.system': 'Sistema', 'tab.language': 'Lingua', 'tab.about': 'Informazioni',
      'perf.presets': 'Preimpostazioni', 'perf.presetNative': 'Sito originale', 'perf.presetNativeDesc': 'Nessuna ottimizzazione, il sito così com\'è.',
      'perf.presetBalanced': 'Equilibrato', 'perf.presetBalancedDesc': 'Cache delle pagine + blocco della telemetria. Consigliato.',
      'perf.presetMax': 'Prestazioni massime', 'perf.presetMaxDesc': 'Tutto attivo, comprese le opzioni sperimentali.',
      'perf.fluidMode': 'Modalità fluida', 'perf.fluidDesc': 'Compositing GPU degli elementi animati e rimozione dei limiti di frame rate di Chromium.',
      'perf.pageCache': 'Cache delle pagine', 'perf.pageCacheDesc': 'L\'HTML della pagina passa dalla rete a ogni apertura (il sito invia max-age=0). Metterlo in cache elimina quel viaggio. API e token non vengono mai memorizzati.',
      'perf.clearCache': 'Svuota la cache', 'perf.cacheCleared': 'Cache svuotata',
      'privacy.desc': 'Telemetria misurata su una sessione autenticata: circa 28 richieste per caricamento, alcune da 400 a 600 ms.',
      'privacy.baas': 'Analytics Nintendo (BaaS bigdata)', 'privacy.baasDesc': '13 richieste per caricamento. L\'autenticazione sullo stesso dominio non viene toccata.',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '15 invii di eventi analitici per caricamento.',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry (segnalazione errori)',
      'privacy.blocked': 'Richieste bloccate dall\'avvio',
      'redesign.enable': 'Attiva il redesign', 'redesign.desc': 'Ridisegna l\'interfaccia del sito. Ogni opzione è reversibile all\'istante.',
      'redesign.density': 'Densità', 'redesign.compact': 'Compatta', 'redesign.normal': 'Normale', 'redesign.spacious': 'Ampia',
      'redesign.densityDesc': 'Il sito lascia 48 px tra le schede; ridurli mostra molto più contenuto.',
      'redesign.radius': 'Arrotondamento delle copertine', 'redesign.coverFix': 'Correggi le copertine deformate',
      'redesign.coverFixDesc': 'Il sito usa object-fit: fill, che stira le immagini non quadrate. Passa a cover.',
      'redesign.hover': 'Effetti al passaggio del mouse', 'redesign.hoverDesc': 'Leggero zoom e sollevamento delle schede.',
      'redesign.scrollbar': 'Barra di scorrimento ridisegnata', 'redesign.stickyHeaders': 'Titoli di sezione fissi',
      'redesign.accent': 'Colore d\'accento', 'redesign.accentDefault': 'Mantieni il rosso Nintendo',
      'common.restartNeeded': 'Riavvio necessario', 'common.restartNow': 'Riavvia ora', 'common.close': 'Chiudi',
      'common.enabled': 'Attivo', 'common.disabled': 'Disattivo', 'common.applied': 'Applicato',
      'lang.desc': 'Lingua dell\'applicazione. Il sito Nintendo Music mantiene la propria.',
      'lang.auto': 'Automatica (sistema)',
      'about.desc': 'Client desktop non ufficiale per Nintendo Music. Non affiliato a Nintendo.',
      'loader.title': 'Schermata di caricamento', 'loader.enable': 'Schermata di caricamento personalizzata', 'loader.enableDesc': 'Sostituisce i tre puntini del sito con un\'animazione del client durante l\'avvio.', 'loader.facts': 'Curiosità durante il caricamento', 'loader.factsDesc': 'Mostra con discrezione informazioni su Nintendo e sulle misurazioni fatte sul sito.',
      'perf.lead': 'Impostazioni misurate sul sito reale. Ogni opzione indica cosa cambia.',
      'perf.clearCacheDesc': 'Forza il ricaricamento completo delle pagine dal server.',
      'editor.title': 'Editor dei temi', 'editor.newTheme': 'Nuovo tema', 'editor.duplicate': 'Duplica',
      'editor.apply': 'Applica', 'editor.save': 'Salva', 'editor.delete': 'Elimina',
      'editor.noThemes': 'Ancora nessun tema', 'editor.themeName': 'Nome del tema',
      'editor.confirmDelete': 'Eliminare questo tema?', 'editor.namePrompt': 'Nome del tema:',
      'editor.saveAsTheme': 'Salva come tema', 'editor.invalidJson': 'JSON non valido',
      'editor.saved': 'Salvato', 'editor.chars': 'caratteri', 'editor.drop': 'Trascina un file o clicca',
      'editor.exportThemes': 'Temi (.json)', 'editor.exportCss': 'CSS attuale (.css)',
      'editor.siteVars': 'Variabili CSS del sito', 'editor.varsHint': 'Aggiungi a ogni valore:',
      'editor.colorAccent': 'Accento', 'editor.colorBg': 'Sfondo', 'editor.colorText': 'Testo',
      'editor.preview': 'Anteprima', 'editor.cssInjected': 'CSS iniettato in Nintendo Music'
    },
    ja: {
      'menu.settings': '設定', 'menu.openSettings': '設定を開く…',
      'menu.navigation': 'ナビゲーション', 'menu.home': 'ホーム', 'menu.reload': '再読み込み', 'menu.quit': '終了',
      'menu.appearance': '外観', 'menu.theme': 'テーマ', 'menu.dark': 'ダーク（既定）', 'menu.light': 'ライト',
      'menu.purple': 'ディープパープル', 'menu.customThemes': 'カスタムテーマ', 'menu.noCustomTheme': 'カスタムテーマなし',
      'menu.themeEditor': 'テーマエディター…', 'menu.borderRadius': '角の丸み', 'menu.radiusDefault': '既定（サイト）',
      'menu.alwaysOnTop': '常に手前に表示', 'menu.discord': 'Discord', 'menu.enableRPC': 'リッチプレゼンスを有効にする',
      'menu.privateMode': 'プライベートモード（曲名を隠す）', 'menu.system': 'システム', 'menu.notifications': '曲の通知',
      'menu.runAtStartup': 'スタートアップで起動', 'menu.startMinimized': '最小化して通知領域で起動',
      'menu.hardwareAccel': 'ハードウェアアクセラレーション（再起動が必要）',
      'tray.showHide': '表示 / 非表示', 'tray.playPause': '再生 / 一時停止', 'tray.nextTrack': '次の曲',
      'settings.title': '設定', 'tab.performance': 'パフォーマンス', 'tab.privacy': 'プライバシー',
      'tab.redesign': 'デザイン変更', 'tab.discord': 'Discord', 'tab.system': 'システム', 'tab.language': '言語', 'tab.about': '情報',
      'perf.presets': 'プリセット', 'perf.presetNative': 'サイトのまま', 'perf.presetNativeDesc': '最適化なし。サイトをそのまま表示します。',
      'perf.presetBalanced': 'バランス', 'perf.presetBalancedDesc': 'ページキャッシュ＋テレメトリのブロック。推奨。',
      'perf.presetMax': '最大パフォーマンス', 'perf.presetMaxDesc': '実験的な項目を含め、すべて有効にします。',
      'perf.fluidMode': 'なめらかモード', 'perf.fluidDesc': 'アニメーション要素をGPUで合成し、Chromiumのフレームレート制限を解除します。',
      'perf.pageCache': 'ページキャッシュ', 'perf.pageCacheDesc': 'サイトが max-age=0 を返すため、ページのHTMLは開くたびに通信が発生します。キャッシュすればその往復を省けます。APIとトークンはキャッシュしません。',
      'perf.clearCache': 'キャッシュを消去', 'perf.cacheCleared': 'キャッシュを消去しました',
      'privacy.desc': 'ログイン状態で計測したテレメトリ：1ページの読み込みあたり約28件、うち数件は400〜600ミリ秒かかります。',
      'privacy.baas': '任天堂の解析（BaaS bigdata）', 'privacy.baasDesc': '読み込みごとに13件。同じドメインの認証には影響しません。',
      'privacy.pubsub': 'Google Pub/Sub', 'privacy.pubsubDesc': '読み込みごとに15件の解析イベント送信。',
      'privacy.ga': 'Google Analytics', 'privacy.sentry': 'Sentry（エラー報告）',
      'privacy.blocked': '起動後にブロックしたリクエスト',
      'redesign.enable': 'デザイン変更を有効にする', 'redesign.desc': 'サイトの見た目を調整します。各項目はいつでも元に戻せます。',
      'redesign.density': '表示密度', 'redesign.compact': 'コンパクト', 'redesign.normal': '標準', 'redesign.spacious': 'ゆったり',
      'redesign.densityDesc': 'サイトはカード間に48pxの余白を取っています。詰めると表示できる件数が増えます。',
      'redesign.radius': 'ジャケットの角丸', 'redesign.coverFix': 'ジャケットの歪みを補正',
      'redesign.coverFixDesc': 'サイトは object-fit: fill を使うため正方形でない画像が伸びます。cover に変更します。',
      'redesign.hover': 'ホバー効果', 'redesign.hoverDesc': 'カードをわずかに拡大し、浮き上がらせます。',
      'redesign.scrollbar': 'スクロールバーの再デザイン', 'redesign.stickyHeaders': 'セクション見出しを固定',
      'redesign.accent': 'アクセントカラー', 'redesign.accentDefault': '任天堂レッドのまま',
      'common.restartNeeded': '再起動が必要', 'common.restartNow': '今すぐ再起動', 'common.close': '閉じる',
      'common.enabled': '有効', 'common.disabled': '無効', 'common.applied': '適用しました',
      'lang.desc': 'アプリの表示言語です。Nintendo Music のサイト自体の言語は変わりません。',
      'lang.auto': '自動（システム）',
      'about.desc': 'Nintendo Music の非公式デスクトップクライアントです。任天堂とは関係ありません。',
      'loader.title': '読み込み画面', 'loader.enable': 'カスタム読み込み画面', 'loader.enableDesc': '起動中、サイトの3つの点をクライアント独自のアニメーションに置き換えます。', 'loader.facts': '読み込み中の豆知識', 'loader.factsDesc': '任天堂やサイトの計測結果に関する情報を、控えめに表示します。',
      'perf.lead': '実際のサイトを計測して選んだ設定です。各項目に効果を明記しています。',
      'perf.clearCacheDesc': 'サーバーからページを完全に読み込み直します。',
      'editor.title': 'テーマエディター', 'editor.newTheme': '新しいテーマ', 'editor.duplicate': '複製',
      'editor.apply': '適用', 'editor.save': '保存', 'editor.delete': '削除',
      'editor.noThemes': 'テーマがありません', 'editor.themeName': 'テーマ名',
      'editor.confirmDelete': 'このテーマを削除しますか？', 'editor.namePrompt': 'テーマ名：',
      'editor.saveAsTheme': 'テーマとして保存', 'editor.invalidJson': 'JSON が不正です',
      'editor.saved': '保存しました', 'editor.chars': '文字', 'editor.drop': 'ファイルをドロップ、またはクリック',
      'editor.exportThemes': 'テーマ (.json)', 'editor.exportCss': '現在の CSS (.css)',
      'editor.siteVars': 'サイトの CSS 変数', 'editor.varsHint': '各値の末尾に付けてください：',
      'editor.colorAccent': 'アクセント', 'editor.colorBg': '背景', 'editor.colorText': 'テキスト',
      'editor.preview': 'プレビュー', 'editor.cssInjected': 'Nintendo Music に注入される CSS'
    }
  };

  function resolveLanguage() {
    if (config.language && TRANSLATIONS[config.language]) return config.language;
    const sys = (app.getLocale() || 'en').slice(0, 2).toLowerCase();
    return TRANSLATIONS[sys] ? sys : 'en';
  }

  function t(key) {
    const lang = resolveLanguage();
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.en[key] || key;
  }

  // ==========================================
  // ELECTRON SYSTEM SETTINGS
  // ==========================================
  if (!config.hardwareAccel) {
    app.disableHardwareAcceleration();
  }

  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-features', 'WebAuthentication');

  // Le site est un Next.js qui sert ~4 Mo de JS répartis en des dizaines de
  // petits chunks (+ ~50 feuilles CSS). Tout est marqué "immutable" côté
  // serveur : le vrai coût au démarrage n'est donc pas le téléchargement mais
  // le parse/compile de ce JS. Un cache disque large garde à la fois les
  // chunks ET le code V8 déjà compilé d'un lancement à l'autre.
  app.commandLine.appendSwitch('disk-cache-size', '314572800');

  // Mode Fluide (expérimental) : lève les brides que Chromium impose par défaut
  // pour économiser la batterie, afin que les animations du site tournent au
  // taux de rafraîchissement max et que la fenêtre reste fluide même réduite/
  // en arrière-plan. Ces switches ne prennent effet qu'au démarrage de l'app.
  if (config.perfMode) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    app.commandLine.appendSwitch('disable-gpu-vsync');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
  }

  const customUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  app.userAgentFallback = customUserAgent;

  const CLIENT_ID = '1517925767013601340';
  // Durée de fraîcheur des pages mises en cache (le contenu reste ensuite
  // servi "périmé" puis rafraîchi en tâche de fond pendant 24 h).
  const PAGE_CACHE_TTL_SECONDS = 3600;
  let mainWindow = null;
  let themeEditorWindow = null;
  let settingsWindow = null;
  let splashWindow = null;
  let nintendoSession = null;
  let tray = null;
  let isAppQuitting = false;

  app.setLoginItemSettings({
    openAtLogin: config.autoStart,
    openAsHidden: config.startMinimized
  });

  // ==========================================
  // CSS THEMES & VISUAL CUSTOMIZATION
  // ==========================================
  let currentThemeKey = null;
  let currentRadiusKey = null;
  let currentCustomCSSKey = null;

  const themesCSS = {
    dark: ``,
    light: `
      html { filter: invert(100%) hue-rotate(180deg); background: #ffffff; }
      img, video, iframe, .artwork, canvas, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg); }
    `,
    purple: `
      :root {
        --_1hr2ce00: #f3e8ff !important;
        --_1hr2ce01: #d8b4fea6 !important;
        --_1hr2ce02: #d8b4fe61 !important;
        --_1hr2ce06: #f3e8ff !important;
        --_1hr2ce07: #ffffff !important;
        --_1hr2ce03: #0f0518 !important;
        --_1hr2ce04: #1a0b2e !important;
        --_1hr2ce05: #2e1065 !important;
        --_1hr2ce08: #0f0518 !important;
        --_1hr2ce09: #1a0b2e !important;
        --_1hr2ce0a: #2e1065 !important;
        --_1hr2ce0n: #1a0b2e !important;
        --_1hr2ce0p: #1a0b2e !important;
        --_1hr2ce013: #1a0b2e !important;
        --_1hr2ce015: #1a0b2e !important;
        --_1hr2ce017: #9333ea !important;
        --_1hr2ce018: #2e1065 !important;
        --_1hr2ce0f: #a855f71a !important;
        --_1hr2ce0g: #120420b8 !important;
        --_1hr2ce0h: #120420a3 !important;
        --_1hr2ce0i: #0f051899 !important;
        --_1hr2ce0j: #0f051899 !important;
        --_1hr2ce0l: #0f0518cb !important;
        --_1hr2ce0o: #a855f70a !important;
        --_1hr2ce0q: #a855f714 !important;
        --_1hr2ce0r: #a855f71a !important;
        --_1hr2ce0s: #a855f729 !important;
        --_1hr2ce0t: #a855f71a !important;
        --_1hr2ce0v: #a855f733 !important;
        --_1hr2ce0w: #a855f726 !important;
        --_1hr2ce0k: #00000000 !important;
        --_1hr2ce0x: #1a0b2e00 !important;
        --_1hr2ce0y: #1a0b2e0d !important;
        --_1hr2ce0z: #1a0b2e33 !important;
        --_1hr2ce010: #1a0b2e59 !important;
        --_1hr2ce011: #1a0b2e80 !important;
        --_1hr2ce012: #1a0b2e00 !important;
        --_1hr2ce014: #0f051800 !important;
        --_1hr2ce0b: #a855f7 !important;
        --_1hr2ce0c: #9333ea !important;
        --_1hr2ce016: #a855f74d !important;
        --_1hr2ce0m: #d946ef !important;
        --_1hr2ce0u: #a855f71a !important;
      }
      ::-webkit-scrollbar-thumb { background: #9333ea !important; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: #0f0518 !important; }
      ::-webkit-scrollbar { width: 6px; }
      ::selection { background: #9333ea !important; color: #fff !important; }
      img, video, canvas,
      [class*="image"], [class*="thumbnail"], [class*="artwork"], [class*="cover"], [class*="avatar"] {
        filter: none !important;
        background-color: transparent !important;
      }
    `
  };

  // Génère un thème CSS à partir d'une palette de couleurs custom
  function generateThemeCSS(colors) {
    const { accent, bg1, bg2, bg3, text1, text2 } = colors;

    // Convertit hex en rgba avec opacité
    function hexAlpha(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      return `${hex}${a}`;
    }

    return `
      :root {
        --_1hr2ce00: ${text1} !important;
        --_1hr2ce01: ${hexAlpha(text1, 0.65)} !important;
        --_1hr2ce02: ${hexAlpha(text1, 0.38)} !important;
        --_1hr2ce06: ${text1} !important;
        --_1hr2ce07: #ffffff !important;
        --_1hr2ce03: ${bg1} !important;
        --_1hr2ce04: ${bg2} !important;
        --_1hr2ce05: ${bg3} !important;
        --_1hr2ce08: ${bg1} !important;
        --_1hr2ce09: ${bg2} !important;
        --_1hr2ce0a: ${bg3} !important;
        --_1hr2ce0n: ${bg2} !important;
        --_1hr2ce0p: ${bg2} !important;
        --_1hr2ce013: ${bg2} !important;
        --_1hr2ce015: ${bg2} !important;
        --_1hr2ce017: ${text2} !important;
        --_1hr2ce018: ${bg3} !important;
        --_1hr2ce0f: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0g: ${hexAlpha(bg1, 0.72)} !important;
        --_1hr2ce0h: ${hexAlpha(bg1, 0.64)} !important;
        --_1hr2ce0i: ${hexAlpha(bg1, 0.60)} !important;
        --_1hr2ce0j: ${hexAlpha(bg1, 0.60)} !important;
        --_1hr2ce0l: ${hexAlpha(bg1, 0.80)} !important;
        --_1hr2ce0o: ${hexAlpha(accent, 0.04)} !important;
        --_1hr2ce0q: ${hexAlpha(accent, 0.08)} !important;
        --_1hr2ce0r: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0s: ${hexAlpha(accent, 0.16)} !important;
        --_1hr2ce0t: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0v: ${hexAlpha(accent, 0.20)} !important;
        --_1hr2ce0w: ${hexAlpha(accent, 0.15)} !important;
        --_1hr2ce0k: #00000000 !important;
        --_1hr2ce0x: ${bg2}00 !important;
        --_1hr2ce0y: ${bg2}0d !important;
        --_1hr2ce0z: ${bg2}33 !important;
        --_1hr2ce010: ${bg2}59 !important;
        --_1hr2ce011: ${bg2}80 !important;
        --_1hr2ce012: ${bg2}00 !important;
        --_1hr2ce014: ${bg1}00 !important;
        --_1hr2ce0b: ${accent} !important;
        --_1hr2ce0c: ${accent} !important;
        --_1hr2ce016: ${hexAlpha(accent, 0.30)} !important;
        --_1hr2ce0m: ${accent} !important;
        --_1hr2ce0u: ${hexAlpha(accent, 0.10)} !important;
      }
      ::-webkit-scrollbar-thumb { background: ${accent} !important; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: ${bg1} !important; }
      ::-webkit-scrollbar { width: 6px; }
      ::selection { background: ${accent} !important; color: #fff !important; }
      img, video, canvas,
      [class*="image"], [class*="thumbnail"], [class*="artwork"], [class*="cover"], [class*="avatar"] {
        filter: none !important;
        background-color: transparent !important;
      }
    `;
  }

  // ==========================================
  // THÈMES INTÉGRÉS
  // ==========================================
  // Générés depuis une palette de 6 couleurs par generateThemeCSS, comme les
  // thèmes créés dans l'éditeur : une seule mécanique à maintenir. Les noms
  // restent non traduits, comme le veut l'usage pour des noms de thèmes.
  const BUILT_IN_PALETTES = {
    crimson:  { label: 'Crimson',    colors: { accent: '#e60012', bg1: '#0d0708', bg2: '#17090c', bg3: '#2c1116', text1: '#f6ebec', text2: '#dba7ae' } },
    ocean:    { label: 'Ocean',      colors: { accent: '#38bdf8', bg1: '#04121f', bg2: '#082032', bg3: '#0e3a52', text1: '#e3f2fb', text2: '#9dc9e0' } },
    forest:   { label: 'Forest',     colors: { accent: '#34d399', bg1: '#04140e', bg2: '#08211a', bg3: '#0f3a2c', text1: '#e5f5ed', text2: '#9fd3ba' } },
    amber:    { label: 'Amber',      colors: { accent: '#f59e0b', bg1: '#150e04', bg2: '#211708', bg3: '#3a2810', text1: '#f8f0e3', text2: '#d9bb8a' } },
    rose:     { label: 'Rose',       colors: { accent: '#f472b6', bg1: '#15060f', bg2: '#210b19', bg3: '#3b132b', text1: '#fbe9f3', text2: '#dfa9c6' } },
    nord:     { label: 'Nord',       colors: { accent: '#88c0d0', bg1: '#2e3440', bg2: '#3b4252', bg3: '#434c5e', text1: '#eceff4', text2: '#d8dee9' } },
    dracula:  { label: 'Dracula',    colors: { accent: '#bd93f9', bg1: '#282a36', bg2: '#343746', bg3: '#44475a', text1: '#f8f8f2', text2: '#9aa5ce' } },
    gruvbox:  { label: 'Gruvbox',    colors: { accent: '#fe8019', bg1: '#1d2021', bg2: '#282828', bg3: '#3c3836', text1: '#ebdbb2', text2: '#bdae93' } },
    monochrome: { label: 'Monochrome', colors: { accent: '#a1a1aa', bg1: '#0a0a0a', bg2: '#141414', bg3: '#232323', text1: '#ededed', text2: '#a3a3a3' } }
  };

  for (const [key, theme] of Object.entries(BUILT_IN_PALETTES)) {
    themesCSS[key] = generateThemeCSS(theme.colors);
  }

  async function applyTheme(themeName) {
    config.theme = themeName;
    config.activeCustomTheme = null;
    saveConfig();
    if (!mainWindow) return;

    if (currentThemeKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentThemeKey); } catch (e) {}
      currentThemeKey = null;
    }

    if (themesCSS[themeName]) {
      try { currentThemeKey = await mainWindow.webContents.insertCSS(themesCSS[themeName]); } catch (e) {}
    }

    rebuildMenu();
  }

  async function applyCustomTheme(themeName) {
    if (!customThemes[themeName]) return;
    config.theme = 'custom';
    config.activeCustomTheme = themeName;
    saveConfig();
    if (!mainWindow) return;

    if (currentThemeKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentThemeKey); } catch (e) {}
      currentThemeKey = null;
    }

    const theme = customThemes[themeName];
    let css = '';
    if (theme.type === 'palette') {
      css = generateThemeCSS(theme.colors);
    } else if (theme.type === 'css') {
      css = theme.css;
    }

    if (css) {
      try { currentThemeKey = await mainWindow.webContents.insertCSS(css); } catch (e) {}
    }

    rebuildMenu();
  }

  async function applyCustomCSS(css) {
    config.customCSS = css;
    config.customCSSEnabled = true;
    saveConfig();
    if (!mainWindow) return;

    if (currentCustomCSSKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentCustomCSSKey); } catch (e) {}
      currentCustomCSSKey = null;
    }

    if (css) {
      try { currentCustomCSSKey = await mainWindow.webContents.insertCSS(css); } catch (e) {}
    }
  }

  async function disableCustomCSS() {
    config.customCSSEnabled = false;
    saveConfig();
    if (!mainWindow) return;

    if (currentCustomCSSKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentCustomCSSKey); } catch (e) {}
      currentCustomCSSKey = null;
    }
  }

  async function applyBorderRadius(radiusValue) {
    config.borderRadius = radiusValue;
    saveConfig();
    if (!mainWindow) return;

    if (currentRadiusKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentRadiusKey); } catch (e) {}
      currentRadiusKey = null;
    }

    if (radiusValue !== 'default') {
      const radiusNum = parseInt(radiusValue);
      const radiusCSS = `
        :root, html, body {
          --radius-xlarge: ${radiusNum}px !important;
          --radius-large: ${radiusNum}px !important;
          --radius-medium: ${radiusNum}px !important;
          --radius-small: ${Math.max(0, radiusNum - 4)}px !important;
        }
        button, input, img, .artwork, a, card,
        [class*="button"], [class*="card"], [class*="thumbnail"], [class*="image"] {
          border-radius: ${radiusNum}px !important;
        }
      `;
      try { currentRadiusKey = await mainWindow.webContents.insertCSS(radiusCSS); } catch (e) {}
    }
  }

  // ==========================================
  // MODE FLUIDE (expérimental)
  // ==========================================
  // Objectif : des animations PLUS fluides et un chargement PLUS rapide —
  // pas de suppression des effets visuels. On force le compositeur GPU à
  // prendre en charge les éléments animés (au lieu de les repeindre au CPU
  // à chaque frame), ce qui réduit le jank sans changer le rendu du site.
  const FLUID_MODE_CSS = `
    img, video, canvas, button, a,
    [class*="card"], [class*="button"], [class*="artwork"],
    [class*="thumbnail"], [class*="cover"], [class*="image"] {
      transform: translateZ(0);
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
    }
  `;
  let currentFluidModeKey = null;

  async function applyFluidMode(enabled) {
    config.perfMode = enabled;
    saveConfig();
    if (!mainWindow) return;

    if (currentFluidModeKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentFluidModeKey); } catch (e) {}
      currentFluidModeKey = null;
    }

    if (enabled) {
      try { currentFluidModeKey = await mainWindow.webContents.insertCSS(FLUID_MODE_CSS); } catch (e) {}
    }

    rebuildMenu();
  }

  // ==========================================
  // ÉCRAN DE CHARGEMENT
  // ==========================================
  // Le site affiche trois points sur fond sombre pendant que ses ~4 Mo de JS
  // s'exécutent. Plutôt que de cibler ses classes CSS (hachées, elles
  // changeront à son prochain build), on superpose notre propre écran et on
  // le retire dès que du vrai contenu apparaît dans le DOM.
  //
  // Les anecdotes marquées « mesuré » viennent des relevés faits sur le site
  // lui-même ; les autres sont des faits établis sur Nintendo.
  const LOADER_FACTS = {
    fr: [
      'Cette page charge près de 4 Mo de JavaScript, répartis en une trentaine de fichiers.',
      'Les pochettes viennent de image-assets.m.nintendo.com : 88 requêtes rien que pour l\'accueil.',
      'Le site renvoie « max-age=0 » sur ses pages : sans cache, elles étaient retéléchargées à chaque ouverture.',
      'Ses fichiers JS et CSS, eux, sont marqués « immutable » pendant un an : ils ne se retéléchargent jamais.',
      'Ce client bloque environ 28 requêtes de télémétrie à chaque chargement de page.',
      'Le site est construit avec Next.js ; ses fichiers sont compilés par Turbopack.',
      'La lecture exige le DRM Widevine — d\'où la version spéciale d\'Electron utilisée ici.',
      'Le site communique en HTTP/2. Pas encore de HTTP/3 à l\'horizon.',
      'Les pochettes sont servies en object-fit: fill, ce qui étire les images non carrées. Le redesign corrige ça.',
      'Nintendo a été fondée en 1889. Son premier produit : des cartes à jouer hanafuda.',
      'Koji Kondo a composé le thème de Super Mario Bros. en 1985.',
      'Avant les jeux vidéo, Nintendo a tenté les taxis, le riz instantané et les love hotels.',
      'Nintendo Music est arrivé en octobre 2024, réservé aux abonnés Nintendo Switch Online.',
      'Le service propose des versions longues qui bouclent jusqu\'à 60 minutes.',
      'Le siège de Nintendo est à Kyoto, où l\'entreprise est née.',
      'La Game Boy est sortie en 1989. Gunpei Yokoi, son créateur, avait été embauché pour entretenir les machines à fabriquer les cartes.',
      'Selon la légende, Mario doit son nom à Mario Segale, propriétaire de l\'entrepôt de Nintendo of America.',
      'Cet écran de chargement n\'appartient pas à Nintendo : il est ajouté par ce client.'
    ],
    en: [
      'This page loads nearly 4 MB of JavaScript, split across some thirty files.',
      'Artwork comes from image-assets.m.nintendo.com: 88 requests for the home page alone.',
      'The site returns "max-age=0" for its pages, so without caching they were re-downloaded on every open.',
      'Its JS and CSS files, however, are marked "immutable" for a year and never re-download.',
      'This client blocks around 28 telemetry requests on every page load.',
      'The site is built with Next.js; its files are compiled by Turbopack.',
      'Playback requires Widevine DRM — hence the special Electron build used here.',
      'The site speaks HTTP/2. No HTTP/3 in sight yet.',
      'Artwork is served with object-fit: fill, which stretches non-square images. The redesign fixes that.',
      'Nintendo was founded in 1889. Its first product: hanafuda playing cards.',
      'Koji Kondo composed the Super Mario Bros. theme in 1985.',
      'Before video games, Nintendo tried taxis, instant rice and love hotels.',
      'Nintendo Music launched in October 2024, for Nintendo Switch Online members.',
      'The service offers extended versions that loop for up to 60 minutes.',
      'Nintendo is headquartered in Kyoto, where the company was born.',
      'The Game Boy shipped in 1989. Its creator, Gunpei Yokoi, was originally hired to maintain the card-making machines.',
      'As the story goes, Mario was named after Mario Segale, landlord of Nintendo of America\'s warehouse.',
      'This loading screen is not Nintendo\'s — it is added by this client.'
    ]
  };

  function buildLoaderScript() {
    const lang = resolveLanguage();
    const facts = config.loaderFacts ? (LOADER_FACTS[lang] || LOADER_FACTS.en) : [];
    return `(() => {
      if (window.__nmLoader) return;
      window.__nmLoader = true;

      const FACTS = ${JSON.stringify(facts)};
      const root = document.documentElement;

      const style = document.createElement('style');
      style.textContent = \`
        #__nm_loader {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: var(--_1hr2ce03, #101014);
          opacity: 1; transition: opacity .38s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        #__nm_loader.__out { opacity: 0; }
        #__nm_loader .__eq { display: flex; align-items: flex-end; gap: 6px; height: 42px; }
        #__nm_loader .__eq i {
          display: block; width: 6px; height: 100%; border-radius: 3px;
          background: var(--_1hr2ce0b, #e60012);
          transform-origin: bottom; animation: __nmbeat 1.05s ease-in-out infinite;
        }
        #__nm_loader .__eq i:nth-child(1) { animation-delay: -.9s; }
        #__nm_loader .__eq i:nth-child(2) { animation-delay: -.75s; }
        #__nm_loader .__eq i:nth-child(3) { animation-delay: -.6s; }
        #__nm_loader .__eq i:nth-child(4) { animation-delay: -.45s; }
        #__nm_loader .__eq i:nth-child(5) { animation-delay: -.3s; }
        @keyframes __nmbeat {
          0%, 100% { transform: scaleY(.22); opacity: .55; }
          50%      { transform: scaleY(1);   opacity: 1; }
        }
        #__nm_loader .__fact {
          position: absolute; bottom: 46px; left: 50%; transform: translateX(-50%);
          width: min(560px, calc(100vw - 64px)); text-align: center;
          font-size: 12px; line-height: 1.7; color: var(--_1hr2ce00, #f4f4f4);
          opacity: 0; transition: opacity .5s ease;
        }
        #__nm_loader .__fact.__in { opacity: .38; }
        @media (prefers-reduced-motion: reduce) {
          #__nm_loader .__eq i { animation-duration: 2.2s; }
        }
      \`;

      const el = document.createElement('div');
      el.id = '__nm_loader';
      el.innerHTML = '<div class="__eq"><i></i><i></i><i></i><i></i><i></i></div><div class="__fact"></div>';
      root.appendChild(style);
      root.appendChild(el);

      let rotator = null;
      if (FACTS.length) {
        const box = el.querySelector('.__fact');
        let i = Math.floor(Math.random() * FACTS.length);
        const show = () => {
          box.classList.remove('__in');
          setTimeout(() => {
            box.textContent = FACTS[i % FACTS.length];
            i++;
            box.classList.add('__in');
          }, 480);
        };
        show();
        rotator = setInterval(show, 4600);
      }

      // Retire l'écran dès que du vrai contenu est peint, avec un plafond de
      // sécurité pour ne jamais rester bloqué par-dessus le site.
      const hasContent = () =>
        document.querySelector('main section') ||
        document.querySelectorAll('img[data-nimg]').length > 2;

      let ticks = 0;
      const poll = setInterval(() => {
        if (hasContent() || ++ticks > 60) {
          clearInterval(poll);
          if (rotator) clearInterval(rotator);
          el.classList.add('__out');
          setTimeout(() => { el.remove(); style.remove(); window.__nmLoader = false; }, 420);
        }
      }, 200);
    })();`;
  }

  // ==========================================
  // BLOQUEUR DE TÉLÉMÉTRIE
  // ==========================================
  const blockedCounts = { baasAnalytics: 0, googlePubsub: 0, googleAnalytics: 0, sentry: 0 };

  function categorizeTelemetry(url) {
    // /core/v1/* sur baas.nintendo.com est l'authentification : jamais bloqué.
    if (url.includes('.baas.nintendo.com/bigdata/')) return 'baasAnalytics';
    if (url.includes('pubsub.googleapis.com')) return 'googlePubsub';
    if (url.includes('google-analytics.com')) return 'googleAnalytics';
    if (url.includes('sentry.io')) return 'sentry';
    return null;
  }

  function totalBlocked() {
    return Object.values(blockedCounts).reduce((a, b) => a + b, 0);
  }

  // ==========================================
  // REDESIGN DU SITE
  // ==========================================
  // Construit sur des sélecteurs STABLES relevés dans le DOM réel : balises
  // sémantiques (main, nav, section, header), img[data-nimg] (composant Image
  // de Next.js, présent sur les 181 pochettes) et [data-scrollarea]. On évite
  // les classes hachées du type "_1hr2ce…" qui changent à chaque build du site.
  const DENSITY_GAPS = {
    compact:  { gap: 14, section: 22, cover: 148 },
    normal:   { gap: 24, section: 34, cover: 176 },
    spacious: { gap: 40, section: 52, cover: 210 }
  };

  function buildRedesignCSS(opts) {
    const d = DENSITY_GAPS[opts.density] || DENSITY_GAPS.normal;
    const radius = Number.isFinite(opts.cardRadius) ? opts.cardRadius : 12;
    const accent = opts.accent;
    const parts = [];

    // --- Densité : le site laisse 48px entre les cartes, on resserre ---
    parts.push(`
      main section > div,
      main section > div > div {
        gap: ${d.gap}px !important;
      }
      main section { margin-bottom: ${d.section}px !important; }
    `);

    // --- Pochettes : arrondi + ratio correct ---
    parts.push(`
      img[data-nimg] {
        border-radius: ${radius}px !important;
        ${opts.coverFix ? 'object-fit: cover !important;' : ''}
      }
      a:has(> div > img[data-nimg]), a:has(> img[data-nimg]) {
        border-radius: ${radius}px !important;
      }
    `);

    // --- Typographie des titres de section ---
    parts.push(`
      main section > header h1,
      main section > header h2,
      main section > header h3 {
        letter-spacing: -0.015em !important;
        font-weight: 700 !important;
      }
    `);

    if (opts.hoverEffects) {
      parts.push(`
        main a:has(img[data-nimg]) {
          transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1) !important;
          will-change: transform;
        }
        main a:has(img[data-nimg]):hover {
          transform: translateY(-4px) scale(1.02) !important;
          z-index: 2;
        }
        main a:has(img[data-nimg]):hover img[data-nimg] {
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45) !important;
        }
        main a:has(img[data-nimg]):active {
          transform: translateY(-1px) scale(0.995) !important;
        }
      `);
    }

    if (opts.stickyHeaders) {
      parts.push(`
        main section > header {
          position: sticky !important;
          top: 0;
          z-index: 3;
          padding-block: 6px !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `);
    }

    if (opts.customScrollbar) {
      parts.push(`
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: ${accent || 'rgba(255, 255, 255, 0.22)'};
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${accent || 'rgba(255, 255, 255, 0.38)'};
          background-clip: content-box;
        }
      `);
    }

    // --- Couleur d'accentuation : on surcharge la variable du site ---
    if (accent) {
      parts.push(`
        :root {
          --_1hr2ce0b: ${accent} !important;
          --_1hr2ce0c: ${accent} !important;
          --_1hr2ce0m: ${accent} !important;
        }
        ::selection { background: ${accent} !important; color: #fff !important; }
      `);
    }

    return parts.join('\n');
  }

  let currentRedesignKey = null;

  async function applyRedesign() {
    if (!mainWindow) return;

    if (currentRedesignKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentRedesignKey); } catch (e) {}
      currentRedesignKey = null;
    }

    if (!config.redesignEnabled) return;

    try {
      currentRedesignKey = await mainWindow.webContents.insertCSS(buildRedesignCSS(config.redesign));
    } catch (e) {
      console.error('Redesign CSS error:', e);
    }
  }

  // ==========================================
  // SYSTÈME DE DESIGN DES FENÊTRES INTERNES
  // ==========================================
  // Partagé par les paramètres et l'éditeur de thèmes pour qu'ils se
  // ressemblent. Palette neutre + rouge Nintendo comme unique accent,
  // icônes SVG au trait (pas d'emoji), échelle typographique explicite.
  const ICONS = {
    bolt: '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6l-7-3Z"/>',
    wand: '<path d="M5 19 19 5M15 5h4v4"/><path d="M6 4.5v3M4.5 6h3M17 15.5v3M15.5 17h3"/>',
    gamepad: '<rect x="2" y="7" width="20" height="10" rx="4"/><path d="M7 10v4M5 12h4M15.5 11.5h.01M18 13.5h.01"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c-2.5 2.5-2.5 15 0 18 2.5-3 2.5-15.5 0-18Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.5-1.1-.3-.3-.4-.6-.4-1 0-.8.6-1.4 1.4-1.4H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
    code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
    play: '<path d="M7 4.5v15l13-7.5-13-7.5Z"/>',
    save: '<path d="M5 3h11l3 3v15H5V3Z"/><path d="M9 3v6h6M8 15h8"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 5 5 9-11"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/>'
  };

  function icon(name, size = 16) {
    return `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  const UI_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0c0e;
    --surface: #141417;
    --surface-2: #1a1a1e;
    --surface-3: #222227;
    --line: #26262c;
    --line-2: #33333b;
    --text: #ececef;
    --muted: #9a9aa5;
    --faint: #6b6b76;
    --accent: #e60012;
    --accent-soft: rgba(230, 0, 18, 0.13);
    --ok: #3fb950;
    --danger: #f85149;
    --ring: 0 0 0 2px var(--bg), 0 0 0 4px rgba(230, 0, 18, 0.55);
  }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', sans-serif;
    font-size: 13px; line-height: 1.5;
    height: 100vh; display: flex; overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .i { flex-shrink: 0; }
  ::selection { background: var(--accent); color: #fff; }
  :focus-visible { outline: none; box-shadow: var(--ring); border-radius: 6px; }

  /* ---------- Rail latéral ---------- */
  .rail {
    width: 204px; flex-shrink: 0; background: var(--surface);
    border-right: 1px solid var(--line);
    display: flex; flex-direction: column; padding: 14px 10px;
  }
  .rail .brand {
    display: flex; align-items: center; gap: 9px;
    padding: 4px 8px 14px; color: var(--text);
  }
  .rail .brand b { font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; }
  .rail .brand .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
  .navitem {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 10px; margin-bottom: 1px; border-radius: 7px;
    color: var(--muted); cursor: pointer; user-select: none;
    font-size: 13px; position: relative;
    transition: background .13s ease, color .13s ease;
  }
  .navitem:hover { background: var(--surface-2); color: var(--text); }
  .navitem.active { background: var(--surface-3); color: var(--text); font-weight: 550; }
  .navitem.active::before {
    content: ''; position: absolute; left: -10px; top: 50%; transform: translateY(-50%);
    width: 3px; height: 17px; border-radius: 0 3px 3px 0; background: var(--accent);
  }
  .rail .spacer { flex: 1; }
  .rail .foot { padding: 8px; color: var(--faint); font-size: 11px; }

  /* ---------- Contenu ---------- */
  .content { flex: 1; overflow-y: auto; }
  .content::-webkit-scrollbar { width: 11px; }
  .content::-webkit-scrollbar-thumb {
    background: var(--line-2); border-radius: 6px;
    border: 3px solid var(--bg); background-clip: content-box;
  }
  .panel { display: none; padding: 26px 32px 44px; max-width: 660px; }
  .panel.active { display: block; }
  .panel > h2 {
    font-size: 19px; font-weight: 620; letter-spacing: -0.02em; margin-bottom: 5px;
  }
  .panel > .lead { color: var(--muted); font-size: 12.5px; margin-bottom: 20px; max-width: 56ch; }
  .grouplabel {
    font-size: 10.5px; font-weight: 600; color: var(--faint);
    text-transform: uppercase; letter-spacing: 0.09em;
    margin: 24px 0 9px;
  }
  .grouplabel:first-of-type { margin-top: 0; }

  /* ---------- Listes de réglages ---------- */
  .list { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .item {
    display: flex; align-items: center; gap: 16px;
    padding: 13px 15px; border-bottom: 1px solid var(--line);
  }
  .item:last-child { border-bottom: none; }
  .item .label { flex: 1; min-width: 0; }
  .item .label b { display: block; font-weight: 520; font-size: 13px; }
  .item .label small {
    display: block; color: var(--faint); font-size: 11.5px;
    line-height: 1.55; margin-top: 3px;
  }
  .item.disabled { opacity: .45; pointer-events: none; }

  /* ---------- Interrupteur ---------- */
  .switch { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
  .switch .track {
    position: absolute; inset: 0; border-radius: 20px; pointer-events: none;
    background: var(--line-2); transition: background .16s ease;
  }
  .switch .track::after {
    content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px;
    border-radius: 50%; background: #d4d4d8;
    transition: transform .16s cubic-bezier(.3,1.3,.6,1), background .16s;
  }
  .switch input:checked + .track { background: var(--accent); }
  .switch input:checked + .track::after { transform: translateX(16px); background: #fff; }
  .switch input:focus-visible + .track { box-shadow: var(--ring); }

  /* ---------- Boutons ---------- */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 12px; border-radius: 7px; border: 1px solid var(--line-2);
    background: var(--surface-2); color: var(--text);
    font-family: inherit; font-size: 12.5px; font-weight: 500;
    cursor: pointer; white-space: nowrap; transition: background .13s, border-color .13s;
  }
  .btn:hover { background: var(--surface-3); border-color: #444; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.primary:hover { background: #f4121f; border-color: #f4121f; }
  .btn.danger { color: var(--danger); border-color: rgba(248,81,73,.35); background: transparent; }
  .btn.danger:hover { background: rgba(248,81,73,.1); border-color: var(--danger); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }

  /* ---------- Contrôle segmenté ---------- */
  .segmented { display: inline-flex; gap: 2px; background: var(--surface-2); padding: 3px; border-radius: 8px; }
  .segmented button {
    padding: 5px 13px; border: none; border-radius: 6px; background: transparent;
    color: var(--muted); font-family: inherit; font-size: 12.5px; cursor: pointer;
    transition: background .13s, color .13s;
  }
  .segmented button:hover { color: var(--text); }
  .segmented button.on { background: var(--surface-3); color: var(--text); font-weight: 550; }

  /* ---------- Champs ---------- */
  select, input[type="text"], textarea {
    background: var(--surface-2); border: 1px solid var(--line-2); border-radius: 7px;
    color: var(--text); font-family: inherit; font-size: 13px; padding: 7px 10px;
    outline: none; transition: border-color .13s;
  }
  select:focus, input[type="text"]:focus, textarea:focus { border-color: var(--accent); }
  input[type="range"] { width: 148px; accent-color: var(--accent); }
  input[type="color"] {
    width: 34px; height: 28px; padding: 2px; cursor: pointer;
    border: 1px solid var(--line-2); border-radius: 7px; background: var(--surface-2);
  }
  .mono { font-family: 'Cascadia Mono', Consolas, 'SF Mono', monospace; }

  /* ---------- Cartes de préréglage ---------- */
  .presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
  .preset {
    text-align: left; background: var(--surface); border: 1px solid var(--line);
    border-radius: 10px; padding: 13px; cursor: pointer; color: var(--text);
    font-family: inherit; transition: border-color .14s, background .14s;
  }
  .preset:hover { border-color: var(--line-2); background: var(--surface-2); }
  .preset.active { border-color: var(--accent); background: var(--accent-soft); }
  .preset b { display: block; font-size: 13px; font-weight: 570; margin-bottom: 4px; }
  .preset small { color: var(--faint); font-size: 11px; line-height: 1.5; }

  /* ---------- Divers ---------- */
  .stat { display: flex; align-items: baseline; gap: 11px; padding: 16px 15px; }
  .stat .num { font-size: 27px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .stat .lbl { color: var(--muted); font-size: 12.5px; }
  .notice {
    display: none; align-items: center; gap: 12px; margin-bottom: 18px;
    padding: 11px 14px; border-radius: 9px; font-size: 12.5px;
    background: var(--accent-soft); border: 1px solid rgba(230,0,18,.4);
  }
  .notice.show { display: flex; }
  .notice .flex { flex: 1; }
  .toast {
    position: fixed; bottom: 18px; left: 50%;
    transform: translateX(-50%) translateY(52px);
    display: flex; align-items: center; gap: 8px;
    background: var(--surface-3); border: 1px solid var(--line-2);
    border-radius: 8px; padding: 9px 15px; font-size: 12.5px;
    transition: transform .22s cubic-bezier(.3,1.2,.6,1); pointer-events: none; z-index: 99;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast .i { color: var(--ok); }
  `;

  // ==========================================
  // FENÊTRE DES PARAMÈTRES
  // ==========================================
  function createSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.focus();
      return;
    }

    settingsWindow = new BrowserWindow({
      width: 880,
      height: 700,
      title: t('settings.title'),
      parent: mainWindow,
      modal: false,
      resizable: true,
      minimizable: true,
      maximizable: false,
      backgroundColor: '#0a0a0a',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    settingsWindow.setMenuBarVisibility(false);
    settingsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildSettingsHTML()));
    settingsWindow.on('closed', () => { settingsWindow = null; });
  }

  function buildSettingsHTML() {
    const lang = resolveLanguage();
    const strings = { ...TRANSLATIONS.en, ...TRANSLATIONS[lang] };
    const state = {
      config,
      languages: LANGUAGES,
      currentLanguage: config.language
    };

    const row = (title, desc, control) => `
      <div class="item">
        <div class="label"><b>${title}</b>${desc ? `<small>${desc}</small>` : ''}</div>
        ${control}
      </div>`;
    const toggle = (id) => `<label class="switch"><input type="checkbox" id="${id}"><span class="track"></span></label>`;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${strings['settings.title']}</title>
<style>${UI_CSS}</style>
</head>
<body>

<nav class="rail">
  <div class="brand"><span class="dot"></span><b>${strings['settings.title']}</b></div>
  <div class="navitem active" data-tab="performance">${icon('bolt')}${strings['tab.performance']}</div>
  <div class="navitem" data-tab="privacy">${icon('shield')}${strings['tab.privacy']}</div>
  <div class="navitem" data-tab="redesign">${icon('wand')}${strings['tab.redesign']}</div>
  <div class="navitem" data-tab="discord">${icon('gamepad')}${strings['tab.discord']}</div>
  <div class="navitem" data-tab="system">${icon('monitor')}${strings['tab.system']}</div>
  <div class="navitem" data-tab="language">${icon('globe')}${strings['tab.language']}</div>
  <div class="spacer"></div>
  <div class="navitem" data-tab="about">${icon('info')}${strings['tab.about']}</div>
</nav>

<main class="content">

  <section class="panel active" id="p-performance">
    <h2>${strings['tab.performance']}</h2>
    <p class="lead">${strings['perf.lead']}</p>

    <div class="notice" id="restart-notice">
      <span class="flex">${strings['common.restartNeeded']}</span>
      <button class="btn primary" onclick="send('settings:restart')">${strings['common.restartNow']}</button>
    </div>

    <div class="grouplabel">${strings['perf.presets']}</div>
    <div class="presets">
      <button class="preset" data-preset="native" onclick="applyPreset('native')">
        <b>${strings['perf.presetNative']}</b><small>${strings['perf.presetNativeDesc']}</small>
      </button>
      <button class="preset" data-preset="balanced" onclick="applyPreset('balanced')">
        <b>${strings['perf.presetBalanced']}</b><small>${strings['perf.presetBalancedDesc']}</small>
      </button>
      <button class="preset" data-preset="max" onclick="applyPreset('max')">
        <b>${strings['perf.presetMax']}</b><small>${strings['perf.presetMaxDesc']}</small>
      </button>
    </div>

    <div class="grouplabel">${strings['tab.performance']}</div>
    <div class="list">
      ${row(strings['perf.pageCache'], strings['perf.pageCacheDesc'], toggle('pageCacheEnabled'))}
      ${row(strings['perf.fluidMode'], strings['perf.fluidDesc'], toggle('perfMode'))}
      ${row(strings['perf.clearCache'], strings['perf.clearCacheDesc'],
        `<button class="btn" onclick="send('settings:clearCache'); toast('${strings['perf.cacheCleared']}')">${icon('reset', 14)}${strings['perf.clearCache']}</button>`)}
    </div>
  </section>

  <section class="panel" id="p-privacy">
    <h2>${strings['tab.privacy']}</h2>
    <p class="lead">${strings['privacy.desc']}</p>

    <div class="list" style="margin-bottom:20px">
      <div class="stat">
        <span class="num" id="blocked-total">0</span>
        <span class="lbl">${strings['privacy.blocked']}</span>
      </div>
    </div>

    <div class="grouplabel">${strings['tab.privacy']}</div>
    <div class="list">
      ${row(strings['privacy.baas'], strings['privacy.baasDesc'], toggle('blk-baasAnalytics'))}
      ${row(strings['privacy.pubsub'], strings['privacy.pubsubDesc'], toggle('blk-googlePubsub'))}
      ${row(strings['privacy.ga'], '', toggle('blk-googleAnalytics'))}
      ${row(strings['privacy.sentry'], '', toggle('blk-sentry'))}
    </div>
  </section>

  <section class="panel" id="p-redesign">
    <h2>${strings['tab.redesign']}</h2>
    <p class="lead">${strings['redesign.desc']}</p>

    <div class="list">
      ${row(strings['redesign.enable'], '', toggle('redesignEnabled'))}
    </div>

    <div class="grouplabel">${strings['tab.redesign']}</div>
    <div class="list" id="redesign-opts">
      ${row(strings['redesign.density'], strings['redesign.densityDesc'], `
        <div class="segmented">
          <button data-density="compact" onclick="setDensity('compact')">${strings['redesign.compact']}</button>
          <button data-density="normal" onclick="setDensity('normal')">${strings['redesign.normal']}</button>
          <button data-density="spacious" onclick="setDensity('spacious')">${strings['redesign.spacious']}</button>
        </div>`)}
      ${row(strings['redesign.radius'], '<span class="mono" id="radius-val">12</span> px',
        `<input type="range" id="cardRadius" min="0" max="28" step="2">`)}
      ${row(strings['redesign.coverFix'], strings['redesign.coverFixDesc'], toggle('rd-coverFix'))}
      ${row(strings['redesign.hover'], strings['redesign.hoverDesc'], toggle('rd-hoverEffects'))}
      ${row(strings['redesign.stickyHeaders'], '', toggle('rd-stickyHeaders'))}
      ${row(strings['redesign.scrollbar'], '', toggle('rd-customScrollbar'))}
      ${row(strings['redesign.accent'], `<span id="accent-label">${strings['redesign.accentDefault']}</span>`, `
        <div style="display:flex; gap:7px; align-items:center">
          <input type="color" id="accentColor" value="#e60012">
          <button class="btn" onclick="resetAccent()" title="${strings['redesign.accentDefault']}">${icon('reset', 14)}</button>
        </div>`)}
    </div>

    <div class="grouplabel">${strings['loader.title']}</div>
    <div class="list">
      ${row(strings['loader.enable'], strings['loader.enableDesc'], toggle('customLoader'))}
      ${row(strings['loader.facts'], strings['loader.factsDesc'], toggle('loaderFacts'))}
    </div>
  </section>

  <section class="panel" id="p-discord">
    <h2>${strings['tab.discord']}</h2>
    <div class="list">
      ${row(strings['menu.enableRPC'], '', toggle('rpcEnabled'))}
      ${row(strings['menu.privateMode'], '', toggle('rpcPrivateMode'))}
    </div>
  </section>

  <section class="panel" id="p-system">
    <h2>${strings['tab.system']}</h2>
    <div class="list">
      ${row(strings['menu.notifications'], '', toggle('notificationsEnabled'))}
      ${row(strings['menu.runAtStartup'], '', toggle('autoStart'))}
      ${row(strings['menu.startMinimized'], '', toggle('startMinimized'))}
      ${row(strings['menu.alwaysOnTop'], '', toggle('alwaysOnTop'))}
      ${row(strings['menu.hardwareAccel'], '', toggle('hardwareAccel'))}
    </div>
  </section>

  <section class="panel" id="p-language">
    <h2>${strings['tab.language']}</h2>
    <p class="lead">${strings['lang.desc']}</p>
    <div class="list">
      ${row(strings['tab.language'], '', `<select id="language" style="width:190px"></select>`)}
    </div>
  </section>

  <section class="panel" id="p-about">
    <h2>${strings['tab.about']}</h2>
    <p class="lead">${strings['about.desc']}</p>
    <div class="list">
      ${row('Nintendo Music Client', `v${app.getVersion()} &middot; Electron ${process.versions.electron} &middot; Chromium ${process.versions.chrome}`, '')}
    </div>
  </section>

</main>

<div class="toast" id="toast"><span id="toast-icon">${icon('check', 14)}</span><span id="toast-text"></span></div>

<script>
const { ipcRenderer } = require('electron');
const state = ${JSON.stringify(state)};
const cfg = state.config;

function send(channel, payload) { ipcRenderer.send(channel, payload); }
function set(key, value) { send('settings:set', { key, value }); }

document.querySelectorAll('.navitem').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.navitem').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('p-' + item.dataset.tab).classList.add('active');
  };
});

const toggles = ['pageCacheEnabled','perfMode','redesignEnabled','customLoader','loaderFacts',
                 'rpcEnabled','rpcPrivateMode','notificationsEnabled','autoStart','startMinimized',
                 'alwaysOnTop','hardwareAccel'];
const needsRestart = ['perfMode','hardwareAccel'];
toggles.forEach(key => {
  const el = document.getElementById(key);
  if (!el) return;
  el.checked = !!cfg[key];
  el.onchange = () => {
    set(key, el.checked);
    if (needsRestart.includes(key)) document.getElementById('restart-notice').classList.add('show');
    if (key === 'redesignEnabled') updateRedesignOpts();
  };
});

['baasAnalytics','googlePubsub','googleAnalytics','sentry'].forEach(key => {
  const el = document.getElementById('blk-' + key);
  el.checked = !!cfg.blockers[key];
  el.onchange = () => send('settings:setBlocker', { key, value: el.checked });
});

['coverFix','hoverEffects','stickyHeaders','customScrollbar'].forEach(key => {
  const el = document.getElementById('rd-' + key);
  el.checked = !!cfg.redesign[key];
  el.onchange = () => send('settings:setRedesign', { key, value: el.checked });
});

function setDensity(v) {
  document.querySelectorAll('[data-density]').forEach(b => b.classList.toggle('on', b.dataset.density === v));
  send('settings:setRedesign', { key: 'density', value: v });
}
setDensity(cfg.redesign.density);

const radius = document.getElementById('cardRadius');
radius.value = cfg.redesign.cardRadius;
document.getElementById('radius-val').textContent = cfg.redesign.cardRadius;
radius.oninput = () => {
  document.getElementById('radius-val').textContent = radius.value;
  send('settings:setRedesign', { key: 'cardRadius', value: parseInt(radius.value, 10) });
};

const accent = document.getElementById('accentColor');
const accentLabel = document.getElementById('accent-label');
const ACCENT_DEFAULT_LABEL = ${JSON.stringify(strings['redesign.accentDefault'])};
if (cfg.redesign.accent) { accent.value = cfg.redesign.accent; accentLabel.textContent = cfg.redesign.accent; }
accent.oninput = () => {
  accentLabel.textContent = accent.value;
  send('settings:setRedesign', { key: 'accent', value: accent.value });
};
function resetAccent() {
  accentLabel.textContent = ACCENT_DEFAULT_LABEL;
  send('settings:setRedesign', { key: 'accent', value: null });
}

function updateRedesignOpts() {
  document.getElementById('redesign-opts').classList.toggle('disabled', !document.getElementById('redesignEnabled').checked);
}
updateRedesignOpts();

const langSel = document.getElementById('language');
const autoOpt = document.createElement('option');
autoOpt.value = '';
autoOpt.textContent = ${JSON.stringify(strings['lang.auto'])};
langSel.appendChild(autoOpt);
state.languages.forEach(l => {
  const o = document.createElement('option');
  o.value = l.code;
  o.textContent = l.label;
  langSel.appendChild(o);
});
langSel.value = state.currentLanguage || '';
langSel.onchange = () => set('language', langSel.value || null);

function applyPreset(name) {
  document.querySelectorAll('.preset').forEach(p => p.classList.toggle('active', p.dataset.preset === name));
  send('settings:preset', name);
  document.getElementById('restart-notice').classList.add('show');
  toast(${JSON.stringify(strings['common.applied'])});
}

function refreshBlocked() {
  ipcRenderer.invoke('settings:blocked').then(n => {
    document.getElementById('blocked-total').textContent = n.toLocaleString();
  }).catch(() => {});
}
refreshBlocked();
setInterval(refreshBlocked, 2000);

function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

ipcRenderer.on('settings:reload', () => location.reload());
</script>
</body>
</html>`;
  }

  // ==========================================
  // THEME EDITOR WINDOW
  // ==========================================
  function createThemeEditorWindow() {
    if (themeEditorWindow && !themeEditorWindow.isDestroyed()) {
      themeEditorWindow.focus();
      return;
    }

    themeEditorWindow = new BrowserWindow({
      width: 820,
      height: 720,
      title: 'Theme Editor — Nintendo Music Client',
      parent: mainWindow,
      modal: false,
      resizable: true,
      minimizable: true,
      maximizable: false,
      backgroundColor: '#0f0f0f',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    themeEditorWindow.setMenuBarVisibility(false);

    const editorHTML = buildThemeEditorHTML();
    themeEditorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(editorHTML));

    themeEditorWindow.on('closed', () => {
      themeEditorWindow = null;
    });
  }

  function buildThemeEditorHTML() {
    const lang = resolveLanguage();
    const strings = { ...TRANSLATIONS.en, ...TRANSLATIONS[lang] };
    const themesJSON = JSON.stringify(customThemes);
    const configJSON = JSON.stringify({
      customCSS: config.customCSS,
      customCSSEnabled: config.customCSSEnabled,
      activeCustomTheme: config.activeCustomTheme
    });

    const swatch = (key, label, placeholder) => `
      <div class="swatch-field">
        <label for="t-${key}">${label}</label>
        <div class="swatch-row">
          <input type="color" id="c-${key}" oninput="syncColor('${key}', this.value)">
          <input type="text" id="t-${key}" class="mono" placeholder="${placeholder}"
                 spellcheck="false" oninput="syncText('${key}', this.value)">
        </div>
      </div>`;

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${strings['menu.themeEditor']}</title>
<style>
${UI_CSS}

  /* ---- Spécifique à l'éditeur ---- */
  .panel.wide { max-width: none; padding: 0; height: 100%; }
  .split { display: flex; height: 100%; }
  .themelist {
    width: 196px; flex-shrink: 0; border-right: 1px solid var(--line);
    display: flex; flex-direction: column; background: var(--surface);
  }
  .themelist .head {
    padding: 15px 14px 9px; font-size: 10.5px; font-weight: 600; color: var(--faint);
    text-transform: uppercase; letter-spacing: .09em;
  }
  .themelist .scroll { flex: 1; overflow-y: auto; padding: 0 8px; }
  .themelist .foot { padding: 8px; border-top: 1px solid var(--line); display: flex; gap: 6px; }
  .themelist .foot .btn { flex: 1; justify-content: center; padding: 6px 8px; }
  .theme-entry {
    display: flex; align-items: center; gap: 8px; padding: 8px 9px; margin-bottom: 1px;
    border-radius: 7px; cursor: pointer; color: var(--muted); font-size: 12.5px;
    transition: background .12s, color .12s;
  }
  .theme-entry:hover { background: var(--surface-2); color: var(--text); }
  .theme-entry.on { background: var(--surface-3); color: var(--text); }
  .theme-entry .chip { width: 9px; height: 9px; border-radius: 3px; flex-shrink: 0; }
  .theme-entry .nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .theme-entry .kind {
    font-size: 9.5px; letter-spacing: .06em; color: var(--faint);
    border: 1px solid var(--line-2); border-radius: 4px; padding: 1px 4px;
  }
  .theme-entry .live { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); }
  .empty {
    padding: 22px 14px; text-align: center; color: var(--faint); font-size: 12px; line-height: 1.6;
  }

  .workspace { flex: 1; overflow-y: auto; padding: 22px 26px 32px; }
  .workspace h2 { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 16px; }

  .swatch-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
  .swatch-field label { display: block; font-size: 11.5px; color: var(--muted); margin-bottom: 5px; }
  .swatch-row { display: flex; gap: 7px; }
  .swatch-row input[type="text"] { flex: 1; min-width: 0; font-size: 12.5px; }

  .preview {
    display: flex; align-items: center; gap: 12px; margin-top: 18px;
    padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  }
  .preview .cap {
    font-size: 10.5px; font-weight: 600; color: var(--faint);
    text-transform: uppercase; letter-spacing: .09em;
  }
  .preview .chips { display: flex; gap: 6px; }
  .preview .chips span {
    width: 26px; height: 26px; border-radius: 6px; border: 1px solid rgba(255,255,255,.09);
  }

  .actions { display: flex; gap: 8px; margin-top: 20px; align-items: center; }
  .actions .grow { flex: 1; }

  .field-block { margin-bottom: 18px; }
  .field-block > label {
    display: block; font-size: 11.5px; color: var(--muted); margin-bottom: 6px;
  }
  .field-block input[type="text"] { width: 100%; }

  /* Éditeur CSS */
  .css-wrap { display: flex; flex-direction: column; height: 100%; }
  .css-bar {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px;
    border-bottom: 1px solid var(--line); background: var(--surface);
  }
  .css-bar .grow { flex: 1; }
  .css-bar .state { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--faint); }
  .css-bar .state .led { width: 6px; height: 6px; border-radius: 50%; background: var(--line-2); }
  .css-bar .state .led.on { background: var(--ok); }
  #css-editor {
    flex: 1; width: 100%; resize: none; border: none; border-radius: 0;
    background: var(--bg); color: #dcdce2; padding: 16px 18px;
    font-family: 'Cascadia Mono', Consolas, 'SF Mono', monospace;
    font-size: 12.5px; line-height: 1.65; tab-size: 2;
  }
  #css-editor:focus { border: none; box-shadow: none; }
  .css-foot {
    padding: 7px 14px; border-top: 1px solid var(--line); background: var(--surface);
    font-size: 11px; color: var(--faint); display: flex; gap: 10px;
  }

  /* Import / Export */
  .dropzone {
    border: 1px dashed var(--line-2); border-radius: 10px; padding: 22px;
    text-align: center; color: var(--muted); cursor: pointer; background: var(--surface);
    transition: border-color .14s, background .14s, color .14s;
  }
  .dropzone:hover, .dropzone.over { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
  .dropzone b { display: block; font-size: 13px; font-weight: 550; margin-bottom: 3px; }
  .dropzone small { font-size: 11.5px; color: var(--faint); }
  .dropzone .i { margin-bottom: 8px; color: var(--faint); }
  .varlist {
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    padding: 13px 15px; font-size: 12px; line-height: 1.9;
  }
  .varlist code { color: var(--accent); font-family: 'Cascadia Mono', Consolas, monospace; font-size: 11.5px; }
  .varlist .k { color: var(--muted); }
</style>
</head>
<body>

<nav class="rail">
  <div class="brand"><span class="dot"></span><b>${strings['editor.title']}</b></div>
  <div class="navitem active" data-tab="palette">${icon('palette')}${strings['menu.theme']}</div>
  <div class="navitem" data-tab="css">${icon('code')}CSS</div>
  <div class="navitem" data-tab="io">${icon('swap')}Import / Export</div>
  <div class="spacer"></div>
  <div class="navitem" onclick="closeWindow()">${icon('close')}${strings['common.close']}</div>
</nav>

<main class="content" style="display:flex">

  <section class="panel wide active" id="p-palette">
    <div class="split">
      <div class="themelist">
        <div class="head">${strings['menu.customThemes']}</div>
        <div class="scroll" id="theme-list"></div>
        <div class="foot">
          <button class="btn" onclick="newPaletteTheme()">${icon('plus', 14)}${strings['editor.newTheme']}</button>
          <button class="btn" onclick="duplicateTheme()" title="${strings['editor.duplicate']}">${icon('copy', 14)}</button>
        </div>
      </div>

      <div class="workspace">
        <div id="palette-empty" class="empty" style="margin-top:60px">
          ${icon('palette', 26)}
          <div style="margin:10px 0 14px">${strings['editor.noThemes']}</div>
          <button class="btn primary" onclick="newPaletteTheme()">${icon('plus', 14)}${strings['editor.newTheme']}</button>
        </div>

        <div id="palette-form" style="display:none">
          <div class="field-block">
            <label for="theme-name">${strings['editor.themeName']}</label>
            <input type="text" id="theme-name" oninput="onNameChange()" spellcheck="false">
          </div>

          <div class="swatch-grid">
            ${swatch('accent', strings['editor.colorAccent'], '#a855f7')}
            ${swatch('bg1', strings['editor.colorBg'] + ' 1', '#0f0518')}
            ${swatch('bg2', strings['editor.colorBg'] + ' 2', '#1a0b2e')}
            ${swatch('bg3', strings['editor.colorBg'] + ' 3', '#2e1065')}
            ${swatch('text1', strings['editor.colorText'] + ' 1', '#f3e8ff')}
            ${swatch('text2', strings['editor.colorText'] + ' 2', '#d8b4fe')}
          </div>

          <div class="preview">
            <span class="cap">${strings['editor.preview']}</span>
            <div class="chips">
              <span id="sw-bg1"></span><span id="sw-bg2"></span><span id="sw-bg3"></span>
              <span id="sw-accent"></span><span id="sw-text1"></span><span id="sw-text2"></span>
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" onclick="applyCurrentTheme()">${icon('play', 14)}${strings['editor.apply']}</button>
            <button class="btn" onclick="saveCurrentTheme()">${icon('save', 14)}${strings['editor.save']}</button>
            <span class="grow"></span>
            <button class="btn danger" onclick="deleteCurrentTheme()">${icon('trash', 14)}${strings['editor.delete']}</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="panel wide" id="p-css">
    <div class="css-wrap">
      <div class="css-bar">
        <span class="state"><span class="led" id="css-led"></span><span id="css-state">${strings['common.disabled']}</span></span>
        <span class="grow"></span>
        <button class="btn primary" onclick="applyCSSEditor()">${icon('play', 14)}${strings['editor.apply']}</button>
        <button class="btn" onclick="saveCSSAsTheme()">${icon('save', 14)}${strings['editor.saveAsTheme']}</button>
        <button class="btn danger" id="css-off" onclick="disableCSS()" style="display:none">${icon('close', 14)}</button>
      </div>
      <textarea id="css-editor" spellcheck="false" placeholder="/* ${strings['editor.cssInjected']} */"></textarea>
      <div class="css-foot">
        <span id="css-count">0</span>
        <span class="grow" style="flex:1"></span>
      </div>
    </div>
  </section>

  <section class="panel" id="p-io">
    <h2 style="font-size:17px;font-weight:600;letter-spacing:-.02em;margin-bottom:16px">Import / Export</h2>

    <div class="grouplabel">Import</div>
    <div style="display:grid; gap:10px">
      <div class="dropzone" id="dz-css" onclick="triggerFileOpen('css')">
        ${icon('code', 22)}<b>.css</b><small>${strings['editor.drop']}</small>
      </div>
      <div class="dropzone" id="dz-json" onclick="triggerFileOpen('json')">
        ${icon('palette', 22)}<b>.json</b><small>${strings['editor.drop']}</small>
      </div>
    </div>

    <div class="grouplabel">Export</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap">
      <button class="btn" onclick="exportThemes()">${icon('swap', 14)}${strings['editor.exportThemes']}</button>
      <button class="btn" onclick="exportCurrentCSS()">${icon('swap', 14)}${strings['editor.exportCss']}</button>
    </div>

    <div class="grouplabel">${strings['editor.siteVars']}</div>
    <div class="varlist">
      <div><code>--_1hr2ce0b</code> <span class="k">accent (rouge Nintendo)</span></div>
      <div><code>--_1hr2ce00</code> <span class="k">texte principal</span></div>
      <div><code>--_1hr2ce03</code> <span class="k">fond sombre</span></div>
      <div><code>--_1hr2ce04</code> <span class="k">fond des cartes</span></div>
      <div><code>--_1hr2ce0n</code> <span class="k">panneau latéral</span></div>
      <div style="margin-top:8px; color:var(--faint); font-size:11.5px">
        ${strings['editor.varsHint']} <code>!important</code>
      </div>
    </div>
  </section>

</main>

<div class="toast" id="toast"><span id="toast-icon">${icon('check', 14)}</span><span id="toast-text"></span></div>

<script>
const { ipcRenderer } = require('electron');

let customThemes = ${themesJSON};
let appConfig = ${configJSON};
const TXT = ${JSON.stringify({newTheme:strings['editor.newTheme'],confirmDelete:strings['editor.confirmDelete'],namePrompt:strings['editor.namePrompt'],invalidJson:strings['editor.invalidJson'],saved:strings['editor.saved'],chars:strings['editor.chars'],noThemes:strings['editor.noThemes']})};
let selectedThemeId = null;
let currentColors = { accent: '#a855f7', bg1: '#0f0518', bg2: '#1a0b2e', bg3: '#2e1065', text1: '#f3e8ff', text2: '#d8b4fe' };

document.querySelectorAll('.navitem[data-tab]').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.navitem').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('p-' + item.dataset.tab).classList.add('active');
  };
});

function renderThemeList() {
  const list = document.getElementById('theme-list');
  const keys = Object.keys(customThemes);
  if (!keys.length) {
    list.innerHTML = '<div class="empty">' + TXT.noThemes + '</div>';
    return;
  }
  list.innerHTML = keys.map(id => {
    const th = customThemes[id];
    const color = th.type === 'palette' ? th.colors.accent : '#777';
    return '<div class="theme-entry ' + (selectedThemeId === id ? 'on' : '') + '" onclick="selectTheme(\\'' + id + '\\')">' +
      '<span class="chip" style="background:' + color + '"></span>' +
      '<span class="nm">' + th.name + '</span>' +
      (id === appConfig.activeCustomTheme ? '<span class="live"></span>' : '') +
      '<span class="kind">' + (th.type === 'palette' ? 'PAL' : 'CSS') + '</span>' +
      '</div>';
  }).join('');
}

function selectTheme(id) {
  selectedThemeId = id;
  const th = customThemes[id];
  renderThemeList();
  if (th.type !== 'palette') return;
  document.getElementById('palette-empty').style.display = 'none';
  document.getElementById('palette-form').style.display = 'block';
  document.getElementById('theme-name').value = th.name;
  currentColors = { ...th.colors };
  Object.keys(currentColors).forEach(k => {
    const c = document.getElementById('c-' + k), t = document.getElementById('t-' + k);
    if (c) c.value = currentColors[k];
    if (t) t.value = currentColors[k];
  });
  updateSwatches();
}

function newPaletteTheme() {
  const id = 'theme_' + Date.now();
  customThemes[id] = { name: TXT.newTheme, type: 'palette', colors: { ...currentColors } };
  renderThemeList();
  selectTheme(id);
}

function duplicateTheme() {
  if (!selectedThemeId || !customThemes[selectedThemeId]) return;
  const src = customThemes[selectedThemeId];
  const id = 'theme_' + Date.now();
  customThemes[id] = JSON.parse(JSON.stringify(src));
  customThemes[id].name = src.name + ' (2)';
  renderThemeList();
  selectTheme(id);
}

function onNameChange() {
  if (!selectedThemeId) return;
  customThemes[selectedThemeId].name = document.getElementById('theme-name').value;
  renderThemeList();
}

function syncColor(key, value) {
  currentColors[key] = value;
  document.getElementById('t-' + key).value = value;
  updateSwatches();
}

function syncText(key, value) {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    currentColors[key] = value;
    document.getElementById('c-' + key).value = value;
    updateSwatches();
  }
}

function updateSwatches() {
  Object.keys(currentColors).forEach(k => {
    const el = document.getElementById('sw-' + k);
    if (el) el.style.background = currentColors[k];
  });
}

function saveCurrentTheme() {
  if (!selectedThemeId) return;
  customThemes[selectedThemeId].colors = { ...currentColors };
  customThemes[selectedThemeId].name = document.getElementById('theme-name').value;
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  toast(TXT.saved);
}

function applyCurrentTheme() {
  saveCurrentTheme();
  ipcRenderer.send('apply-custom-theme', selectedThemeId);
  appConfig.activeCustomTheme = selectedThemeId;
  renderThemeList();
  toast(TXT.saved);
}

function deleteCurrentTheme() {
  if (!selectedThemeId || !confirm(TXT.confirmDelete)) return;
  delete customThemes[selectedThemeId];
  if (appConfig.activeCustomTheme === selectedThemeId) {
    appConfig.activeCustomTheme = null;
    ipcRenderer.send('reset-theme');
  }
  selectedThemeId = null;
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  document.getElementById('palette-empty').style.display = 'block';
  document.getElementById('palette-form').style.display = 'none';
}

const cssEditor = document.getElementById('css-editor');
function updateCount() { document.getElementById('css-count').textContent = cssEditor.value.length + ' ' + TXT.chars; }
function updateCSSState(active) {
  document.getElementById('css-led').classList.toggle('on', active);
  document.getElementById('css-state').textContent = active ? ${JSON.stringify(strings['common.enabled'])} : ${JSON.stringify(strings['common.disabled'])};
  document.getElementById('css-off').style.display = active ? 'inline-flex' : 'none';
}

function applyCSSEditor() {
  const css = cssEditor.value.trim();
  if (!css) return;
  ipcRenderer.send('apply-custom-css', css);
  appConfig.customCSSEnabled = true;
  updateCSSState(true);
  toast(TXT.saved);
}

function disableCSS() {
  ipcRenderer.send('disable-custom-css');
  appConfig.customCSSEnabled = false;
  updateCSSState(false);
}

function saveCSSAsTheme() {
  const css = cssEditor.value.trim();
  if (!css) return;
  const name = prompt(TXT.namePrompt, TXT.newTheme);
  if (!name) return;
  const id = 'theme_' + Date.now();
  customThemes[id] = { name, type: 'css', css };
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  toast(TXT.saved);
}

function setupDropZone(id, type) {
  const z = document.getElementById(id);
  z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', e => {
    e.preventDefault();
    z.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f) {
      const r = new FileReader();
      r.onload = ev => handleImport(ev.target.result, type);
      r.readAsText(f);
    }
  });
}

function handleImport(content, type) {
  if (type === 'css') {
    cssEditor.value = content;
    updateCount();
    document.querySelector('.navitem[data-tab="css"]').click();
    toast(TXT.saved);
  } else {
    try {
      Object.assign(customThemes, JSON.parse(content));
      ipcRenderer.send('save-custom-themes', customThemes);
      renderThemeList();
      document.querySelector('.navitem[data-tab="palette"]').click();
      toast(TXT.saved);
    } catch { toast(TXT.invalidJson); }
  }
}

function triggerFileOpen(type) { ipcRenderer.send('open-file-dialog', type); }
ipcRenderer.on('file-content', (e, { content, type }) => handleImport(content, type));

function exportThemes() {
  if (!Object.keys(customThemes).length) return;
  ipcRenderer.send('export-file', { content: JSON.stringify(customThemes, null, 2), defaultName: 'nintendo-music-themes.json', type: 'json' });
}
function exportCurrentCSS() {
  const css = cssEditor.value.trim();
  if (!css) return;
  ipcRenderer.send('export-file', { content: css, defaultName: 'nintendo-music-custom.css', type: 'css' });
}

function closeWindow() { ipcRenderer.send('close-theme-editor'); }

function toast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

cssEditor.value = appConfig.customCSS || '';
cssEditor.addEventListener('input', updateCount);
updateCount();
updateCSSState(appConfig.customCSSEnabled);
renderThemeList();
if (appConfig.activeCustomTheme && customThemes[appConfig.activeCustomTheme]) selectTheme(appConfig.activeCustomTheme);
setupDropZone('dz-css', 'css');
setupDropZone('dz-json', 'json');
</script>
</body>
</html>`;
  }

  // ==========================================
  // IPC HANDLERS (Theme Editor <-> Main)
  // ==========================================
  // ==========================================
  // IPC — PARAMÈTRES
  // ==========================================
  // Les réglages qui n'ont d'effet qu'au démarrage de Chromium (switches de
  // ligne de commande) sont signalés à l'utilisateur par la bannière
  // « redémarrage requis » plutôt qu'appliqués silencieusement à moitié.
  ipcMain.on('settings:set', async (event, { key, value }) => {
    if (!(key in config)) return;
    config[key] = value;
    saveConfig();

    if (key === 'alwaysOnTop' && mainWindow) mainWindow.setAlwaysOnTop(value);
    if (key === 'autoStart' || key === 'startMinimized') {
      app.setLoginItemSettings({ openAtLogin: config.autoStart, openAsHidden: config.startMinimized });
    }
    if (key === 'rpcEnabled') {
      if (value) connectIPC(0);
      else { clearActivity(); if (ipc) { ipc.destroy(); ipc = null; ipcReady = false; } }
    }
    if (key === 'rpcPrivateMode' && config.rpcEnabled) {
      lastActivityCache.title = null;
      pushActivity();
    }
    if (key === 'perfMode') await applyFluidMode(value);
    if (key === 'redesignEnabled') await applyRedesign();
    if (key === 'language') {
      rebuildTray();
      // La fenêtre est rechargée pour s'afficher immédiatement dans la
      // nouvelle langue, au lieu d'attendre sa prochaine ouverture.
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buildSettingsHTML()));
      }
    }

    rebuildMenu();
  });

  ipcMain.on('settings:setBlocker', (event, { key, value }) => {
    if (!(key in config.blockers)) return;
    config.blockers[key] = value;
    saveConfig();
  });

  ipcMain.on('settings:setRedesign', async (event, { key, value }) => {
    if (!(key in config.redesign)) return;
    config.redesign[key] = value;
    saveConfig();
    await applyRedesign();
  });

  ipcMain.on('settings:preset', async (event, name) => {
    if (name === 'native') {
      config.pageCacheEnabled = false;
      config.perfMode = false;
      config.blockers = { baasAnalytics: false, googlePubsub: false, googleAnalytics: false, sentry: false };
    } else if (name === 'balanced') {
      config.pageCacheEnabled = true;
      config.perfMode = false;
      config.blockers = { baasAnalytics: true, googlePubsub: true, googleAnalytics: true, sentry: true };
    } else if (name === 'max') {
      config.pageCacheEnabled = true;
      config.perfMode = true;
      config.blockers = { baasAnalytics: true, googlePubsub: true, googleAnalytics: true, sentry: true };
    } else {
      return;
    }
    saveConfig();
    await applyFluidMode(config.perfMode);
    if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send('settings:reload');
  });

  ipcMain.on('settings:clearCache', async () => {
    try {
      if (nintendoSession) await nintendoSession.clearCache();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reloadIgnoringCache();
    } catch (e) {
      console.error('Clear cache error:', e);
    }
  });

  ipcMain.on('settings:restart', () => {
    isAppQuitting = true;
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('settings:blocked', () => totalBlocked());

  ipcMain.on('save-custom-themes', (event, themes) => {
    customThemes = themes;
    saveCustomThemes();
    rebuildMenu();
  });

  ipcMain.on('apply-custom-theme', (event, themeId) => {
    applyCustomTheme(themeId);
  });

  ipcMain.on('reset-theme', () => {
    applyTheme('dark');
  });

  ipcMain.on('apply-custom-css', (event, css) => {
    applyCustomCSS(css);
  });

  ipcMain.on('disable-custom-css', () => {
    disableCustomCSS();
  });

  ipcMain.on('close-theme-editor', () => {
    if (themeEditorWindow && !themeEditorWindow.isDestroyed()) {
      themeEditorWindow.close();
    }
  });

  ipcMain.on('open-file-dialog', async (event, type) => {
    const filters = type === 'css'
      ? [{ name: 'CSS Files', extensions: ['css'] }]
      : [{ name: 'JSON Files', extensions: ['json'] }];

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf8');
        const name = path.basename(result.filePaths[0]);
        event.sender.send('file-content', { content, type, name });
      } catch (e) {
        console.error('File read error:', e);
      }
    }
  });

  ipcMain.on('export-file', async (event, { content, defaultName, type }) => {
    const filters = type === 'css'
      ? [{ name: 'CSS Files', extensions: ['css'] }]
      : [{ name: 'JSON Files', extensions: ['json'] }];

    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters
    });

    if (!result.canceled && result.filePath) {
      try {
        fs.writeFileSync(result.filePath, content, 'utf8');
      } catch (e) {
        console.error('File write error:', e);
      }
    }
  });

  // ==========================================
  // DISCORD RPC
  // ==========================================
  let ipc = null;
  let ipcReady = false;
  let nonce = 1;
  let recvBuffer = Buffer.alloc(0);
  let discordInterval = null;
  let lastActivityCache = { title: null, isPlaying: null, end: 0, private: false };

  function encodeFrame(op, payload) {
    const json = JSON.stringify(payload);
    const jsonLen = Buffer.byteLength(json, 'utf8');
    const buf = Buffer.alloc(8 + jsonLen);
    buf.writeUInt32LE(op, 0);
    buf.writeUInt32LE(jsonLen, 4);
    buf.write(json, 8, 'utf8');
    return buf;
  }

  function sendFrame(op, payload) {
    if (ipc && !ipc.destroyed) {
      try { ipc.write(encodeFrame(op, payload)); } catch {}
    }
  }

  function clearActivity() {
    sendFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: String(nonce++) });
  }

  function pushActivity() {
    if (!ipcReady || !mainWindow || !config.rpcEnabled) return;

    mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          let isPlaying = false, currentTime = 0, duration = 0;
          const medias = document.querySelectorAll('audio, video');
          for (const media of medias) {
            if (!media.paused && !media.muted) {
              isPlaying = true; currentTime = media.currentTime; duration = media.duration; break;
            }
          }
          if (isPlaying && navigator.mediaSession && navigator.mediaSession.metadata) {
            const meta = navigator.mediaSession.metadata;
            return { title: meta.title, artist: meta.artist || 'Nintendo', album: meta.album || null, artworkUrl: meta.artwork?.length > 0 ? meta.artwork[meta.artwork.length - 1].src : null, isPlaying: true, currentTime, duration };
          }
          return { title: null, artist: 'Nintendo', album: null, artworkUrl: null, isPlaying: false, currentTime: 0, duration: 0 };
        } catch (e) {
          return { title: null, artist: 'Nintendo', album: null, artworkUrl: null, isPlaying: false, currentTime: 0, duration: 0 };
        }
      })();
    `).then((data) => {
      let { title, artist, album, artworkUrl, isPlaying, currentTime, duration } = data;
      const assets = {};
      const nowSeconds = Math.round(Date.now() / 1000);
      let startTimestamp = null, endTimestamp = null;

      if (isPlaying && duration > 0) {
        startTimestamp = Math.round(nowSeconds - currentTime);
        endTimestamp = Math.round(startTimestamp + duration);
      }

      if (config.rpcPrivateMode && isPlaying) {
        title = "Hidden Track"; artist = "Private Mode"; album = null; artworkUrl = 'nintendo_music_logo';
      }

      const isSameTrack = lastActivityCache.title === title && lastActivityCache.isPlaying === isPlaying;
      const isSameTime = Math.abs(lastActivityCache.end - (endTimestamp || 0)) < 3;
      const isSamePrivateState = lastActivityCache.private === config.rpcPrivateMode;
      if (isSameTrack && isSameTime && isSamePrivateState) return;

      if (config.notificationsEnabled && lastActivityCache.title !== data.title && isPlaying && data.title && Notification.isSupported()) {
        new Notification({ title: data.title, body: data.artist, silent: true }).show();
      }

      lastActivityCache = { title, isPlaying, end: (endTimestamp || 0), private: config.rpcPrivateMode };
      assets.large_image = artworkUrl || 'nintendo_music_logo';

      // Le nom du jeu (album) remplace l'artiste générique en 2e ligne ;
      // "Nintendo" n'apparaît qu'une fois (en info-bulle), et seulement si le
      // nom du jeu prend déjà sa place en 2e ligne (sinon ce serait un doublon).
      const gameTitle = (album && album !== artist) ? album : null;
      if (gameTitle) {
        assets.large_text = artist;
      }

      const activityObj = {
        type: 2,
        details: (isPlaying && title) ? title : 'Browsing menus',
        state: (isPlaying && title) ? (gameTitle || artist) : 'Paused / Browsing',
        assets,
        instance: false,
      };

      if (isPlaying && startTimestamp && endTimestamp) {
        activityObj.timestamps = { start: startTimestamp, end: endTimestamp };
      }

      sendFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: activityObj }, nonce: String(nonce++) });
    }).catch(err => console.error('[Discord] Error:', err));
  }

  function parseFrames(data) {
    recvBuffer = Buffer.concat([recvBuffer, data]);
    while (recvBuffer.length >= 8) {
      const len = recvBuffer.readUInt32LE(4);
      if (recvBuffer.length < 8 + len) break;
      const json = recvBuffer.slice(8, 8 + len).toString('utf8');
      recvBuffer = recvBuffer.slice(8 + len);
      try {
        const msg = JSON.parse(json);
        if (msg.evt === 'READY') { ipcReady = true; if (config.rpcEnabled) pushActivity(); }
      } catch (e) {}
    }
  }

  function connectIPC(attempt) {
    if (ipcReady || !config.rpcEnabled) return;
    if (attempt > 9) return setTimeout(() => connectIPC(0), 15000);
    const pipePath = process.platform === 'win32'
      ? `\\\\?\\pipe\\discord-ipc-${attempt}`
      : `${process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp'}/discord-ipc-${attempt}`;
    const socket = net.createConnection(pipePath);
    const connectTimeout = setTimeout(() => {
      if (!ipcReady && !socket.destroyed) { socket.destroy(); connectIPC(attempt + 1); }
    }, 2000);
    socket.on('connect', () => {
      clearTimeout(connectTimeout);
      ipc = socket; ipcReady = false; recvBuffer = Buffer.alloc(0);
      socket.write(encodeFrame(0, { v: 1, client_id: CLIENT_ID }));
    });
    socket.on('data', parseFrames);
    socket.on('error', () => { socket.destroy(); if (!ipcReady) connectIPC(attempt + 1); });
    socket.on('close', () => {
      if (ipc === socket) { ipc = null; ipcReady = false; setTimeout(() => connectIPC(0), 10000); }
    });
  }

  // ==========================================
  // MENU
  // ==========================================
  function buildCustomThemesSubmenu() {
    const keys = Object.keys(customThemes);
    if (keys.length === 0) {
      return [{ label: 'Aucun thème custom', enabled: false }];
    }
    return keys.map(id => ({
      label: customThemes[id].name,
      type: 'radio',
      checked: config.activeCustomTheme === id,
      click: () => applyCustomTheme(id)
    }));
  }

  function createCustomMenu() {
    const template = [
      {
        label: t('menu.navigation'),
        submenu: [
          { label: t('menu.home'), click: () => mainWindow.loadURL('https://music.nintendo.com/') },
          { label: t('menu.reload'), role: 'reload' },
          { type: 'separator' },
          { label: t('menu.quit'), click: () => { isAppQuitting = true; app.quit(); } }
        ]
      },
      {
        label: t('menu.settings'),
        submenu: [
          { label: t('menu.openSettings'), accelerator: 'CmdOrCtrl+,', click: () => createSettingsWindow() },
          { type: 'separator' },
          {
            label: t('perf.pageCache'),
            type: 'checkbox',
            checked: config.pageCacheEnabled,
            click: (item) => { config.pageCacheEnabled = item.checked; saveConfig(); }
          },
          {
            label: t('redesign.enable'),
            type: 'checkbox',
            checked: config.redesignEnabled,
            click: async (item) => { config.redesignEnabled = item.checked; saveConfig(); await applyRedesign(); }
          },
          { type: 'separator' },
          { label: t('perf.clearCache'), click: () => ipcMain.emit('settings:clearCache') }
        ]
      },
      {
        label: t('menu.appearance'),
        submenu: [
          {
            label: t('menu.theme'),
            submenu: [
              { label: t('menu.dark'), type: 'radio', checked: config.theme === 'dark' && !config.activeCustomTheme, click: () => applyTheme('dark') },
              { label: t('menu.light'), type: 'radio', checked: config.theme === 'light' && !config.activeCustomTheme, click: () => applyTheme('light') },
              { label: t('menu.purple'), type: 'radio', checked: config.theme === 'purple' && !config.activeCustomTheme, click: () => applyTheme('purple') },
              // Pas de séparateur ici : dans Electron il scinderait le groupe
              // radio en deux, et chaque groupe afficherait sa propre coche.
              ...Object.entries(BUILT_IN_PALETTES).map(([key, theme]) => ({
                label: theme.label,
                type: 'radio',
                checked: config.theme === key && !config.activeCustomTheme,
                click: () => applyTheme(key)
              })),
              { type: 'separator' },
              {
                label: t('menu.customThemes'),
                submenu: buildCustomThemesSubmenu()
              },
              { type: 'separator' },
              { label: t('menu.themeEditor'), click: () => createThemeEditorWindow() }
            ]
          },
          {
            label: t('menu.borderRadius'),
            submenu: [
              { label: t('menu.radiusDefault'), type: 'radio', checked: config.borderRadius === 'default', click: () => applyBorderRadius('default') },
              ...[0, 4, 8, 14, 20, 30, 40, 50].map(px => ({
                label: `${px} px`,
                type: 'radio',
                checked: config.borderRadius === px,
                click: () => applyBorderRadius(px)
              }))
            ]
          },
          { type: 'separator' },
          {
            label: t('menu.alwaysOnTop'),
            type: 'checkbox',
            checked: config.alwaysOnTop,
            click: (item) => {
              config.alwaysOnTop = item.checked;
              mainWindow.setAlwaysOnTop(config.alwaysOnTop);
              saveConfig();
            }
          }
        ]
      },
      {
        label: t('menu.discord'),
        submenu: [
          {
            label: t('menu.enableRPC'),
            type: 'checkbox',
            checked: config.rpcEnabled,
            click: (item) => {
              config.rpcEnabled = item.checked;
              saveConfig();
              if (config.rpcEnabled) connectIPC(0);
              else { clearActivity(); if (ipc) { ipc.destroy(); ipc = null; ipcReady = false; } }
            }
          },
          {
            label: t('menu.privateMode'),
            type: 'checkbox',
            checked: config.rpcPrivateMode,
            click: (item) => {
              config.rpcPrivateMode = item.checked;
              saveConfig();
              if (config.rpcEnabled) { lastActivityCache.title = null; pushActivity(); }
            }
          }
        ]
      },
      {
        label: t('menu.system'),
        submenu: [
          {
            label: t('menu.notifications'),
            type: 'checkbox',
            checked: config.notificationsEnabled,
            click: (item) => {
              config.notificationsEnabled = item.checked;
              saveConfig();
            }
          },
          { type: 'separator' },
          {
            label: t('menu.runAtStartup'),
            type: 'checkbox',
            checked: config.autoStart,
            click: (item) => {
              config.autoStart = item.checked;
              app.setLoginItemSettings({ openAtLogin: config.autoStart, openAsHidden: config.startMinimized });
              saveConfig();
            }
          },
          {
            label: t('menu.startMinimized'),
            type: 'checkbox',
            checked: config.startMinimized,
            click: (item) => {
              config.startMinimized = item.checked;
              app.setLoginItemSettings({ openAtLogin: config.autoStart, openAsHidden: config.startMinimized });
              saveConfig();
            }
          },
          { type: 'separator' },
          {
            label: t('menu.hardwareAccel'),
            type: 'checkbox',
            checked: config.hardwareAccel,
            click: (item) => {
              config.hardwareAccel = item.checked;
              saveConfig();
            }
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  function rebuildMenu() {
    createCustomMenu();
  }

  // ==========================================
  // WINDOW & TRAY
  // ==========================================
  function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(nativeImage.createFromPath(iconPath));
    tray.setToolTip('Nintendo Music Client');
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
    rebuildTray();
  }

  // Le menu du tray est reconstruit quand la langue change.
  function rebuildTray() {
    if (!tray || tray.isDestroyed()) return;
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: t('tray.showHide'), click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() },
      { type: 'separator' },
      { label: t('tray.playPause'), click: () => mainWindow.webContents.executeJavaScript(`var m = document.querySelector('audio, video'); if(m) m.paused ? m.play() : m.pause();`) },
      { label: t('tray.nextTrack'), click: () => mainWindow.webContents.executeJavaScript(`navigator.mediaSession.metadata && navigator.mediaSession.playbackState ? window.dispatchEvent(new KeyboardEvent('keydown', {key: 'MediaTrackNext'})) : null;`) },
      { type: 'separator' },
      { label: t('menu.openSettings'), click: () => createSettingsWindow() },
      { label: t('menu.themeEditor'), click: () => createThemeEditorWindow() },
      { type: 'separator' },
      { label: t('menu.quit'), click: () => { isAppQuitting = true; app.quit(); } }
    ]));
  }

  // ==========================================
  // SPLASH DE DÉMARRAGE
  // ==========================================
  // Le site met un certain temps à booter (~4 Mo de JS à parser/exécuter) et
  // l'init DRM Widevine s'ajoute avant même la création de la fenêtre. Sans
  // splash, l'utilisateur clique et... rien ne s'affiche pendant ce temps.
  // Ce splash est 100% local (data URL + icône inlinée) : il apparaît
  // instantanément et se ferme dès que la vraie fenêtre est prête à peindre.
  function createSplashWindow() {
    if (splashWindow && !splashWindow.isDestroyed()) return;

    let iconData = '';
    try {
      iconData = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'icon.png')).toString('base64');
    } catch (e) {}

    splashWindow = new BrowserWindow({
      width: 420, height: 240,
      frame: false, resizable: false, movable: true,
      center: true, skipTaskbar: true, alwaysOnTop: true,
      backgroundColor: '#0f0518',
      show: false
    });

    const splashHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0f0518; color: #f3e8ff; height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    border: 1px solid #2e1065; border-radius: 10px; overflow: hidden; user-select: none;
  }
  img { width: 64px; height: 64px; border-radius: 14px; }
  .title { font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
  .sub { font-size: 12px; color: #d8b4fe; opacity: 0.75; }
  .bar { width: 200px; height: 3px; background: #2e1065; border-radius: 2px; overflow: hidden; }
  .bar i { display: block; width: 40%; height: 100%; border-radius: 2px;
           background: linear-gradient(90deg, #a855f7, #d946ef);
           animation: slide 1.1s ease-in-out infinite; }
  @keyframes slide { 0% { transform: translateX(-110%); } 100% { transform: translateX(360%); } }
</style></head><body>
  ${iconData ? `<img src="${iconData}" alt="">` : ''}
  <div class="title">Nintendo Music</div>
  <div class="bar"><i></i></div>
  <div class="sub">Chargement…</div>
</body></html>`;

    splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
    splashWindow.once('ready-to-show', () => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.show();
    });
    splashWindow.on('closed', () => { splashWindow = null; });
  }

  // Ne ferme le splash que si la fenêtre principale existe : sinon la
  // fermeture de la dernière fenêtre déclencherait 'window-all-closed' et
  // ferait quitter l'application au démarrage.
  function closeSplash() {
    if (!splashWindow || splashWindow.isDestroyed()) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    splashWindow.close();
    splashWindow = null;
  }

  function createWindow() {
    nintendoSession = session.fromPartition('persist:nintendoMusic');

    // Télémétrie relevée sur une session connectée : ~28 requêtes par
    // chargement de page (analytics BaaS + publication Google Pub/Sub),
    // plusieurs entre 400 et 600 ms, qui se disputent la connexion avec le
    // vrai contenu. On ne bloque QUE l'analytique : /core/v1/* sur le même
    // domaine, c'est l'authentification, il ne faut surtout pas y toucher.
    // Le filtre couvre toutes les catégories ; c'est le handler qui décide,
    // pour que les cases des paramètres agissent sans redémarrage.
    const filter = {
      urls: [
        '*://*.google-analytics.com/*',
        '*://*.sentry.io/*',
        '*://*.baas.nintendo.com/bigdata/*',
        '*://pubsub.googleapis.com/*'
      ]
    };
    nintendoSession.webRequest.onBeforeRequest(filter, (details, callback) => {
      const category = categorizeTelemetry(details.url);
      if (category && config.blockers[category]) {
        blockedCounts[category] = (blockedCounts[category] || 0) + 1;
        return callback({ cancel: true });
      }
      callback({ cancel: false });
    });
    nintendoSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = customUserAgent;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    // ---- Cache des PAGES (pas des assets) ----
    // Mesuré : les assets sont déjà "immutable" (donc en cache), mais le
    // document HTML repart en réseau à CHAQUE ouverture (deliveryType
    // "network", ~190 ms de TTFB) car le serveur envoie max-age=0. On
    // réécrit donc le cache-control des seuls documents et payloads de
    // navigation RSC, en gardant le stale-while-revalidate du serveur :
    // la page s'affiche depuis le disque, puis se rafraîchit en arrière-plan.
    // Jamais les API (api.m / accounts / baas) : jetons de lecture, droits
    // et état de session doivent rester frais.
    nintendoSession.webRequest.onHeadersReceived((details, callback) => {
      try {
        if (!config.pageCacheEnabled || details.method !== 'GET' || details.statusCode !== 200) {
          return callback({});
        }
        if (!details.url.startsWith('https://music.nintendo.com/')) return callback({});
        if (details.url.includes('/_next/static/')) return callback({}); // déjà immutable
        if (details.url.includes('/api/')) return callback({});

        const isDocument = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame';
        const isNavigationPayload = details.url.includes('_rsc=');
        if (!isDocument && !isNavigationPayload) return callback({});

        const headers = Object.assign({}, details.responseHeaders);
        // Une réponse qui pose un cookie porte de l'état de session : on la laisse passer.
        for (const key of Object.keys(headers)) {
          const k = key.toLowerCase();
          if (k === 'set-cookie') return callback({});
          if (k === 'cache-control' || k === 'expires' || k === 'pragma') delete headers[key];
        }
        headers['cache-control'] = [`public, max-age=${PAGE_CACHE_TTL_SECONDS}, stale-while-revalidate=86400`];
        callback({ responseHeaders: headers });
      } catch (e) {
        callback({});
      }
    });

    // Préchauffe DNS + TLS pendant que la fenêtre se crée. Origines relevées
    // sur une vraie session connectée : les artworks (88 requêtes !) et la
    // passerelle d'authentification BaaS pesaient chacun leur propre
    // résolution DNS + poignée de main TLS, en plein chemin critique.
    const PRECONNECT_ORIGINS = [
      'https://music.nintendo.com',
      'https://image-assets.m.nintendo.com',
      'https://api.m.nintendo.com',
      'https://accounts.nintendo.com',
      'https://api.accounts.nintendo.com',
      'https://cdn.accounts.nintendo.com'
    ];
    for (const origin of PRECONNECT_ORIGINS) {
      try {
        nintendoSession.preconnect({ url: origin, numSockets: origin === 'https://music.nintendo.com' ? 4 : 1 });
      } catch (e) {}
    }

    mainWindow = new BrowserWindow({
      width: 1200, height: 800,
      autoHideMenuBar: true,
      alwaysOnTop: config.alwaysOnTop,
      transparent: false, hasShadow: true,
      show: false,
      webPreferences: {
        session: nintendoSession, nodeIntegration: false, contextIsolation: true,
        disableBlinkFeatures: 'WebAuthentication', plugins: true,
        backgroundThrottling: false, acceleratedRendering: true
      }
    });

    createCustomMenu();
    mainWindow.loadURL('https://music.nintendo.com/');

    mainWindow.once('ready-to-show', () => {
      closeSplash();
      if (!config.startMinimized) mainWindow.show();
    });

    // Filets de sécurité : si la page ne peint jamais (hors ligne, erreur
    // réseau), le splash ne doit pas rester bloqué à l'écran indéfiniment.
    mainWindow.webContents.on('did-fail-load', () => {
      closeSplash();
      if (!config.startMinimized && mainWindow && !mainWindow.isVisible()) mainWindow.show();
    });
    setTimeout(() => {
      closeSplash();
      if (!config.startMinimized && mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 20000);

    mainWindow.on('close', (event) => {
      if (!isAppQuitting) { event.preventDefault(); mainWindow.hide(); }
    });

    // Injecté dès que le DOM existe, donc avant que le site n'ait fini de
    // s'exécuter : notre écran recouvre le sien pendant tout le démarrage.
    mainWindow.webContents.on('dom-ready', () => {
      if (!config.customLoader) return;
      mainWindow.webContents.executeJavaScript(buildLoaderScript()).catch(() => {});
    });

    mainWindow.webContents.on('media-started-playing', () => pushActivity());
    mainWindow.webContents.on('media-paused', () => pushActivity());

    let visualsApplied = false;
    mainWindow.webContents.on('did-finish-load', async () => {
      // Applique le thème actif
      if (config.activeCustomTheme && customThemes[config.activeCustomTheme]) {
        await applyCustomTheme(config.activeCustomTheme);
      } else {
        await applyTheme(config.theme);
      }
      await applyBorderRadius(config.borderRadius);

      // Réapplique le CSS custom si activé
      if (config.customCSSEnabled && config.customCSS) {
        await applyCustomCSS(config.customCSS);
      }

      // Réapplique le mode fluide si activé
      if (config.perfMode) {
        await applyFluidMode(true);
      }

      // Réapplique le redesign si activé
      await applyRedesign();

      if (visualsApplied) return;
      visualsApplied = true;

      setTimeout(() => {
        if (config.rpcEnabled) connectIPC(0);
        discordInterval = setInterval(pushActivity, 1000);
      }, 5000);
    });
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Affiché AVANT l'init DRM : c'est justement pendant cette attente que
    // l'app semblait ne rien faire au lancement.
    if (!config.startMinimized) createSplashWindow();

    try { await components.whenReady(); } catch (e) { console.error("DRM Error:", e); }
    app.on('web-contents-created', (event, contents) => {
      contents.on('enter-html-full-screen', () => false);
    });
    createTray();
    createWindow();
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow) mainWindow.webContents.executeJavaScript(`var m = document.querySelector('audio, video'); if(m) { m.paused ? m.play() : m.pause(); }`);
    });
  });

  app.on('window-all-closed', () => {
    if (discordInterval) clearInterval(discordInterval);
    if (ipc) ipc.destroy();
    app.quit();
    setTimeout(() => process.exit(0), 100);
  });
}
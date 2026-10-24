<?php
$siteName = setting('site_name', 'OPTICTOPUS');
$pageTitle = $pageTitle ?? $siteName;
$pageDescription = $pageDescription ?? setting('site_description');
$accent = setting('accent_color', '#A879F5');
if (!preg_match('/^#[a-f\d]{6}$/i', $accent)) $accent = '#A879F5';
$logo = setting('logo_image');
$favicon = setting('favicon_image');
$bodyPage = $bodyPage ?? 'home';
$bodyProject = (int)($bodyProject ?? 0);
$theme = setting('default_theme', 'dark') === 'light' ? 'light' : 'dark';
?><!doctype html>
<html lang="en" data-theme="<?= e($theme) ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="description" content="<?= e($pageDescription) ?>">
  <meta name="keywords" content="<?= e(setting('seo_keywords')) ?>">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
  <meta property="og:title" content="<?= e($pageTitle) ?>">
  <meta property="og:description" content="<?= e($pageDescription) ?>">
  <meta property="og:type" content="website">
  <meta property="og:url" content="<?= e($canonical ?? absolute_url()) ?>">
  <link rel="canonical" href="<?= e($canonical ?? absolute_url()) ?>">
  <?php if ($favicon): ?><link rel="icon" href="<?= e(image_src($favicon)) ?>"><?php else: ?><link rel="icon" href="<?= e(url('assets/img/favicon.svg')) ?>" type="image/svg+xml"><?php endif; ?>
  <link rel="stylesheet" href="<?= e(url('assets/css/site.css')) ?>?v=7.0">
  <link rel="stylesheet" href="<?= e(url('assets/css/octo-animation.css')) ?>?v=7.0">
  <style>:root{--accent:<?= e($accent) ?>}</style>
  <script>try{const t=localStorage.getItem('portfolio_theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>
  <title><?= e($pageTitle) ?></title>
</head>
<body data-page="<?= e($bodyPage) ?>" data-project-id="<?= $bodyProject ?>" data-animations="<?= global_flag('animations_enabled') ? 'on':'off' ?>" data-background="<?= e(setting('background_style','glow')) ?>" data-layout="<?= e(setting('layout_style','grid')) ?>">
<svg xmlns="http://www.w3.org/2000/svg" class="svg-library" aria-hidden="true">
  <symbol id="social-facebook" viewBox="0 0 24 24"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.87v-6.98H7.9V12h2.54V9.8c0-2.5 1.5-3.9 3.78-3.9 1.1 0 2.25.2 2.25.2v2.46H15.2c-1.25 0-1.64.78-1.64 1.58V12h2.78l-.45 2.89h-2.33v6.98A10 10 0 0 0 22 12Z"/></symbol>
  <symbol id="social-instagram" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></symbol>
  <symbol id="social-telegram" viewBox="0 0 24 24"><path fill="currentColor" d="M21.9 3.6 18.6 20c-.25 1.15-.93 1.43-1.88.9l-5.3-3.9-2.55 2.46c-.28.28-.52.52-1.07.52l.38-5.4 9.82-8.87c.42-.38-.1-.6-.65-.23L5.2 13.2.03 11.6C-1 11.27-1.01 10.5.24 10L20.1 2.34c.93-.34 1.75.22 1.8 1.26Z" transform="translate(1 1) scale(.92)"/></symbol>
  <symbol id="social-gmail" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h2l7 5.25L19 5h2c.55 0 1 .45 1 1v12h-4V9.2l-6 4.5-6-4.5V18H2V6c0-.55.45-1 1-1Z"/></symbol>
  <symbol id="social-whatsapp" viewBox="0 0 24 24"><path fill="currentColor" d="M12.1 2a9.9 9.9 0 0 0-8.52 15L2 22l5.17-1.55A10 10 0 1 0 12.1 2Zm0 18a8.1 8.1 0 0 1-4.12-1.12l-.3-.18-3.05.91.94-2.96-.2-.31a8.08 8.08 0 1 1 6.73 3.66Zm4.46-6c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.57.12-.16.25-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.13-1.05-.39-2-1.24-.74-.67-1.24-1.49-1.38-1.74-.14-.24-.01-.37.1-.5l.38-.44c.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.16 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.52.6.19 1.14.16 1.57.1.48-.08 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.3Z"/></symbol>
  <symbol id="social-tiktok" viewBox="0 0 24 24"><path fill="currentColor" d="M16.7 2c.27 2.37 1.6 3.75 4 3.9v3.85a8.4 8.4 0 0 1-4-1.12v6.18c0 4.9-5.27 7.56-9.12 5.13-4.1-2.58-3.48-9.43 1.15-11.12 1.06-.39 2.24-.56 3.42-.43v3.92c-1.62-.55-3.63.27-3.91 1.98-.31 1.86 1.26 3.16 2.96 2.83 1.16-.22 1.76-1.23 1.76-2.5V2h3.74Z"/></symbol>
</svg>
<div class="site-shell">
<canvas class="galaxy-sky" data-galaxy-sky aria-hidden="true"></canvas>
<header class="site-header" id="top">
  <nav class="nav-wrap container" aria-label="Main navigation">
    <a class="wordmark" href="<?= e(url()) ?>" aria-label="<?= e($siteName) ?> home">
      <?php if ($logo): ?><img src="<?= e(image_src($logo)) ?>" alt="" class="brand-logo"><?php else: ?><img src="<?= e(url('assets/img/optictopus-mark.svg')) ?>" alt="" class="brand-logo"><?php endif; ?>
      <span><?= e($siteName) ?></span>
    </a>
    <div class="nav-links" id="main-menu">
      <a href="<?= e(url('#top')) ?>">Home</a><a href="<?= e(url('#about')) ?>">About</a><a href="<?= e(url('#projects')) ?>">Projects</a><a href="<?= e(url('#contact')) ?>">Contact</a>
    </div>
    <div class="nav-actions">
      <button type="button" class="icon-btn theme-toggle" title="Toggle color theme" aria-label="Toggle color theme"><span class="theme-symbol">☾</span></button>
      <a class="nav-hire" href="<?= e(url('#contact')) ?>">Let's talk <span aria-hidden="true">↗</span></a>
      <button type="button" class="icon-btn menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="main-menu">☰</button>
    </div>
  </nav>
</header>
<main id="main-content">

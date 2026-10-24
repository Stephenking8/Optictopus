<?php
require_admin();
$active = $active ?? 'dashboard';
$pageTitle = $pageTitle ?? 'Dashboard';
$flash=take_flash();
$accent = setting('accent_color','#A879F5'); if (!preg_match('/^#[a-f\d]{6}$/i',$accent)) $accent='#A879F5';
$navItems = [
 ['dashboard','index.php','◫','Dashboard'],['projects','projects.php','▦','Projects'],['categories','categories.php','◇','Categories'],
 ['analytics','analytics.php','▥','Analytics'],['engagement','engagement.php','♡','Engagement'],['settings','settings.php','⚙','Website Settings'],['security','security.php','♧','Security'],
];
?><!doctype html><html lang="en" data-theme="<?= e(setting('default_theme','dark')) ?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="csrf-token" content="<?= e(csrf_token()) ?>"><title><?= e($pageTitle) ?> · Portfolio Admin</title><link rel="icon" href="<?= e(url('assets/img/favicon.svg')) ?>" type="image/svg+xml"><link rel="stylesheet" href="<?= e(url('assets/css/admin.css')) ?>?v=2.0"><style>:root{--accent:<?= e($accent) ?>}</style><script>try{const t=localStorage.getItem('portfolio_theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script></head>
<body><div class="admin-layout"><aside class="sidebar" id="sidebar"><a class="sidebar-brand" href="<?= e(url('admin/index.php')) ?>"><img src="<?= e(url('assets/img/optictopus-mark.svg')) ?>" alt="" class="admin-brand-logo"><span>OPTICTOPUS <small>CONTROL CENTER</small></span></a><p class="nav-caption">WORKSPACE</p><nav aria-label="Admin navigation"><?php foreach ($navItems as [$key,$path,$icon,$name]): ?><a class="side-link <?= $active===$key?'active':'' ?>" href="<?= e(url('admin/'.$path)) ?>"><span class="side-icon"><?= e($icon) ?></span><?= e($name) ?></a><?php endforeach; ?></nav><div class="sidebar-bottom"><a href="<?= e(url()) ?>" target="_blank" rel="noopener">↗ View live portfolio</a><form action="<?= e(url('admin/logout.php')) ?>" method="post"><?= csrf_field() ?><button class="logout-btn" type="submit">⇥ Sign out</button></form></div></aside>
<div class="admin-main"><header class="admin-topbar"><button type="button" class="nav-open" aria-controls="sidebar" aria-expanded="false" aria-label="Toggle admin navigation">☰</button><span class="breadcrumb">Workspace <span>/</span> <?= e($pageTitle) ?></span><div class="top-actions"><button type="button" class="small-theme-toggle" aria-label="Toggle color theme">☾</button><span class="admin-avatar"><?= e(strtoupper(substr(admin_name(),0,1))) ?></span><span><?= e(admin_name()) ?></span></div></header><main class="admin-content">
<?php if ($flash): ?><div class="alert <?= e($flash[1]) ?>" role="status"><?= e($flash[0]) ?></div><?php endif; ?>

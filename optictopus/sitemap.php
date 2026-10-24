<?php
require __DIR__.'/includes/bootstrap.php'; require_ready();
header('Content-Type: application/xml; charset=utf-8');
$site = rtrim((string)cfg('site_url'),'/');
if ($site==='') { $https=!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off'; $site=($https?'https://':'http://').($_SERVER['HTTP_HOST']??'localhost'); }
$urls=[absolute_url(),absolute_url('privacy.php')];
foreach (all_projects() as $project) $urls[]=$site.project_url($project);
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
foreach ($urls as $u) echo '<url><loc>'.htmlspecialchars($u,ENT_XML1|ENT_COMPAT,'UTF-8').'</loc></url>';
echo '</urlset>';

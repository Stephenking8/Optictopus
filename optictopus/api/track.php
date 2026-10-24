<?php
require dirname(__DIR__).'/includes/bootstrap.php';
require_post(); verify_csrf(); require_ready();
if (!global_flag('analytics_enabled') || ($_COOKIE['portfolio_consent'] ?? '')!=='granted') json_response(['ok'=>false,'message'=>'Analytics not enabled or consented.'],403);
if (!throttle('analytics',30,60)) json_response(['ok'=>false,'message'=>'Rate limit exceeded.'],429);
$ua=substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''),0,500);
if ($ua==='' || preg_match('/bot|crawler|spider|headless|lighthouse|pingdom|uptime|preview|facebookexternalhit|slurp/i',$ua)) json_response(['ok'=>false,'message'=>'Automated visits excluded.'],202);
$page=(string)($_POST['page']??'');
if (!in_array($page,['home','project'],true)) json_response(['ok'=>false,'message'=>'Invalid page.'],400);
$id=$page==='project'?(int)($_POST['project_id']??0):null;
if ($page==='project' && !project_exists_public((int)$id)) json_response(['ok'=>false,'message'=>'Invalid project.'],404);
$hash=browser_visitor_hash(true);
$device='Desktop';
if (preg_match('/iPad|Tablet|Kindle|Silk|Android(?!.*Mobile)/i',$ua)) $device='Tablet';
elseif (preg_match('/iPhone|iPod|Android|Mobile|Windows Phone/i',$ua)) $device='Mobile';
$model='Unknown Device'; $brand='Unknown';
if (preg_match('/\b(SM-[A-Z0-9]+)\b/i',$ua,$m)) { $model=substr($m[1],0,70); $brand='Samsung'; }
elseif (preg_match('/\b(Pixel [2-9][0-9]?(?: Pro| XL|a)?)\b/i',$ua,$m)) { $model=substr($m[1],0,70); $brand='Google'; }
elseif (preg_match('/iPhone|iPad|iPod/i',$ua)) $brand='Apple';
$os='Unknown';
foreach (['Windows'=>'Windows','iPhone|iPad|iPod'=>'iOS / iPadOS','Android'=>'Android','Mac OS|Macintosh'=>'macOS','Linux'=>'Linux'] as $pattern=>$label) if (preg_match('~'.$pattern.'~i',$ua)) { $os=$label; break; }
$browser='Unknown';
foreach (['Edg/'=>'Edge','OPR/|Opera'=>'Opera','Firefox/'=>'Firefox','CriOS/|Chrome/'=>'Chrome','Safari/'=>'Safari'] as $pattern=>$label) if (preg_match('~'.$pattern.'~i',$ua)) { $browser=$label; break; }
$country='Unknown'; $region='Unknown'; $city='Unknown';
if (cfg('trusted_cloudflare',false)) {
 $c=(string)($_SERVER['HTTP_CF_IPCOUNTRY']??'');
 if (preg_match('/^[A-Z]{2}$/D',$c) && !in_array($c,['XX','T1'],true)) $country=$c;
 // Cloudflare ordinarily does not provide city, region or phone model information.
}
try {
 db()->prepare('INSERT INTO visitors(visitor_hash) VALUES (?) ON DUPLICATE KEY UPDATE last_seen=UTC_TIMESTAMP()')->execute([$hash]);
 // Page refreshes within 30 seconds are not additional page views.
 $s=db()->prepare('SELECT 1 FROM website_visits WHERE visitor_hash=? AND page_type=? AND (project_id <=> ?) AND visited_at > UTC_TIMESTAMP()-INTERVAL 30 SECOND LIMIT 1');
 $s->execute([$hash,$page,$id]);
 if (!$s->fetch()) {
   db()->prepare('INSERT INTO website_visits(visitor_hash,page_type,project_id,device_type,device_brand,device_model,os_name,browser_name,country,region,city) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute([$hash,$page,$id,$device,$brand,$model,$os,$browser,$country,$region,$city]);
 }
 if ($page==='project') {
  // Project view only on actual detail page, deduplicated for 30 minutes per consenting browser.
  $s=db()->prepare('SELECT 1 FROM project_views WHERE visitor_hash=? AND project_id=? AND viewed_at>UTC_TIMESTAMP()-INTERVAL 30 MINUTE LIMIT 1');
  $s->execute([$hash,$id]);
  if (!$s->fetch()) db()->prepare('INSERT INTO project_views(project_id,visitor_hash) VALUES (?,?)')->execute([$id,$hash]);
 }
 if (random_int(1,100)===1) {
  $days=max(7,min(730,(int)setting('retention_days','365')));
  db()->prepare('DELETE FROM website_visits WHERE visited_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)')->execute([$days]);
  db()->prepare('DELETE FROM project_views WHERE viewed_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)')->execute([$days]);
  db()->prepare('DELETE FROM visitors WHERE last_seen < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)')->execute([$days]);
  db()->exec('DELETE FROM rate_limits WHERE window_start < UNIX_TIMESTAMP()-86400');
 }
 json_response(['ok'=>true]);
} catch (Throwable $ex) { error_log('Track error: '.$ex->getMessage()); json_response(['ok'=>false,'message'=>'Tracking temporarily unavailable.'],500); }

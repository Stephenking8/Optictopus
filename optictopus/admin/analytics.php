<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin();
$period=(string)($_GET['period']??'30');
$now=new DateTimeImmutable('now',new DateTimeZone('UTC'));
$end=$now->modify('+1 second');
$start=match($period) { 'today'=>$now->setTime(0,0), '7'=>$now->modify('-7 days'), '30'=>$now->modify('-30 days'), default=>$now->modify('-30 days') };
if ($period==='custom') {
 $a=DateTimeImmutable::createFromFormat('!Y-m-d',(string)($_GET['start']??''),new DateTimeZone('UTC'));
 $b=DateTimeImmutable::createFromFormat('!Y-m-d',(string)($_GET['end']??''),new DateTimeZone('UTC'));
 if ($a && $b && $a<=$b && $b->diff($a)->days<=366) { $start=$a; $end=$b->modify('+1 day'); }
 else { $period='30'; $start=$now->modify('-30 days'); }
}
$between='visited_at>=? AND visited_at<?';
$dateParams=[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s')];
$params=$dateParams;
$deviceOptions=db()->query('SELECT DISTINCT device_type FROM website_visits ORDER BY device_type')->fetchAll(PDO::FETCH_COLUMN);
$countryOptions=db()->query('SELECT DISTINCT country FROM website_visits ORDER BY country')->fetchAll(PDO::FETCH_COLUMN);
$chosenDevice=(string)($_GET['device']??'');
$chosenCountry=(string)($_GET['country']??'');
if ($chosenDevice!=='' && in_array($chosenDevice,$deviceOptions,true)) { $between.=' AND device_type=?'; $params[]=$chosenDevice; }
else $chosenDevice='';
if ($chosenCountry!=='' && in_array($chosenCountry,$countryOptions,true)) { $between.=' AND country=?'; $params[]=$chosenCountry; }
else $chosenCountry='';
$run=function(string $sql,?array $p=null) use ($params) { $s=db()->prepare($sql); $s->execute($p??$params); return $s->fetchAll(); };
if (isset($_GET['download']) && $_GET['download']==='csv') {
 header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="portfolio-analytics-'.gmdate('Ymd').'.csv"'); header('Cache-Control: no-store');
 $out=fopen('php://output','w'); fputcsv($out,['Date (UTC)','Page type','Project','Device','Brand','Model','OS','Browser','Country','Region','City']);
 $csvWhere='v.visited_at>=? AND v.visited_at<?';
 if ($chosenDevice!=='') $csvWhere.=' AND v.device_type=?';
 if ($chosenCountry!=='') $csvWhere.=' AND v.country=?';
 $stmt=db()->prepare('SELECT v.visited_at,v.page_type,p.title,v.device_type,v.device_brand,v.device_model,v.os_name,v.browser_name,v.country,v.region,v.city FROM website_visits v LEFT JOIN projects p ON v.project_id=p.id WHERE '.$csvWhere.' ORDER BY v.visited_at DESC LIMIT 250000');
 $stmt->execute($params); while ($r=$stmt->fetch()) fputcsv($out,array_values($r)); fclose($out); exit;
}
$stats=$run('SELECT COUNT(*) views, COUNT(DISTINCT visitor_hash) visitors, COUNT(DISTINCT DATE(visited_at)) days FROM website_visits WHERE '.$between)[0];
$daily=$run('SELECT DATE(visited_at) day,COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors FROM website_visits WHERE '.$between.' GROUP BY DATE(visited_at) ORDER BY day');
$devices=$run('SELECT device_type label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY device_type ORDER BY total DESC');
$countries=$run('SELECT country label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY country ORDER BY total DESC LIMIT 8');
$browsers=$run('SELECT browser_name label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY browser_name ORDER BY total DESC LIMIT 8');
$oses=$run('SELECT os_name label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY os_name ORDER BY total DESC LIMIT 8');
$brands=$run('SELECT device_brand label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY device_brand ORDER BY total DESC LIMIT 8');
$models=$run('SELECT device_model label,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY device_model ORDER BY total DESC LIMIT 8');
$places=$run('SELECT region,city,COUNT(*) total FROM website_visits WHERE '.$between.' GROUP BY region,city ORDER BY total DESC LIMIT 8');
$topViews=$run('SELECT p.title,COUNT(v.id) total FROM project_views v JOIN projects p ON p.id=v.project_id WHERE v.viewed_at>=? AND v.viewed_at<? GROUP BY p.id,p.title ORDER BY total DESC LIMIT 8', $dateParams);
$projectAudience=db()->query('SELECT p.id,p.title,COUNT(v.id) views,COUNT(DISTINCT v.visitor_hash) unique_viewers FROM projects p LEFT JOIN project_views v ON v.project_id=p.id WHERE p.deleted_at IS NULL GROUP BY p.id,p.title ORDER BY views DESC LIMIT 30')->fetchAll();
$mostLiked=db()->query('SELECT p.title,COUNT(l.id) total FROM projects p LEFT JOIN project_likes l ON l.project_id=p.id WHERE p.deleted_at IS NULL GROUP BY p.id,p.title ORDER BY total DESC LIMIT 8')->fetchAll();
$topRatings=db()->query('SELECT p.title,ROUND(AVG(r.stars),2) average,COUNT(r.id) total FROM project_ratings r JOIN projects p ON p.id=r.project_id WHERE p.deleted_at IS NULL GROUP BY p.id,p.title ORDER BY average DESC,total DESC LIMIT 8')->fetchAll();
$projectViewCount=(int)$run('SELECT COUNT(*) total FROM project_views WHERE viewed_at>=? AND viewed_at<?', $dateParams)[0]['total'];
$pageTitle='Analytics';$active='analytics';require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">CONSENT-BASED SITE INSIGHTS</p><h1>Visitor <span class="accent">analytics.</span></h1><p>Approximate, privacy-conscious traffic data. All dates use UTC.</p></div><a class="button button-small" href="<?= e(url('admin/analytics.php?'.http_build_query(array_merge($_GET,['download'=>'csv'])))) ?>">↓ Export CSV</a></div>
<form method="get" class="panel analytics-filter"><label>Time period<select name="period" id="analytics-period"><option value="today" <?= $period==='today'?'selected':'' ?>>Today</option><option value="7" <?= $period==='7'?'selected':'' ?>>Last 7 days</option><option value="30" <?= $period==='30'?'selected':'' ?>>Last 30 days</option><option value="custom" <?= $period==='custom'?'selected':'' ?>>Custom range</option></select></label><label>From<input type="date" name="start" value="<?= e($_GET['start'] ?? $start->format('Y-m-d')) ?>"></label><label>To<input type="date" name="end" value="<?= e($_GET['end'] ?? $now->format('Y-m-d')) ?>"></label><label>Device<select name="device"><option value="">All devices</option><?php foreach ($deviceOptions as $option): ?><option value="<?= e($option) ?>" <?= $chosenDevice===$option?'selected':'' ?>><?= e($option) ?></option><?php endforeach; ?></select></label><label>Country<select name="country"><option value="">All countries</option><?php foreach ($countryOptions as $option): ?><option value="<?= e($option) ?>" <?= $chosenCountry===$option?'selected':'' ?>><?= e($option) ?></option><?php endforeach; ?></select></label><button type="submit" class="button button-primary">Apply filters</button></form>
<div class="metric-grid metrics-small"><div class="metric-card"><p>Page views</p><strong><?= (int)$stats['views'] ?></strong></div><div class="metric-card"><p>Estimated unique visitors</p><strong><?= (int)$stats['visitors'] ?></strong></div><div class="metric-card"><p>Project detail views*</p><strong><?= $projectViewCount ?></strong></div><div class="metric-card"><p>Days with visits</p><strong><?= (int)$stats['days'] ?></strong></div></div>
<section class="panel"><div class="panel-head"><div><h2>Project audience details</h2><p>All retained project views and unique browser estimates · select a project for detailed breakdowns</p></div></div><div class="table-scroll"><table><thead><tr><th>Project</th><th>Detail views</th><th>Estimated unique viewers</th><th>Report</th></tr></thead><tbody><?php foreach ($projectAudience as $p): ?><tr><td><strong><?= e($p['title']) ?></strong></td><td><?= (int)$p['views'] ?></td><td><?= (int)$p['unique_viewers'] ?></td><td><a href="<?= e(url('admin/project-analytics.php?id='.$p['id'])) ?>">Open insights ↗</a></td></tr><?php endforeach; ?></tbody></table></div></section>
<section class="panel"><div class="panel-head"><div><h2>Traffic trends</h2><p>Page views and estimated unique visitors by day</p></div></div><canvas class="traffic-chart" height="260" data-chart='<?= e(json_encode($daily)) ?>' role="img" aria-label="Daily views and unique visitors chart"></canvas><div class="chart-key"><span class="key-one">■ Page views</span><span class="key-two">■ Unique visitors</span></div></section>
<div class="analytics-grid">
<?php $groups=[['Device types',$devices],['Visitors by country',$countries],['Web browsers',$browsers],['Operating systems',$oses],['Detected device brands',$brands],['Reported device models',$models],['Popular projects (views)',$topViews],['Most liked (all time)',$mostLiked]]; foreach ($groups as [$title,$data]): $max=max(1,(int)($data[0]['total']??1)); ?><section class="panel"><div class="panel-head"><h2><?= e($title) ?></h2></div><?php if (!$data): ?><p class="muted">No data for this period.</p><?php endif; ?><?php foreach ($data as $item): ?><div class="bar-row"><div><span><?= e($item['label']??$item['title']) ?></span><strong><?= (int)$item['total'] ?></strong></div><div class="bar-track"><div class="bar-fill" style="width:<?= max(1,min(100,round((int)$item['total']/$max*100))) ?>%"></div></div></div><?php endforeach; ?></section><?php endforeach; ?>
<section class="panel"><div class="panel-head"><h2>Highest-rated projects (all time)</h2></div><?php if (!$topRatings): ?><p class="muted">No ratings yet.</p><?php endif; ?><?php foreach ($topRatings as $p): ?><div class="rank-item"><strong><?= e($p['title']) ?></strong><em>★ <?= number_format((float)$p['average'],2) ?> · <?= (int)$p['total'] ?> votes</em></div><?php endforeach; ?></section>
<section class="panel"><div class="panel-head"><h2>Approximate regions & cities</h2></div><?php foreach ($places as $place): ?><div class="rank-item"><strong><?= e($place['region']) ?> / <?= e($place['city']) ?></strong><em><?= (int)$place['total'] ?></em></div><?php endforeach; ?><p class="hint">Country is populated only from a trusted Cloudflare country header when configured. Region and city may remain Unknown on free hosting. Phone models are best-effort only.</p></section>
</div><p class="hint">*Analytics use opt-in first-party random IDs and exclude ordinary rapid repeat views. Geolocation, unique visitor estimates and device models are not exact. Raw IP addresses are not stored. *Project view totals and popular-project rankings are date-filtered, but not filtered by country or device; their events do not store those fields.* Analytics records are retained for up to <?= (int)setting('retention_days','365') ?> days.</p>
<?php require __DIR__.'/_footer.php'; ?>

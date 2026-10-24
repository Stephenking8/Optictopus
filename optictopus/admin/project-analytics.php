<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin();
$id=(int)($_GET['id']??0);
$stmt=db()->prepare('SELECT id,title,slug,publication,is_hidden FROM projects WHERE id=?'); $stmt->execute([$id]); $project=$stmt->fetch();
if (!$project) { http_response_code(404); exit('Project not found.'); }
$period=(string)($_GET['period']??'30');
$start=match($period) {'7'=>7,'90'=>90,'all'=>36500,default=>30};
$views=db()->prepare('SELECT COUNT(*) total,COUNT(DISTINCT visitor_hash) uniques FROM project_views WHERE project_id=? AND viewed_at>=UTC_TIMESTAMP()-INTERVAL ? DAY');
$views->execute([$id,$start]); $viewStats=$views->fetch();
$visits=db()->prepare('SELECT COUNT(*) total,COUNT(DISTINCT visitor_hash) uniques FROM website_visits WHERE project_id=? AND visited_at>=UTC_TIMESTAMP()-INTERVAL ? DAY');
$visits->execute([$id,$start]);$visitStats=$visits->fetch();
$series=db()->prepare('SELECT DATE(viewed_at) day,COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors FROM project_views WHERE project_id=? AND viewed_at>=UTC_TIMESTAMP()-INTERVAL ? DAY GROUP BY DATE(viewed_at) ORDER BY day');
$series->execute([$id,$start]);$daily=$series->fetchAll();
$byDevice=db()->prepare('SELECT device_type label,COUNT(*) total FROM website_visits WHERE project_id=? AND visited_at>=UTC_TIMESTAMP()-INTERVAL ? DAY GROUP BY device_type ORDER BY total DESC');$byDevice->execute([$id,$start]);$devices=$byDevice->fetchAll();
$byCountry=db()->prepare('SELECT country label,COUNT(*) total FROM website_visits WHERE project_id=? AND visited_at>=UTC_TIMESTAMP()-INTERVAL ? DAY GROUP BY country ORDER BY total DESC LIMIT 10');$byCountry->execute([$id,$start]);$countries=$byCountry->fetchAll();
$ratingStmt=db()->prepare('SELECT stars,COUNT(*) total FROM project_ratings WHERE project_id=? GROUP BY stars ORDER BY stars DESC');$ratingStmt->execute([$id]);$ratings=$ratingStmt->fetchAll();
$likeStmt=db()->prepare('SELECT COUNT(*) FROM project_likes WHERE project_id=?');$likeStmt->execute([$id]);$likes=(int)$likeStmt->fetchColumn();
$pageTitle='Project Analytics';$active='analytics';require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">PROJECT-SPECIFIC AUDIENCE</p><h1><?= e($project['title']) ?></h1><p>Detail views, estimated unique browsers, reactions and feedback.</p></div><a href="<?= e(url('admin/analytics.php')) ?>" class="button button-small">← Analytics</a></div>
<form method="get" class="panel analytics-filter"><input type="hidden" name="id" value="<?= $id ?>"><label>Report period<select name="period"><option value="7" <?= $period==='7'?'selected':'' ?>>Last 7 days</option><option value="30" <?= $period==='30'?'selected':'' ?>>Last 30 days</option><option value="90" <?= $period==='90'?'selected':'' ?>>Last 90 days</option><option value="all" <?= $period==='all'?'selected':'' ?>>All retained history</option></select></label><button class="button button-primary" type="submit">Apply</button><a class="button button-small" href="<?= e(url('admin/project-edit.php?id='.$id)) ?>">Edit project ↗</a></form>
<div class="metric-grid metrics-small"><div class="metric-card"><p>Detail views</p><strong><?= (int)$viewStats['total'] ?></strong></div><div class="metric-card"><p>Unique detail viewers*</p><strong><?= (int)$viewStats['uniques'] ?></strong></div><div class="metric-card"><p>Page view events</p><strong><?= (int)$visitStats['total'] ?></strong></div><div class="metric-card"><p>Total hearts (all time)</p><strong><?= $likes ?></strong></div></div>
<section class="panel"><div class="panel-head"><h2>Detail views over time</h2></div><canvas class="traffic-chart" data-chart='<?= e(json_encode($daily)) ?>' height="240" role="img" aria-label="Project detail page view trend"></canvas></section>
<div class="analytics-grid"><section class="panel"><h2>Rating distribution (all time)</h2><?php if (!$ratings): ?><p class="muted">No ratings submitted yet.</p><?php endif; ?><?php $max=max(1,...array_map(fn($x)=>(int)$x['total'],$ratings));foreach ($ratings as $r): ?><div class="bar-row"><div><span><?= (int)$r['stars'] ?> ★</span><strong><?= (int)$r['total'] ?></strong></div><div class="bar-track"><div class="bar-fill" style="width:<?= round((int)$r['total']/$max*100) ?>%"></div></div></div><?php endforeach; ?></section>
<?php foreach ([['Visitor devices',$devices],['Visitor countries',$countries]] as [$title,$group]): ?><section class="panel"><h2><?= e($title) ?></h2><?php if (!$group): ?><p class="muted">No data in this period.</p><?php endif; ?><?php foreach ($group as $row): ?><div class="rank-item"><strong><?= e($row['label']) ?></strong><em><?= (int)$row['total'] ?> visits</em></div><?php endforeach; ?></section><?php endforeach; ?></div>
<p class="hint">*Unique visitors are estimated first-party browser identifiers among consenting visitors, not identified people. Project-specific page view events are deduplicated at a different interval than detail view counters.</p>
<?php require __DIR__.'/_footer.php'; ?>

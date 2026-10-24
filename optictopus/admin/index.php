<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin();
$totals = [
 'projects'=>(int)db()->query('SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL')->fetchColumn(),
 'published'=>(int)db()->query("SELECT COUNT(*) FROM projects WHERE publication='published' AND is_hidden=0 AND deleted_at IS NULL")->fetchColumn(),
 'hidden'=>(int)db()->query('SELECT COUNT(*) FROM projects WHERE is_hidden=1 AND deleted_at IS NULL')->fetchColumn(),
 'siteviews'=>(int)db()->query('SELECT COUNT(*) FROM website_visits')->fetchColumn(),
 'visitors'=>(int)db()->query('SELECT COUNT(DISTINCT visitor_hash) FROM website_visits')->fetchColumn(),
 'projectviews'=>(int)db()->query('SELECT COUNT(*) FROM project_views')->fetchColumn(),
 'likes'=>(int)db()->query('SELECT COUNT(*) FROM project_likes')->fetchColumn(),
 'ratings'=>(int)db()->query('SELECT COUNT(*) FROM project_ratings')->fetchColumn(),
 'avg'=>(float)db()->query('SELECT COALESCE(AVG(stars),0) FROM project_ratings')->fetchColumn(),
];
$daily = db()->query("SELECT DATE(visited_at) AS day,COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors FROM website_visits WHERE visited_at >= UTC_TIMESTAMP()-INTERVAL 30 DAY GROUP BY DATE(visited_at) ORDER BY day")->fetchAll();
$popular = db()->query("SELECT p.title,p.slug,COUNT(v.id) views FROM projects p LEFT JOIN project_views v ON v.project_id=p.id WHERE p.deleted_at IS NULL GROUP BY p.id,p.title,p.slug ORDER BY views DESC,p.title LIMIT 6")->fetchAll();
$recent = db()->query('SELECT id,title,publication,development_status,created_at,is_hidden FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5')->fetchAll();
$pageTitle='Dashboard'; $active='dashboard'; require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">YOUR WORKSPACE AT A GLANCE</p><h1>Dashboard <span class="accent">overview.</span></h1><p>Real-time figures from your own database. No simulated traffic.</p></div><a class="button button-primary" href="<?= e(url('admin/project-edit.php')) ?>">+ Add new project</a></div>
<div class="metric-grid">
<?php $metrics=[['Total projects',$totals['projects'],'▦'],['Published',$totals['published'],'↗'],['Hidden',$totals['hidden'],'◌'],['Website views',$totals['siteviews'],'◉'],['Unique visitors*',$totals['visitors'],'♧'],['Project detail views',$totals['projectviews'],'▣'],['Hearts received',$totals['likes'],'♡'],['Star ratings',$totals['ratings'],'★'],['Average rating',number_format($totals['avg'],2).' / 5','✦']]; foreach ($metrics as [$label,$num,$icon]): ?><div class="metric-card"><span class="metric-icon"><?= e($icon) ?></span><p><?= e($label) ?></p><strong><?= e((string)$num) ?></strong></div><?php endforeach; ?>
</div><p class="hint">*Visitor counts are estimates for analytics-consenting browsers, not exact individuals. Counts reflect your configured retention period.</p>
<div class="dashboard-panels"><section class="panel panel-wide"><div class="panel-head"><div><h2>Traffic overview</h2><p>Past 30 days · Consent-based page views</p></div><a href="<?= e(url('admin/analytics.php')) ?>">View analytics ↗</a></div><canvas class="traffic-chart" height="220" data-chart='<?= e(json_encode($daily)) ?>' role="img" aria-label="Daily traffic for the last 30 days"></canvas><p class="canvas-fallback">Daily visits data is also available from the Analytics section.</p></section><section class="panel"><div class="panel-head"><h2>Most viewed projects</h2></div><?php if (!$popular): ?><p class="muted">No projects yet.</p><?php else: ?><div class="rank-list"><?php foreach ($popular as $i=>$item): ?><div class="rank-item"><span><?= str_pad((string)($i+1),2,'0',STR_PAD_LEFT) ?></span><strong><?= e($item['title']) ?></strong><em><?= (int)$item['views'] ?> views</em></div><?php endforeach; ?></div><?php endif; ?></section></div>
<section class="panel"><div class="panel-head"><div><h2>Recently added</h2><p>Jump back into an existing project.</p></div><a href="<?= e(url('admin/projects.php')) ?>">Manage all ↗</a></div><div class="table-scroll"><table><thead><tr><th>Project</th><th>State</th><th>Development</th><th>Added</th><th></th></tr></thead><tbody><?php foreach ($recent as $item): ?><tr><td><strong><?= e($item['title']) ?></strong></td><td><span class="pill <?= $item['is_hidden']?'warning':'' ?>"><?= $item['is_hidden']?'Hidden':e(ucfirst($item['publication'])) ?></span></td><td><?= e(ucfirst($item['development_status'])) ?></td><td><?= e(date('M j, Y',strtotime($item['created_at']))) ?></td><td><a href="<?= e(url('admin/project-edit.php?id='.$item['id'])) ?>">Edit ↗</a></td></tr><?php endforeach; ?></tbody></table></div></section>
<?php require __DIR__.'/_footer.php'; ?>

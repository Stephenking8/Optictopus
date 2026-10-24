<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin();
$id=(int)($_GET['id'] ?? 0); $s=db()->prepare('SELECT p.*,c.name category_name FROM projects p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=? AND p.deleted_at IS NULL'); $s->execute([$id]); $p=$s->fetch();
if (!$p) { http_response_code(404); exit('Project not found'); }
$imgs=db()->prepare('SELECT * FROM project_images WHERE project_id=? ORDER BY sort_order'); $imgs->execute([$id]); $imgs=$imgs->fetchAll();
$pageTitle='Private preview: '.$p['title']; $bodyPage='other';
require dirname(__DIR__).'/includes/public-header.php';
?>
<div class="preview-banner"><div class="container">PRIVATE ADMIN PREVIEW · Not visible to public visitors <a href="<?= e(url('admin/project-edit.php?id='.$id)) ?>">← Edit this project</a></div></div>
<section class="project-detail container section-space"><p class="eyebrow"><?= e(ucfirst($p['development_status'])) ?> · <?= e($p['category_name'] ?? 'Uncategorized') ?></p><h1><?= e($p['title']) ?></h1><p class="lead"><?= e($p['summary']) ?></p><div class="detail-cover"><img src="<?= e(image_src($p['cover_image'])) ?>" alt="Preview cover"></div><div class="detail-content"><div class="detail-story"><h2>Project story</h2><p><?= nl2br(e($p['description'])) ?></p><h3>Features</h3><p><?= nl2br(e($p['features'])) ?></p></div><aside class="detail-aside"><h3>Technologies</h3><p><?= e($p['technologies']) ?></p><h3>Publishing state</h3><p><?= e($p['publication']) ?> · <?= $p['is_hidden']?'Hidden':'Visible' ?></p></aside></div><?php if ($imgs): ?><div class="gallery-grid"><?php foreach ($imgs as $img): ?><img class="preview-gallery" src="<?= e(image_src($img['image_path'])) ?>" alt="Preview screenshot"><?php endforeach; ?></div><?php endif; ?></section>
<?php require dirname(__DIR__).'/includes/public-footer.php'; ?>

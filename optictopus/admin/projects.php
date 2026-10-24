<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin();
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf(); $id=(int)($_POST['id'] ?? 0); $action=(string)($_POST['action'] ?? '');
    $s=db()->prepare('SELECT * FROM projects WHERE id=?'); $s->execute([$id]); $project=$s->fetch();
    if (!$project) { flash('Project not found.','error'); redirect('admin/projects.php'); }
    switch ($action) {
        case 'hide': db()->prepare('UPDATE projects SET is_hidden=1-is_hidden WHERE id=?')->execute([$id]); break;
        case 'publish': db()->prepare("UPDATE projects SET published_at=IF(publication='draft',COALESCE(published_at,UTC_TIMESTAMP()),published_at), publication=IF(publication='draft','published','draft') WHERE id=?")->execute([$id]); break;
        case 'delete': db()->prepare('UPDATE projects SET deleted_at=UTC_TIMESTAMP() WHERE id=?')->execute([$id]); break;
        case 'restore': db()->prepare('UPDATE projects SET deleted_at=NULL,publication=\'draft\' WHERE id=?')->execute([$id]); break;
        case 'up': case 'down':
            $operator=$action==='up'?'<':'>';
            $order=$action==='up'?'DESC':'ASC';
            $stmt=db()->prepare("SELECT id,sort_order FROM projects WHERE deleted_at IS NULL AND sort_order $operator ? ORDER BY sort_order $order,id $order LIMIT 1");
            $stmt->execute([(int)$project['sort_order']]); $other=$stmt->fetch();
            if ($other) {
                db()->beginTransaction();
                db()->prepare('UPDATE projects SET sort_order=? WHERE id=?')->execute([$other['sort_order'],$id]);
                db()->prepare('UPDATE projects SET sort_order=? WHERE id=?')->execute([$project['sort_order'],$other['id']]);
                db()->commit();
            }
            break;
        default: flash('Unknown action.','error'); redirect('admin/projects.php');
    }
    flash('Project updated.'); redirect('admin/projects.php'.(isset($_GET['trash'])?'?trash=1':''));
}
$trash = isset($_GET['trash']);
$projects=all_projects($trash ? 'p.deleted_at IS NOT NULL' : 'p.deleted_at IS NULL');
$pageTitle='Projects'; $active='projects'; require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">CONTENT MANAGEMENT</p><h1>My <span class="accent">projects.</span></h1><p>Publish, organize and curate what visitors can see.</p></div><a class="button button-primary" href="<?= e(url('admin/project-edit.php')) ?>">+ Add project</a></div>
<div class="panel"><div class="panel-head"><h2><?= $trash?'Recently deleted':'Project library' ?> <span class="small-count"><?= count($projects) ?></span></h2><div class="toolbar"><a class="button button-small" href="<?= e(url('admin/projects.php')) ?>">Active</a><a class="button button-small" href="<?= e(url('admin/projects.php?trash=1')) ?>">Trash / Recovery</a></div></div>
<div class="table-scroll"><table><thead><tr><th>Project</th><th>Publishing</th><th>Category</th><th>Engagement</th><th>Controls</th></tr></thead><tbody><?php foreach ($projects as $p): ?><tr>
<td><div class="table-project"><img src="<?= e(image_src($p['cover_image'])) ?>" alt=""><div><strong><?= e($p['title']) ?></strong><small><?= e(ucfirst($p['development_status'])) ?><?= $p['is_featured']?' · Featured':'' ?></small></div></div></td>
<td><span class="pill <?= $p['is_hidden']?'warning':($p['publication']==='published'?'success':'') ?>"><?= $p['is_hidden']?'Hidden':e(ucfirst($p['publication'])) ?></span></td><td><?= e($p['category_name'] ?? '—') ?></td><td><small>♥ <?= (int)$p['likes_count'] ?> · ★ <?= (int)$p['ratings_count'] ?> · ◉ <?= (int)$p['views_count'] ?></small></td>
<td><div class="table-actions"><?php if ($trash): ?><form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="text-btn" name="action" value="restore">Restore</button></form><?php else: ?>
<a href="<?= e(url('admin/project-edit.php?id='.$p['id'])) ?>">Edit</a><a href="<?= e(url('admin/project-preview.php?id='.$p['id'])) ?>" target="_blank" rel="noopener">Preview</a>
<form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="text-btn" name="action" value="hide"><?= $p['is_hidden']?'Show':'Hide' ?></button></form>
<form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="text-btn" name="action" value="publish"><?= $p['publication']==='published'?'Unpublish':'Publish' ?></button></form>
<form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="text-btn" name="action" value="up" title="Move up">↑</button><button class="text-btn" name="action" value="down" title="Move down">↓</button></form>
<form method="post" data-confirm="Move this project to Trash? You can restore it later."><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="text-btn danger" name="action" value="delete">Delete</button></form>
<?php endif; ?></div></td></tr><?php endforeach; ?><?php if (!$projects): ?><tr><td colspan="5" class="empty-cell">No projects here yet.</td></tr><?php endif; ?></tbody></table></div></div>
<?php require __DIR__.'/_footer.php'; ?>

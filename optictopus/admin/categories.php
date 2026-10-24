<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin(); $error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
 verify_csrf(); $action=(string)($_POST['action']??''); $id=(int)($_POST['id']??0);
 try {
  if ($action==='add') {
   $name=trim((string)($_POST['name']??'')); $slug=clean_slug($name);
   if (!$slug || strlen($name)>100) throw new RuntimeException('Enter a name (up to 100 characters).');
   db()->prepare('INSERT INTO categories (name,slug,sort_order) VALUES (?,?,(SELECT max_order FROM (SELECT COALESCE(MAX(sort_order),0)+1 max_order FROM categories) x))')->execute([$name,$slug]);
  } elseif ($action==='delete') {
   db()->prepare('DELETE FROM categories WHERE id=?')->execute([$id]);
  } elseif ($action==='rename') {
   $name=trim((string)($_POST['name']??''));
   if (!$name || strlen($name)>100) throw new RuntimeException('Enter a category name (up to 100 characters).');
   db()->prepare('UPDATE categories SET name=?,slug=? WHERE id=?')->execute([$name,clean_slug($name),$id]);
  } else throw new RuntimeException('Invalid action.');
  flash('Categories updated.'); redirect('admin/categories.php');
 } catch (Throwable $ex) { $error=$ex instanceof RuntimeException ? $ex->getMessage() : 'This category name or slug is already in use.'; }
}
$cats=db()->query('SELECT c.*,COUNT(p.id) project_count FROM categories c LEFT JOIN projects p ON p.category_id=c.id AND p.deleted_at IS NULL GROUP BY c.id ORDER BY c.sort_order,c.name')->fetchAll();
$pageTitle='Categories';$active='categories';require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">ORGANIZATION</p><h1>Project <span class="accent">categories.</span></h1><p>Keep the portfolio easy to browse and filter.</p></div></div>
<?php if ($error): ?><div class="alert error"><?= e($error) ?></div><?php endif; ?>
<div class="edit-layout"><section class="panel"><h2>Existing categories</h2><?php foreach ($cats as $cat): ?><div class="category-row"><form method="post" class="inline-form"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$cat['id'] ?>"><input name="name" required maxlength="100" value="<?= e($cat['name']) ?>" aria-label="Category name"><span class="hint"><?= (int)$cat['project_count'] ?> projects</span><button type="submit" name="action" value="rename" class="button button-small">Save</button></form><form method="post" data-confirm="Delete this category? Its projects will become uncategorized."><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$cat['id'] ?>"><button type="submit" name="action" value="delete" class="text-btn danger">Delete</button></form></div><?php endforeach; ?></section><aside class="panel"><h2>New category</h2><form method="post" class="form-stack"><?= csrf_field() ?><label>Name<input name="name" required maxlength="100" placeholder="e.g. SaaS Platforms"></label><button type="submit" name="action" value="add" class="button button-primary">Add category</button></form></aside></div>
<?php require __DIR__.'/_footer.php'; ?>

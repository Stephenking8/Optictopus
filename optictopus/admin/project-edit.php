<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin(); require dirname(__DIR__).'/includes/upload.php';
$id=(int)($_GET['id'] ?? $_POST['id'] ?? 0); $isEdit=$id>0; $error='';
$default=['title'=>'','slug'=>'','summary'=>'','description'=>'','technologies'=>'','features'=>'','live_url'=>'','github_url'=>'','category_id'=>'','development_status'=>'ongoing','publication'=>'draft','is_hidden'=>0,'is_featured'=>0,'cover_image'=>null,'show_views'=>null,'show_likes'=>null,'show_rating'=>null,'show_rating_count'=>null,'allow_likes'=>null,'allow_ratings'=>null];
$project=$default;
if ($isEdit) {
    $s=db()->prepare('SELECT * FROM projects WHERE id=? AND deleted_at IS NULL'); $s->execute([$id]); $project=$s->fetch();
    if (!$project) { http_response_code(404); exit('Project not found'); }
}
if ($_SERVER['REQUEST_METHOD']==='POST') {
    verify_csrf();
    $action=(string)($_POST['action'] ?? 'save');
    if ($action==='delete_image' && $isEdit) {
        $imageId=(int)($_POST['image_id'] ?? 0);
        $s=db()->prepare('SELECT image_path FROM project_images WHERE id=? AND project_id=?'); $s->execute([$imageId,$id]); $image=$s->fetchColumn();
        if ($image) { db()->prepare('DELETE FROM project_images WHERE id=? AND project_id=?')->execute([$imageId,$id]); delete_uploaded_image($image); }
        flash('Screenshot removed.'); redirect('admin/project-edit.php?id='.$id);
    }
    $updated=[];
    foreach (['title','slug','summary','description','technologies','features','live_url','github_url','development_status','publication'] as $f) $updated[$f]=trim((string)($_POST[$f] ?? ''));
    $updated['slug']=clean_slug($updated['slug'] ?: $updated['title']);
    $updated['category_id']=(int)($_POST['category_id'] ?? 0) ?: null;
    foreach (['is_hidden','is_featured'] as $f) $updated[$f]=isset($_POST[$f]) ? 1:0;
    foreach (['show_views','show_likes','show_rating','show_rating_count','allow_likes','allow_ratings'] as $f) {
        $str=(string)($_POST[$f] ?? 'inherit');
        $updated[$f]=in_array($str,['0','1'],true)?(int)$str:null;
    }
    if ($action==='draft') $updated['publication']='draft';
    if ($updated['title']==='' || strlen($updated['title'])>160 || $updated['slug']==='' || strlen($updated['slug'])>180) $error='Enter a title (max 160 characters) and a URL slug (max 180 characters).';
    elseif (strlen($updated['summary'])>500 || strlen($updated['technologies'])>500) $error='The summary and technologies must be 500 characters or shorter.';
    elseif (!in_array($updated['development_status'],['completed','ongoing','upcoming'],true) || !in_array($updated['publication'],['draft','published'],true)) $error='Invalid project status.';
    foreach (['live_url','github_url'] as $f) if ($updated[$f]!=='' && !safe_http_link($updated[$f])) $error='Links must be valid http or https URLs.';
    if ($updated['category_id']) { $s=db()->prepare('SELECT 1 FROM categories WHERE id=?'); $s->execute([$updated['category_id']]); if (!$s->fetchColumn()) $error='Choose a valid category.'; }
    $coverPath=null; $screens=[];
    if (!$error) {
        try {
            if (isset($_FILES['cover']) && ($_FILES['cover']['error'] ?? UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE) $coverPath=store_image($_FILES['cover'],'cover');
            $files=uploaded_files($_FILES['screenshots'] ?? []);
            if (count($files)>8) throw new RuntimeException('Upload up to eight screenshots at a time.');
            foreach ($files as $file) $screens[]=store_image($file,'screen');
            $existingSlug=db()->prepare('SELECT id FROM projects WHERE slug=? AND id<>?'); $existingSlug->execute([$updated['slug'],$id]);
            if ($existingSlug->fetch()) throw new RuntimeException('That URL slug is already in use. Choose a different one.');
            db()->beginTransaction();
            $oldCover=null;
            if ($isEdit) {
                $oldCover=$project['cover_image'];
                $sql='UPDATE projects SET category_id=?,title=?,slug=?,summary=?,description=?,technologies=?,features=?,live_url=?,github_url=?,development_status=?,publication=?,is_hidden=?,is_featured=?,show_views=?,show_likes=?,show_rating=?,show_rating_count=?,allow_likes=?,allow_ratings=?';
                $params=[$updated['category_id'],$updated['title'],$updated['slug'],$updated['summary'],$updated['description'],$updated['technologies'],$updated['features'],$updated['live_url']?:null,$updated['github_url']?:null,$updated['development_status'],$updated['publication'],$updated['is_hidden'],$updated['is_featured'],$updated['show_views'],$updated['show_likes'],$updated['show_rating'],$updated['show_rating_count'],$updated['allow_likes'],$updated['allow_ratings']];
                if ($coverPath) { $sql.=',cover_image=?'; $params[]=$coverPath; }
                $sql.=" , published_at=IF(?='published',COALESCE(published_at,UTC_TIMESTAMP()),published_at) WHERE id=?"; $params[]=$updated['publication']; $params[]=$id;
                db()->prepare($sql)->execute($params);
            } else {
                $sort=(int)db()->query('SELECT COALESCE(MAX(sort_order),0)+1 FROM projects')->fetchColumn();
                $sql='INSERT INTO projects (category_id,title,slug,summary,description,technologies,features,live_url,github_url,development_status,publication,is_hidden,is_featured,show_views,show_likes,show_rating,show_rating_count,allow_likes,allow_ratings,cover_image,sort_order,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,IF(?=\'published\',UTC_TIMESTAMP(),NULL))';
                $params=[$updated['category_id'],$updated['title'],$updated['slug'],$updated['summary'],$updated['description'],$updated['technologies'],$updated['features'],$updated['live_url']?:null,$updated['github_url']?:null,$updated['development_status'],$updated['publication'],$updated['is_hidden'],$updated['is_featured'],$updated['show_views'],$updated['show_likes'],$updated['show_rating'],$updated['show_rating_count'],$updated['allow_likes'],$updated['allow_ratings'],$coverPath,$sort,$updated['publication']];
                db()->prepare($sql)->execute($params); $id=(int)db()->lastInsertId(); $isEdit=true;
            }
            $s=db()->prepare('INSERT INTO project_images(project_id,image_path,sort_order) VALUES (?,?,?)');
            foreach ($screens as $j=>$path) $s->execute([$id,$path,$j+1]);
            db()->commit();
            if ($oldCover && $coverPath) delete_uploaded_image($oldCover);
            flash('Project saved successfully.'); redirect('admin/project-edit.php?id='.$id);
        } catch (Throwable $ex) {
            if (db()->inTransaction()) db()->rollBack();
            if ($coverPath) delete_uploaded_image($coverPath);
            foreach ($screens as $file) delete_uploaded_image($file);
            $error=$ex instanceof RuntimeException ? $ex->getMessage() : 'Could not save the project. Check required fields and database constraints.';
        }
    }
    $project=array_merge($project,$updated);
}
$categories=db()->query('SELECT id,name FROM categories ORDER BY sort_order,name')->fetchAll();
$images=[];
if ($isEdit) { $s=db()->prepare('SELECT * FROM project_images WHERE project_id=? ORDER BY sort_order,id'); $s->execute([$id]); $images=$s->fetchAll(); }
$pageTitle=$isEdit?'Edit project':'New project'; $active='projects'; require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">CONTENT STUDIO</p><h1><?= $isEdit?'Edit':'Create' ?> <span class="accent">project.</span></h1><p>Every field below is reflected in your public portfolio when the project is published and visible.</p></div><a class="button button-small" href="<?= e(url('admin/projects.php')) ?>">← All projects</a></div>
<?php if ($error): ?><div class="alert error" role="alert"><?= e($error) ?></div><?php endif; ?>
<div class="edit-layout"><form method="post" enctype="multipart/form-data" class="panel edit-form" id="project-form"><?= csrf_field() ?><input type="hidden" name="id" value="<?= $id ?>">
<h2>Project details</h2><div class="form-grid"><label>Project title <span class="required">*</span><input name="title" required maxlength="160" value="<?= e($project['title']) ?>" placeholder="e.g. My Portfolio Website"></label><label>URL slug <small>auto-generated if blank</small><input name="slug" maxlength="180" value="<?= e($project['slug']) ?>" placeholder="my-portfolio-website"></label></div>
<label>Short summary <span class="required">*</span><textarea name="summary" maxlength="500" rows="2" placeholder="A short overview for the project card"><?= e($project['summary']) ?></textarea></label>
<label>Full description<textarea name="description" rows="7" placeholder="Tell the story of the project, goals and technical approach"><?= e($project['description']) ?></textarea></label>
<div class="form-grid"><label>Project category<select name="category_id"><option value="">Uncategorized</option><?php foreach ($categories as $cat): ?><option value="<?= (int)$cat['id'] ?>" <?= (int)$project['category_id']===(int)$cat['id']?'selected':'' ?>><?= e($cat['name']) ?></option><?php endforeach; ?></select></label><label>Development status<select name="development_status"><?php foreach (['completed'=>'Completed','ongoing'=>'Ongoing','upcoming'=>'Upcoming'] as $v=>$label): ?><option value="<?= $v ?>" <?= $project['development_status']===$v?'selected':'' ?>><?= $label ?></option><?php endforeach; ?></select></label></div>
<label>Technology stack <small>comma-separated</small><input name="technologies" maxlength="500" value="<?= e($project['technologies']) ?>" placeholder="HTML, CSS, JavaScript, PHP"></label>
<label>Features <small>one per line</small><textarea name="features" rows="5" placeholder="Responsive layout&#10;Admin dashboard&#10;Real-time feedback"><?= e($project['features']) ?></textarea></label>
<div class="form-grid"><label>Live website URL<input type="url" name="live_url" value="<?= e($project['live_url']) ?>" placeholder="https://..."></label><label>GitHub URL (optional)<input type="url" name="github_url" value="<?= e($project['github_url']) ?>" placeholder="https://github.com/..."></label></div>
<h2>Media gallery</h2><div class="form-grid"><label>Cover image <small>JPG, PNG, WebP · max 4 MB</small><input type="file" name="cover" accept="image/jpeg,image/png,image/webp"></label><label>Project screenshots <small>up to 8 at a time</small><input type="file" name="screenshots[]" accept="image/jpeg,image/png,image/webp" multiple></label></div>
<?php if ($isEdit && $project['cover_image']): ?><img class="current-cover" src="<?= e(image_src($project['cover_image'])) ?>" alt="Current cover image"><?php endif; ?>
<h2>Publishing & visibility</h2><div class="form-grid"><label>Publication state<select name="publication"><option value="draft" <?= $project['publication']==='draft'?'selected':'' ?>>Draft</option><option value="published" <?= $project['publication']==='published'?'selected':'' ?>>Published</option></select></label><label class="check-label"><input type="checkbox" name="is_hidden" value="1" <?= $project['is_hidden']?'checked':'' ?>> Hide from public (even if published)</label></div><label class="check-label"><input type="checkbox" name="is_featured" value="1" <?= $project['is_featured']?'checked':'' ?>> Feature above other projects</label>
<h2>Project-specific controls</h2><p class="hint">Inherit uses the global Website Settings value.</p><div class="form-grid"><?php foreach (['show_views'=>'Show views','show_likes'=>'Show likes','show_rating'=>'Show average rating','show_rating_count'=>'Show rating count','allow_likes'=>'Allow heart reactions','allow_ratings'=>'Allow new ratings'] as $key=>$label): ?><label><?= e($label) ?><select name="<?= $key ?>"><option value="inherit" <?= $project[$key]===null?'selected':'' ?>>Inherit global</option><option value="1" <?= $project[$key]!==null && (int)$project[$key]===1?'selected':'' ?>>Enabled</option><option value="0" <?= $project[$key]!==null && (int)$project[$key]===0?'selected':'' ?>>Disabled</option></select></label><?php endforeach; ?></div>
<div class="form-actions"><button class="button button-primary" type="submit" name="action" value="save">Save project →</button><button class="button button-small" type="submit" name="action" value="draft">Save as draft</button><?php if ($isEdit): ?><a class="button button-small" href="<?= e(url('admin/project-preview.php?id='.$id)) ?>" target="_blank" rel="noopener">Preview ↗</a><?php endif; ?></div>
</form>
<aside><div class="panel"><h2>Publishing guide</h2><p class="muted">Draft projects stay private. Published projects appear publicly unless marked hidden.</p><p class="muted">Use preview to inspect even unpublished projects. The live site and source buttons appear only when URLs are provided.</p></div>
<?php if ($images): ?><div class="panel screenshot-list"><h2>Screenshots</h2><?php foreach ($images as $image): ?><div class="screenshot-row"><img src="<?= e(image_src($image['image_path'])) ?>" alt="Project screenshot"><form method="post" data-confirm="Remove this screenshot permanently?"><?= csrf_field() ?><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="image_id" value="<?= (int)$image['id'] ?>"><button type="submit" name="action" value="delete_image" class="text-btn danger">Remove</button></form></div><?php endforeach; ?></div><?php endif; ?></aside></div>
<?php require __DIR__.'/_footer.php'; ?>

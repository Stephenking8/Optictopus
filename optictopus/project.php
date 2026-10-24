<?php
require __DIR__ . '/includes/bootstrap.php';
require_ready();
$slug = (string)($_GET['slug'] ?? '');
$items = all_projects('p.slug = ? AND p.publication = \'published\' AND p.is_hidden = 0 AND p.deleted_at IS NULL', [$slug]);
if (!$items) { http_response_code(404); $pageTitle = 'Project not found'; $bodyPage = 'other'; require __DIR__.'/includes/public-header.php'; echo '<section class="container section-space empty-state"><h1>Project not found</h1><p>This project may have been hidden or unpublished.</p><a class="button button-primary" href="'.e(url('#projects')).'">Back to projects</a></section>'; require __DIR__.'/includes/public-footer.php'; exit; }
$project = $items[0];
$pictures = db()->prepare('SELECT * FROM project_images WHERE project_id=? ORDER BY sort_order,id'); $pictures->execute([$project['id']]); $pictures=$pictures->fetchAll();
$engagement = visitor_engagement((int)$project['id']);
$showLikes = flag($project,'show_likes','show_likes'); $showRating = flag($project,'show_rating','show_rating');
$showRatingCount = flag($project,'show_rating_count','show_rating_count'); $showViews = flag($project,'show_views','show_views');
$allowLikes = flag($project,'allow_likes','enable_likes'); $allowRatings = flag($project,'allow_ratings','enable_ratings');
$pageTitle = $project['title'].' — '.setting('site_name'); $pageDescription=$project['summary'];
$canonical = rtrim((string)cfg('site_url'), '/');
if ($canonical === '') { $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'; $canonical = ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'localhost'); }
$canonical .= project_url($project);
$bodyPage='project'; $bodyProject=(int)$project['id'];
require __DIR__.'/includes/public-header.php';
?>
<section class="project-detail container section-space">
 <a class="back-link" href="<?= e(url('#projects')) ?>">← All projects</a>
 <div class="detail-heading"><div><p class="eyebrow"><?= e(strtoupper($project['category_name'] ?? 'PROJECT')) ?> / <?= e(strtoupper($project['development_status'])) ?></p><h1><?= e($project['title']) ?></h1><p><?= e($project['summary']) ?></p></div><div class="detail-links"><?php if ($live = safe_http_link($project['live_url'])): ?><a class="button button-primary" href="<?= e($live) ?>" target="_blank" rel="noopener noreferrer">Visit website ↗</a><?php endif; ?><?php if ($git=safe_http_link($project['github_url'])): ?><a class="button button-outline" href="<?= e($git) ?>" target="_blank" rel="noopener noreferrer">GitHub ↗</a><?php endif; ?></div></div>
 <div class="detail-cover"><img src="<?= e(image_src($project['cover_image'])) ?>" alt="Cover image for <?= e($project['title']) ?>"></div>
 <div class="detail-content"><div class="detail-story"><p class="eyebrow">THE STORY</p><h2>Inside the <em>project.</em></h2><div class="story-text"><?= nl2br(e($project['description'] ?: $project['summary'])) ?></div>
 <?php if (trim((string)$project['features'])): ?><h3>Features & functionality</h3><ul class="feature-list"><?php foreach (array_filter(array_map('trim',preg_split('/\r?\n/',(string)$project['features']))) as $feature): ?><li><?= e($feature) ?></li><?php endforeach; ?></ul><?php endif; ?></div>
 <aside class="detail-aside"><p class="eyebrow">PROJECT OVERVIEW</p><div class="meta-row"><span>Status</span><strong><?= e(ucfirst($project['development_status'])) ?></strong></div><div class="meta-row"><span>Category</span><strong><?= e($project['category_name'] ?? 'Uncategorized') ?></strong></div><div class="meta-row"><span>Published</span><strong><?= $project['published_at'] ? e(date('M Y',strtotime($project['published_at']))) : '—' ?></strong></div><div class="meta-tags"><span>Technologies</span><div class="tags"><?php foreach (array_filter(array_map('trim',explode(',', $project['technologies']))) as $tech): ?><span><?= e($tech) ?></span><?php endforeach; ?></div></div>
 <div class="detail-engagement project-stats" data-project="<?= (int)$project['id'] ?>"><p class="eyebrow">YOUR FEEDBACK</p><div class="reaction-line"><?php if ($allowLikes): ?><button type="button" class="heart-btn <?= $engagement['liked']?'liked':'' ?>" data-like="<?= (int)$project['id'] ?>" aria-label="Toggle heart reaction" aria-pressed="<?= $engagement['liked']?'true':'false' ?>"><span class="heart-symbol" aria-hidden="true"><?= $engagement['liked']?'♥':'♡' ?></span><?php if ($showLikes): ?><span data-like-count><?= (int)$project['likes_count'] ?></span><?php endif; ?></button><?php elseif ($showLikes): ?><span>♥ <?= (int)$project['likes_count'] ?></span><?php endif; ?><?php if ($showViews): ?><span>◉ <?= (int)$project['views_count'] ?> views</span><?php endif; ?></div>
 <?php if ($allowRatings): ?><div class="rating-control detail-rating" data-rating="<?= (int)$project['id'] ?>" role="group" aria-label="Give this project a rating"><?php for ($n=1;$n<=5;$n++): ?><button type="button" class="star-btn <?= $n <= $engagement['rating'] ? 'selected':'' ?>" data-stars="<?= $n ?>" aria-label="Rate <?= $n ?> star<?= $n>1?'s':'' ?>" aria-pressed="<?= $engagement['rating']===$n?'true':'false' ?>">★</button><?php endfor; ?></div><?php endif; ?>
 <div class="rating-summary"><?php if ($showRating): ?><span data-average-for="<?= (int)$project['id'] ?>">★ <?= number_format((float)$project['average_rating'],1) ?> / 5</span><?php endif; ?> <?php if ($showRatingCount): ?><span data-rating-count-for="<?= (int)$project['id'] ?>"><?= (int)$project['ratings_count'] ?> ratings</span><?php endif; ?></div></div></aside></div>
 <?php if ($pictures): ?><section class="gallery"><p class="eyebrow">VISUAL EXPLORATION</p><h2>Take a <em>closer look.</em></h2><div class="gallery-grid"><?php foreach ($pictures as $picture): ?><a href="<?= e(image_src($picture['image_path'])) ?>" class="gallery-image" target="_blank" rel="noopener"><img src="<?= e(image_src($picture['image_path'])) ?>" alt="<?= e($picture['caption'] ?: $project['title'].' screenshot') ?>" loading="lazy"><span><?= e($picture['caption']) ?> ↗</span></a><?php endforeach; ?></div></section><?php endif; ?>
 <div class="next-project"><p class="eyebrow">CURIOUS FOR MORE?</p><h2>More to <em>explore.</em></h2><a class="button button-outline" href="<?= e(url('#projects')) ?>">Browse all projects ↗</a></div>
</section>
<?php require __DIR__.'/includes/public-footer.php'; ?>

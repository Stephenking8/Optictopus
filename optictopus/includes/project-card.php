<?php
$engagement = $engagementByProject[(int)$project['id']] ?? visitor_engagement((int)$project['id']);
$showLikes = flag($project, 'show_likes', 'show_likes');
$showRating = flag($project, 'show_rating', 'show_rating');
$showRatingCount = flag($project, 'show_rating_count', 'show_rating_count');
$showViews = flag($project, 'show_views', 'show_views');
$allowLikes = flag($project, 'allow_likes', 'enable_likes');
$allowRatings = flag($project, 'allow_ratings', 'enable_ratings');
?>
<article class="project-card reveal" data-search="<?= e(strtolower($project['title'] . ' ' . $project['technologies'] . ' ' . ($project['category_name'] ?? ''))) ?>" data-status="<?= e($project['development_status']) ?>" data-category="<?= (int)$project['category_id'] ?>">
 <a class="project-cover" href="<?= e(project_url($project)) ?>" aria-label="View <?= e($project['title']) ?> details"><img src="<?= e(image_src($project['cover_image'])) ?>" loading="lazy" alt="Cover art for <?= e($project['title']) ?>"><span class="cover-arrow" aria-hidden="true">↗</span></a>
 <div class="project-body">
   <div class="project-topline"><span><?= e($project['category_name'] ?? 'Uncategorized') ?></span><span class="status status-<?= e($project['development_status']) ?>"><?= e(ucfirst($project['development_status'])) ?></span></div>
   <h3><a href="<?= e(project_url($project)) ?>"><?= e($project['title']) ?></a></h3>
   <p class="project-summary"><?= e($project['summary']) ?></p>
   <div class="tags"><?php foreach (array_slice(array_filter(array_map('trim', explode(',', $project['technologies']))), 0, 5) as $tech): ?><span><?= e($tech) ?></span><?php endforeach; ?></div>
   <div class="project-stats" data-project="<?= (int)$project['id'] ?>">
     <?php if ($allowLikes): ?><button type="button" class="heart-btn <?= $engagement['liked'] ? 'liked' : '' ?>" data-like="<?= (int)$project['id'] ?>" aria-label="<?= $engagement['liked'] ? 'Unlike' : 'Like' ?> <?= e($project['title']) ?>" aria-pressed="<?= $engagement['liked'] ? 'true':'false' ?>"><span class="heart-symbol" aria-hidden="true"><?= $engagement['liked'] ? '♥' : '♡' ?></span><?php if ($showLikes): ?><span class="like-number" data-like-count><?= (int)$project['likes_count'] ?></span><?php endif; ?></button><?php elseif ($showLikes): ?><span>♥ <?= (int)$project['likes_count'] ?></span><?php endif; ?>
     <?php if ($allowRatings): ?><div class="rating-control" data-rating="<?= (int)$project['id'] ?>" role="group" aria-label="Rate <?= e($project['title']) ?> from 1 to 5 stars"><?php for ($n=1;$n<=5;$n++): ?><button type="button" class="star-btn <?= $n <= $engagement['rating'] ? 'selected' : '' ?>" data-stars="<?= $n ?>" aria-label="Rate <?= $n ?> star<?= $n > 1 ? 's' : '' ?>" aria-pressed="<?= $engagement['rating'] === $n ? 'true':'false' ?>">★</button><?php endfor; ?></div><?php endif; ?>
     <?php if ($showRating): ?><span class="average" data-average-for="<?= (int)$project['id'] ?>">★ <?= number_format((float)$project['average_rating'],1) ?></span><?php endif; ?>
     <?php if ($showRatingCount): ?><span class="muted-stat" data-rating-count-for="<?= (int)$project['id'] ?>">(<?= (int)$project['ratings_count'] ?>)</span><?php endif; ?>
     <?php if ($showViews): ?><span class="muted-stat" title="Detail page views">◉ <?= (int)$project['views_count'] ?></span><?php endif; ?>
   </div>
   <div class="card-actions"><a href="<?= e(project_url($project)) ?>">View case study <span aria-hidden="true">↗</span></a><?php if ($live = safe_http_link($project['live_url'])): ?><a href="<?= e($live) ?>" target="_blank" rel="noopener noreferrer">Live site ↗</a><?php endif; ?></div>
 </div>
</article>

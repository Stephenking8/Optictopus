<?php
require __DIR__ . '/includes/bootstrap.php';
require_ready();
$projects = all_projects();
$engagementByProject=[];
if ($visitor = browser_visitor_hash()) {
    $likes=db()->prepare('SELECT project_id FROM project_likes WHERE visitor_hash=?');$likes->execute([$visitor]);
    foreach ($likes as $r) $engagementByProject[(int)$r['project_id']]=['liked'=>true,'rating'=>0];
    $ratings=db()->prepare('SELECT project_id,stars FROM project_ratings WHERE visitor_hash=?');$ratings->execute([$visitor]);
    foreach ($ratings as $r) { $key=(int)$r['project_id']; if (!isset($engagementByProject[$key])) $engagementByProject[$key]=['liked'=>false,'rating'=>0]; $engagementByProject[$key]['rating']=(int)$r['stars']; }
}
foreach ($projects as $p) if (!isset($engagementByProject[(int)$p['id']])) $engagementByProject[(int)$p['id']]=['liked'=>false,'rating'=>0];
$categories = db()->query('SELECT id,name FROM categories ORDER BY sort_order,name')->fetchAll();
$pageTitle = setting('site_name') . ' — Personal Portfolio';
$canonical = absolute_url();
$bodyPage = 'home';
require __DIR__ . '/includes/public-header.php';
?>
<section class="hero container" aria-labelledby="hero-heading">
 <div class="hero-content reveal">
  <div class="availability"><span class="pulse"></span> ALWAYS BUILDING SOMETHING NEW <span aria-hidden="true">✳</span></div>
  <p class="hero-kicker"><?= e(setting('hero_kicker')) ?></p>
  <h1 id="hero-heading"><?= e(setting('hero_title')) ?></h1>
  <p class="hero-description"><?= e(setting('hero_text')) ?></p>
  <div class="hero-actions"><a class="button button-primary" href="#projects">Explore my projects <span aria-hidden="true">↗</span></a><a class="button button-outline" href="#contact">Contact me <span aria-hidden="true">↗</span></a></div>
  <div class="hero-caption"><span class="caption-line"></span> A PORTFOLIO OF IDEAS MADE REAL <span class="caption-line"></span></div>
 </div>
 <div class="hero-art">
  <div class="orb orb-one" aria-hidden="true"></div><div class="orb orb-two" aria-hidden="true"></div><div class="art-grid" aria-hidden="true"></div>
  <div class="floating-card floating-code" aria-hidden="true"><span class="floating-icon">⌘</span><span>crafting interfaces<span class="flashing-caret">_</span></span></div>
  <div class="floating-card floating-status" aria-hidden="true"><span class="status-pulse"></span> BUILDING THE FUTURE</div>
  <?php if (global_flag('mascot_enabled')): ?>
  <button class="mascot-interactive" type="button" data-mascot data-mouth="with" data-expression="normal" data-auto-expressions="on" aria-label="Meet OPTICTOPUS, the smiling purple baby octopus. Tickle it or tap three times to make it swim away and return.">
    <span class="mascot-float"><span class="octo-flight" data-octo-flight><span class="octo-hover">
      <?php readfile(__DIR__ . '/assets/img/optictopus-baby-animated.svg'); ?>
    </span></span></span>
  </button>
  <span class="mascot-hint" aria-hidden="true"><span class="hint-desktop">✦ TICKLE ME · CLICK 3 TIMES TO SWIM</span><span class="hint-touch">✦ TAP 3 TIMES TO SWIM</span></span>
  <?php endif; ?>
 </div>
 <span class="hero-index">01 / INTRODUCTION</span>
</section>
<?php if (global_flag('section_about')): ?>
<section class="about-section section-space" id="about"><div class="container about-grid">
  <div class="about-visual reveal"><div class="profile-frame"><img src="<?= e(image_src(setting('profile_image'))) ?>" alt="Portrait of <?= e(setting('owner_name')) ?>" loading="lazy"></div><div class="photo-caption">THE PERSON BEHIND THE PIXELS <span>↗</span></div></div>
  <div class="about-copy reveal"><p class="eyebrow">01 / GET TO KNOW ME</p><h2>Code with intention.<br><em>Design with purpose.</em></h2><p class="intro-line">Hi, I'm <?= e(setting('owner_name')) ?>, an <?= e(setting('professional_title')) ?>.</p><p><?= nl2br(e(setting('about_text'))) ?></p><p><?= e(setting('experience')) ?></p>
   <div class="about-specialties"><span class="eyebrow">TECHNOLOGIES I WORK WITH</span><div class="tags tags-large"><?php foreach (array_filter(array_map('trim',explode(',',setting('skills')))) as $skill): ?><span><?= e($skill) ?></span><?php endforeach; ?></div></div>
   <div class="interest-line"><span class="eyebrow">INTERESTS</span><p><?= e(setting('interests')) ?></p></div>
  </div>
</div></section>
<?php endif; ?>
<?php if (global_flag('section_projects')): ?>
<section class="projects-section section-space" id="projects"><div class="container">
 <div class="section-header reveal"><div><p class="eyebrow">02 / SELECTED WORK</p><h2>Things I've <em>built.</em></h2><p>Experiments, experiences, and everything in between. Take a look around.</p></div><span class="project-total"><?= count($projects) ?> <small>public project<?= count($projects)!==1?'s':'' ?></small></span></div>
 <div class="project-toolbar"><div class="filter-chips" role="group" aria-label="Project development status"><button class="filter-chip active" type="button" data-filter="all" aria-pressed="true">All</button><button class="filter-chip" type="button" data-filter="completed" aria-pressed="false">Completed</button><button class="filter-chip" type="button" data-filter="ongoing" aria-pressed="false">Ongoing</button><button class="filter-chip" type="button" data-filter="upcoming" aria-pressed="false">Upcoming</button></div><div class="search-filters"><label class="search-field"><span class="sr-only">Search projects by title or technology</span><span>⌕</span><input id="project-search" type="search" placeholder="Search projects..."></label><label><span class="sr-only">Filter by category</span><select id="category-filter"><option value="all">All categories</option><?php foreach ($categories as $category): ?><option value="<?= (int)$category['id'] ?>"><?= e($category['name']) ?></option><?php endforeach; ?></select></label></div></div>
 <div class="projects-grid" id="projects-grid"><?php foreach ($projects as $project): require __DIR__ . '/includes/project-card.php'; endforeach; ?></div>
 <div class="empty-state" id="empty-projects" <?= $projects ? 'hidden' : '' ?>><span>⌁</span><h3>No projects found</h3><p>Try another search or category, or add a project in the admin dashboard.</p></div>
</div></section>
<?php endif; ?>
<?php require __DIR__ . '/includes/public-footer.php'; ?>

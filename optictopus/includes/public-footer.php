<?php
$social = db()->query('SELECT platform,link,enabled FROM social_links WHERE enabled=1')->fetchAll();
$socialNames = ['facebook'=>'Facebook','instagram'=>'Instagram','telegram'=>'Telegram','gmail'=>'Gmail','whatsapp'=>'WhatsApp','tiktok'=>'TikTok'];
$socialUrl = static function (array $item): ?string {
    $platform = $item['platform']; $link = trim($item['link']);
    if ($link === '') return null;
    if ($platform === 'gmail') {
        $email = preg_replace('/^mailto:/i', '', $link);
        return filter_var($email, FILTER_VALIDATE_EMAIL) ? 'mailto:' . $email : null;
    }
    if ($platform === 'whatsapp' && preg_match('/^\+?[0-9 ]{7,17}$/', $link)) return 'https://wa.me/' . preg_replace('/[^0-9]/', '', $link);
    return safe_http_link($link);
};
?>
</main>
<footer class="site-footer" id="contact">
  <?php if (global_flag('section_contact')): ?><div class="container footer-main">
    <div><p class="eyebrow">HAVE SOMETHING IN MIND?</p><h2>Let's make something <em>great.</em></h2><p>Open to projects, conversations, and collaborations.</p>
      <?php $email = setting('contact_email'); if (filter_var($email, FILTER_VALIDATE_EMAIL)): ?><a class="button button-primary" href="mailto:<?= e($email) ?>">Get in touch <span aria-hidden="true">↗</span></a><?php endif; ?>
    </div>
    <div class="footer-right"><p class="eyebrow">FIND ME ONLINE</p><div class="socials" aria-label="Social profiles">
      <?php foreach ($social as $item): $link = $socialUrl($item); if (!$link) continue; ?>
        <a href="<?= e($link) ?>" <?= str_starts_with($link, 'http') ? 'target="_blank" rel="noopener noreferrer"' : '' ?> aria-label="<?= e($socialNames[$item['platform']] ?? ucfirst($item['platform'])) ?>" title="<?= e($socialNames[$item['platform']] ?? ucfirst($item['platform'])) ?>">
          <svg width="20" height="20" aria-hidden="true"><use href="#social-<?= e($item['platform']) ?>"></use></svg>
        </a>
      <?php endforeach; ?>
    </div><p class="footer-note">Find the full story behind each build in my project archive.</p></div>
  </div>
  <?php endif; ?><div class="container footer-bottom"><span>© <?= date('Y') ?> <?= e(setting('site_name')) ?> · <?= e(setting('footer_text')) ?></span><span><a href="<?= e(url('privacy.php')) ?>">Privacy</a> <a href="<?= e(url('sitemap.xml')) ?>">Sitemap</a> <a href="<?= e(url('admin/login.php')) ?>">Admin</a></span><span>Designed for the curious. <span class="sparkle">✳</span></span></div>
</footer>
</div>
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Analytics consent" hidden>
 <p><strong>Privacy matters.</strong> May we measure approximate, privacy-conscious visits? No GPS or invasive fingerprinting. <a href="<?= e(url('privacy.php')) ?>">Learn more</a></p>
 <div><button type="button" class="button button-subtle" data-consent="denied">Decline</button><button type="button" class="button button-primary" data-consent="granted">Allow analytics</button></div>
</div>
<div class="toast" id="toast" aria-live="polite" role="status"></div>
<script>window.PORTFOLIO=<?= json_encode(['base'=>url(), 'csrf'=>csrf_token(), 'analytics'=>global_flag('analytics_enabled'), 'defaultTheme'=>setting('default_theme','dark')], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="<?= e(url('assets/js/site.js')) ?>?v=7.0" defer></script>
<script src="<?= e(url('assets/js/galaxy.js')) ?>?v=7.0" defer></script>
<script src="<?= e(url('assets/js/mascot2d.js')) ?>?v=7.0" defer></script>
</body></html>

<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin(); require dirname(__DIR__).'/includes/upload.php';
$error='';
$fields=[
 'General'=>['site_name'=>'Website / brand name','site_description'=>'Website description','footer_text'=>'Footer copyright text','seo_keywords'=>'SEO keywords'],
 'Hero'=>['hero_kicker'=>'Hero kicker','hero_title'=>'Hero headline','hero_text'=>'Hero introduction'],
 'Profile'=>['owner_name'=>'Your name','professional_title'=>'Professional title','about_text'=>'About me','skills'=>'Skills (comma-separated)','interests'=>'Development interests','experience'=>'Experience / background','contact_email'=>'Contact email'],
];
$toggles=['section_about'=>'Show About section','section_projects'=>'Show Projects section','section_contact'=>'Show Contact section','show_views'=>'Show project view counts','show_likes'=>'Show like counts','show_rating'=>'Show average ratings','show_rating_count'=>'Show number of ratings','enable_likes'=>'Allow heart reactions','enable_ratings'=>'Allow new ratings','analytics_enabled'=>'Enable opt-in analytics','animations_enabled'=>'Enable visual animations','mascot_enabled'=>'Show interactive OPTICTOPUS mascot on homepage'];
if ($_SERVER['REQUEST_METHOD']==='POST') {
 verify_csrf();
 $new=[];
 foreach ($fields as $group=>$options) foreach ($options as $key=>$label) $new[$key]=trim((string)($_POST[$key]??''));
 foreach ($toggles as $key=>$label) $new[$key]=isset($_POST[$key])?'1':'0';
 $new['default_theme']=in_array($_POST['default_theme']??'',['dark','light'],true)?$_POST['default_theme']:'dark';
 $new['background_style']=in_array($_POST['background_style']??'',['glow','clean'],true)?$_POST['background_style']:'glow';
 $new['layout_style']=in_array($_POST['layout_style']??'',['grid','compact'],true)?$_POST['layout_style']:'grid';
 $new['accent_color']=(string)($_POST['accent_color']??'#A879F5');
 $days=(int)($_POST['retention_days']??365); $new['retention_days']=(string)max(7,min(730,$days));
 if (!preg_match('/^#[a-f0-9]{6}$/i',$new['accent_color'])) $error='Accent color must be a six-digit hexadecimal color.';
 elseif ($new['site_name']==='' || strlen($new['site_name'])>120 || strlen($new['hero_title'])>250) $error='Website name is required (maximum 120 characters) and headline must be under 250 characters.';
 elseif ($new['contact_email']!=='' && !filter_var($new['contact_email'],FILTER_VALIDATE_EMAIL)) $error='Please enter a valid contact email.';
 $socials=[]; $platforms=['facebook','instagram','telegram','gmail','whatsapp','tiktok'];
 foreach ($platforms as $platform) {
  $value=trim((string)($_POST['social_'.$platform]??''));
  if ($platform==='gmail') {
   $email=preg_replace('/^mailto:/i','',$value);
   if ($value!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL)) $error='Enter a valid Gmail email address.';
   $value=$email;
  } elseif ($platform==='whatsapp' && preg_match('/^\+?[0-9 ]{7,17}$/',$value)) {
   $value='https://wa.me/'.preg_replace('/\D/','',$value);
  } elseif ($value!=='' && !safe_http_link($value)) $error='Social profile links must be valid HTTP(S) URLs, or a WhatsApp number.';
  $socials[$platform]=['link'=>$value,'enabled'=>isset($_POST['enabled_'.$platform])?1:0];
 }
 $added=[];
 if (!$error) {
  try {
   foreach (['profile_image','logo_image','favicon_image'] as $key) {
    if (isset($_FILES[$key]) && ($_FILES[$key]['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE) {
     $added[$key]=store_image($_FILES[$key],$key); $new[$key]=$added[$key];
    }
   }
   $oldImages=[]; foreach ($added as $key=>$value) $oldImages[$key]=setting($key);
   db()->beginTransaction();
   foreach ($new as $key=>$value) setting_save($key,$value);
   $s=db()->prepare('INSERT INTO social_links(platform,link,enabled) VALUES (?,?,?) ON DUPLICATE KEY UPDATE link=VALUES(link),enabled=VALUES(enabled)');
   foreach ($socials as $platform=>$v) $s->execute([$platform,$v['link'],$v['enabled']]);
   db()->commit();
   foreach ($oldImages as $oldFile) delete_uploaded_image($oldFile);
   flash('Website settings saved.'); redirect('admin/settings.php');
  } catch (Throwable $ex) {
   if (db()->inTransaction()) db()->rollBack();
   foreach ($added as $newFile) delete_uploaded_image($newFile);
   $error=$ex instanceof RuntimeException ? $ex->getMessage() : 'Settings could not be saved.';
  }
 }
}
$links=[];foreach (db()->query('SELECT * FROM social_links') as $social) $links[$social['platform']]=$social;
$pageTitle='Website Settings';$active='settings';require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">MAKE IT YOURS</p><h1>Website <span class="accent">settings.</span></h1><p>Customize the public experience, appearance, privacy and contact details.</p></div></div>
<?php if ($error): ?><div class="alert error" role="alert"><?= e($error) ?></div><?php endif; ?>
<form method="post" enctype="multipart/form-data" class="settings-layout"><?= csrf_field() ?>
<div class="settings-left">
<?php foreach ($fields as $group=>$options): ?><section class="panel"><h2><?= e($group) ?> settings</h2><div class="form-stack"><?php foreach ($options as $key=>$label): ?><label><?= e($label) ?><?php if (in_array($key,['about_text','hero_text','site_description','experience','interests'],true)): ?><textarea name="<?= e($key) ?>" rows="3"><?= e(setting($key)) ?></textarea><?php else: ?><input name="<?= e($key) ?>" value="<?= e(setting($key)) ?>" <?= $key==='contact_email'?'type="email"':'' ?>></label><?php continue; ?><?php endif; ?></label><?php endforeach; ?></div></section><?php endforeach; ?>
<section class="panel"><h2>Brand assets</h2><p class="hint">The included OPTICTOPUS octopus logo and favicon are active by default. Uploading your own brand assets overrides the header logo/favicon; the interactive hero mascot remains part of the design.</p><div class="form-grid"><label>Profile picture <small>JPG, PNG, WebP</small><input type="file" name="profile_image" accept="image/jpeg,image/png,image/webp"></label><label>Brand logo <small>Optional</small><input type="file" name="logo_image" accept="image/jpeg,image/png,image/webp"></label><label>Favicon <small>Best as a square image</small><input type="file" name="favicon_image" accept="image/jpeg,image/png,image/webp"></label></div></section>
<section class="panel"><h2>Appearance</h2><div class="form-grid"><label>Default color theme<select name="default_theme"><option value="dark" <?= setting('default_theme')==='dark'?'selected':'' ?>>Dark</option><option value="light" <?= setting('default_theme')==='light'?'selected':'' ?>>Light</option></select></label><label>Accent color<input type="color" name="accent_color" value="<?= e(setting('accent_color','#A879F5')) ?>"></label><label>Background style<select name="background_style"><option value="glow" <?= setting('background_style')==='glow'?'selected':'' ?>>Soft gradient glow</option><option value="clean" <?= setting('background_style')==='clean'?'selected':'' ?>>Clean / flat</option></select></label><label>Project layout<select name="layout_style"><option value="grid" <?= setting('layout_style')==='grid'?'selected':'' ?>>Standard grid</option><option value="compact" <?= setting('layout_style')==='compact'?'selected':'' ?>>Compact grid</option></select></label></div></section>
<section class="panel" id="visibility"><h2>Public visibility & features</h2><div class="checkbox-grid"><?php foreach ($toggles as $key=>$label): ?><label class="check-label"><input type="checkbox" name="<?= e($key) ?>" value="1" <?= global_flag($key)?'checked':'' ?>> <?= e($label) ?></label><?php endforeach; ?></div><p class="hint">Project-specific settings can override global reactions and statistic visibility. Disabling a public counter never deletes the stored data.</p></section>
<section class="panel"><h2>Visitor privacy</h2><label>Analytics retention (days)<input type="number" name="retention_days" min="7" max="730" value="<?= (int)setting('retention_days','365') ?>"></label><p class="hint">Analytics require visitor consent. Cleanup runs opportunistically during recorded visits; on very low-traffic sites, expiration may be delayed until another visit occurs.</p></section>
<section class="panel"><h2>Social media links</h2><p class="hint">Gmail takes an email address, WhatsApp accepts a wa.me link or international phone number, other fields take full URLs.</p><div class="form-stack"><?php foreach (['facebook','instagram','telegram','gmail','whatsapp','tiktok'] as $platform): ?><div class="social-setting"><label><?= e(ucfirst($platform)) ?><input name="social_<?= $platform ?>" value="<?= e($links[$platform]['link']??'') ?>" placeholder="<?= $platform==='gmail'?'you@gmail.com':($platform==='whatsapp'?'+639123456789':'https://...') ?>"></label><label class="check-label"><input type="checkbox" name="enabled_<?= $platform ?>" value="1" <?= !isset($links[$platform]) || $links[$platform]['enabled']?'checked':'' ?>> Enabled</label></div><?php endforeach; ?></div></section>
</div><aside class="settings-right"><div class="panel sticky-save"><h2>Save changes</h2><p class="muted">Updates are reflected on the portfolio immediately after saving. Visitors' saved theme preferences still take priority.</p><button class="button button-primary button-full" type="submit">Save website settings →</button><a class="button button-small button-full" href="<?= e(url()) ?>" target="_blank" rel="noopener">Preview live website ↗</a></div></aside></form>
<?php require __DIR__.'/_footer.php'; ?>

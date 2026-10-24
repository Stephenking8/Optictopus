<?php
require dirname(__DIR__).'/includes/bootstrap.php'; require_admin(); $error='';
if ($_SERVER['REQUEST_METHOD']==='POST') {
 verify_csrf();
 $current=(string)($_POST['current']??'');$new=(string)($_POST['new']??'');$repeat=(string)($_POST['repeat']??'');
 $s=db()->prepare('SELECT password_hash FROM admins WHERE id=?');$s->execute([$_SESSION['admin_id']]);$hashed=$s->fetchColumn();
 if (!$hashed || !password_verify($current,$hashed)) $error='Your current password is incorrect.';
 elseif (strlen($new)<12 || strlen($new)>200) $error='New password must contain at least 12 characters and no more than 200 bytes.';
 elseif ($new!==$repeat) $error='New passwords do not match.';
 elseif (hash_equals($current,$new)) $error='Choose a different password from your current one.';
 else {
  db()->prepare('UPDATE admins SET password_hash=? WHERE id=?')->execute([password_hash($new,PASSWORD_DEFAULT),$_SESSION['admin_id']]);
  session_regenerate_id(true);flash('Password changed successfully.');redirect('admin/security.php');
 }
}
$pageTitle='Security';$active='security';require __DIR__.'/_header.php';
?>
<div class="page-heading"><div><p class="eyebrow">ADMINISTRATOR ACCESS</p><h1>Account <span class="accent">security.</span></h1><p>Update credentials and review basic session security.</p></div></div>
<?php if ($error): ?><div class="alert error"><?= e($error) ?></div><?php endif; ?>
<div class="edit-layout"><section class="panel"><h2>Change admin password</h2><form method="post" class="form-stack"><?= csrf_field() ?><label>Current password<input name="current" type="password" required autocomplete="current-password"></label><label>New password<input name="new" type="password" minlength="12" required autocomplete="new-password"></label><label>Confirm new password<input name="repeat" type="password" minlength="12" required autocomplete="new-password"></label><button class="button button-primary" type="submit">Update password →</button></form></section><aside class="panel"><h2>Active session</h2><p class="muted">Signed in as <strong><?= e(admin_name()) ?></strong>.</p><p class="muted">Session started: <strong><?= e(gmdate('M j, Y H:i', (int)($_SESSION['admin_login_at'] ?? time()))) ?> UTC</strong>. Sessions time out after 30 minutes of inactivity.</p><p class="muted">PHP session cookies are HttpOnly, SameSite=Lax, and Secure when HTTPS is active.</p><p class="muted">Logging out invalidates the current session. Separate browsers or sessions must be logged out independently.</p><form method="post" action="<?= e(url('admin/logout.php')) ?>"><?= csrf_field() ?><button type="submit" class="button button-small">Secure logout</button></form><p class="hint">For live hosting, always enable HTTPS and use a unique database password and application key.</p></aside></div>
<?php require __DIR__.'/_footer.php'; ?>

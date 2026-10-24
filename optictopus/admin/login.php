<?php
require dirname(__DIR__).'/includes/bootstrap.php';
require_ready();
header('Cache-Control: no-store');
if (admin_logged_in()) redirect('admin/index.php');
if ((int)db()->query('SELECT COUNT(*) FROM admins')->fetchColumn() === 0) redirect('admin/setup.php');
$error='';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    if (!throttle('login', 8, 900)) { http_response_code(429); $error='Too many attempts. Please try again in 15 minutes.'; }
    else {
        $username = trim((string)($_POST['username'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $s = db()->prepare('SELECT * FROM admins WHERE username=? LIMIT 1'); $s->execute([$username]); $admin=$s->fetch();
        if ($admin && password_verify($password, $admin['password_hash'])) {
            if (password_needs_rehash($admin['password_hash'], PASSWORD_DEFAULT)) db()->prepare('UPDATE admins SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$admin['id']]);
            session_regenerate_id(true); $_SESSION['admin_id']=(int)$admin['id']; $_SESSION['admin_name']=$admin['username']; $_SESSION['admin_last_seen']=time(); $_SESSION['admin_login_at']=time();
            db()->prepare('UPDATE admins SET last_login_at=UTC_TIMESTAMP() WHERE id=?')->execute([$admin['id']]);
            redirect('admin/index.php');
        }
        $error='Invalid username or password.';
        usleep(250000);
    }
}
$pageTitle='Admin sign in'; require __DIR__.'/_auth-header.php';
?>
<div class="auth-panel"><span class="eyebrow">PRIVATE WORKSPACE</span><h1>Welcome back<span class="accent">.</span></h1><p>Sign in to manage your projects, website, and visitor insights.</p>
<?php if ($error): ?><div class="alert error" role="alert"><?= e($error) ?></div><?php endif; ?>
<form method="post" class="form-stack"><?= csrf_field() ?><label>Username<input name="username" required autocomplete="username" autofocus></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button type="submit" class="button button-primary">Secure sign in →</button></form><p class="auth-note"><a href="<?= e(url()) ?>">← Back to portfolio</a></p></div>
<?php require __DIR__.'/_auth-footer.php'; ?>

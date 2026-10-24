<?php
require dirname(__DIR__).'/includes/bootstrap.php';
require_ready();
header('Cache-Control: no-store');
$existing = (int)db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
if ($existing > 0) redirect('admin/login.php');
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string)($_POST['username'] ?? ''));
    $pass = (string)($_POST['password'] ?? '');
    $confirm = (string)($_POST['confirm'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.-]{4,80}$/', $username)) $error = 'Choose a 4–80 character username using letters, numbers, underscores, dots, or hyphens.';
    elseif (strlen($pass) < 12 || strlen($pass) > 200) $error = 'Use a password of at least 12 characters and no more than 200 bytes.';
    elseif ($pass !== $confirm) $error = 'Passwords do not match.';
    else {
        try {
            db()->beginTransaction();
            $lock = db()->query('SELECT id FROM admins LIMIT 1 FOR UPDATE');
            if ($lock->fetch()) { db()->rollBack(); redirect('admin/login.php'); }
            $s = db()->prepare('INSERT INTO admins(id,username,password_hash) VALUES (1,?,?)');
            $s->execute([$username, password_hash($pass, PASSWORD_DEFAULT)]);
            db()->commit();
            session_regenerate_id(true); $_SESSION['admin_id']=1; $_SESSION['admin_name']=$username; $_SESSION['admin_last_seen']=time(); $_SESSION['admin_login_at']=time();
            flash('Your administrator account has been created.'); redirect('admin/index.php');
        } catch (Throwable $ex) { if (db()->inTransaction()) db()->rollBack(); $error='Setup failed. Please inspect your database configuration and try again.'; }
    }
}
$pageTitle='Set up administrator'; require __DIR__.'/_auth-header.php';
?>
<div class="auth-panel"><span class="eyebrow">ONE-TIME SETUP</span><h1>Create your admin account</h1><p>Configure the database first, then set a unique username and a strong password. Once created, this setup page locks automatically.</p>
<?php if ($error): ?><div class="alert error"><?= e($error) ?></div><?php endif; ?>
<form method="post" class="form-stack"><?= csrf_field() ?><label>Username<input name="username" required minlength="4" maxlength="80" autocomplete="username" value="<?= e($_POST['username'] ?? '') ?>"></label><label>Password (12+ characters)<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>Confirm password<input name="confirm" type="password" required minlength="12" autocomplete="new-password"></label><button class="button button-primary" type="submit">Create administrator →</button></form></div>
<?php require __DIR__.'/_auth-footer.php'; ?>

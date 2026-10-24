<?php
require dirname(__DIR__).'/includes/bootstrap.php';
require_post(); verify_csrf();
$_SESSION=[];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', ['expires'=>time()-3600, 'path'=>$p['path'], 'secure'=>$p['secure'], 'httponly'=>$p['httponly'], 'samesite'=>'Lax']);
}
session_destroy(); redirect('admin/login.php');

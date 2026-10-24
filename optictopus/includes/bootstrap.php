<?php
declare(strict_types=1);

$config = require dirname(__DIR__) . '/config.php';
if (empty($config['app_key']) || !is_string($config['app_key']) || !preg_match('/^[a-f0-9]{64}$/iD', $config['app_key'])) {
    http_response_code(503); exit('Invalid application key. Set a random 64-character hexadecimal app_key in config.php.');
}
date_default_timezone_set('UTC');
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('session.use_strict_mode', '1');
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('portfolio_session');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => ($config['base_path'] ?: '/') . (empty($config['base_path']) ? '' : '/'),
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true, 'samesite' => 'Lax',
    ]);
    session_start();
}
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: DENY');

function cfg(string $key, mixed $default = null): mixed { return $GLOBALS['config'][$key] ?? $default; }
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('mysql:host=' . cfg('db_host') . ';port=' . cfg('db_port', '3306') . ';dbname=' . cfg('db_name') . ';charset=utf8mb4',
            (string)cfg('db_user'), (string)cfg('db_pass'), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        $pdo->exec("SET time_zone = '+00:00'");
    }
    return $pdo;
}
function e(?string $text): string { return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(string $path = ''): string {
    $base = rtrim((string)cfg('base_path', ''), '/');
    return ($base ?: '') . '/' . ltrim($path, '/');
}
function absolute_url(string $path = ''): string {
    $site = rtrim((string)cfg('site_url'), '/');
    if ($site === '') {
        $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $site = ($https ? 'https://' : 'http://') . $host;
    }
    return $site . url($path);
}
function project_url(array $project): string {
    return cfg('pretty_urls') ? url('project/' . rawurlencode($project['slug'])) : url('project.php?slug=' . rawurlencode($project['slug']));
}
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(32)); }
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">'; }
function verify_csrf(): void {
    $given = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($given) || !hash_equals(csrf_token(), $given)) {
        http_response_code(419); exit('Security token expired. Reload the page and try again.');
    }
}
function require_post(): void { if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit('Method not allowed'); } }
function redirect(string $path): never { header('Location: ' . url($path), true, 303); exit; }
function flash(string $message, string $type = 'success'): void { $_SESSION['flash'] = [$message, $type]; }
function take_flash(): ?array { $v = $_SESSION['flash'] ?? null; unset($_SESSION['flash']); return $v; }
function settings(): array {
    static $all = null;
    if ($all === null) {
        $all = [];
        foreach (db()->query('SELECT `key`, `value` FROM settings') as $s) $all[$s['key']] = $s['value'];
    }
    return $all;
}
function setting(string $key, string $fallback = ''): string { return settings()[$key] ?? $fallback; }
function flag(array $project, string $projectKey, string $settingKey, bool $default = true): bool {
    if (array_key_exists($projectKey, $project) && $project[$projectKey] !== null) return (bool)$project[$projectKey];
    return setting($settingKey, $default ? '1' : '0') === '1';
}
function global_flag(string $key, bool $default = true): bool { return setting($key, $default ? '1' : '0') === '1'; }
function admin_logged_in(): bool { return isset($_SESSION['admin_id']) && is_int($_SESSION['admin_id']); }
function require_admin(): void {
    header('Cache-Control: private, no-store');
    if (!admin_logged_in()) redirect('admin/login.php');
    if (isset($_SESSION['admin_last_seen']) && time() - (int)$_SESSION['admin_last_seen'] > 1800) {
        unset($_SESSION['admin_id'], $_SESSION['admin_name'], $_SESSION['admin_last_seen'], $_SESSION['admin_login_at']);
        session_regenerate_id(true);
        flash('Your admin session expired. Please sign in again.', 'error');
        redirect('admin/login.php');
    }
    $_SESSION['admin_last_seen'] = time();
}
function admin_name(): string { return (string)($_SESSION['admin_name'] ?? 'Administrator'); }
function clean_slug(string $value): string { return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($value)) ?? '', '-'); }
function image_src(?string $path): string {
    if (!$path) return url('assets/img/placeholder.svg');
    return url(ltrim($path, '/'));
}
function json_response(array $data, int $status = 200): never {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE); exit;
}
function browser_visitor_hash(bool $create = false): ?string {
    $raw = $_COOKIE['portfolio_visitor'] ?? '';
    if (!is_string($raw) || !preg_match('/^[a-f0-9]{64}$/D', $raw)) {
        if (!$create) return null;
        $raw = bin2hex(random_bytes(32));
        setcookie('portfolio_visitor', $raw, [
            'expires' => time() + 365 * 86400, 'path' => url(''),
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true, 'samesite' => 'Lax',
        ]);
        $_COOKIE['portfolio_visitor'] = $raw;
    }
    return hash_hmac('sha256', $raw, (string)cfg('app_key'));
}
function hashed_ip_key(string $purpose): string { return hash_hmac('sha256', $purpose . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), (string)cfg('app_key')); }
function throttle(string $purpose, int $limit, int $seconds): bool {
    $key = hashed_ip_key($purpose);
    if (random_int(1, 100) === 1) db()->exec('DELETE FROM rate_limits WHERE window_start < UNIX_TIMESTAMP()-86400');
    $sql = 'INSERT INTO rate_limits (key_hash, window_start, attempts) VALUES (?, UNIX_TIMESTAMP(), 1) '
         . 'ON DUPLICATE KEY UPDATE attempts = IF(window_start < UNIX_TIMESTAMP() - ?, 1, attempts + 1), '
         . 'window_start = IF(window_start < UNIX_TIMESTAMP() - ?, UNIX_TIMESTAMP(), window_start)';
    db()->prepare($sql)->execute([$key, $seconds, $seconds]);
    $s = db()->prepare('SELECT attempts FROM rate_limits WHERE key_hash = ?'); $s->execute([$key]);
    return (int)$s->fetchColumn() <= $limit;
}
function all_projects(string $where = "p.publication = 'published' AND p.is_hidden = 0 AND p.deleted_at IS NULL", array $params = []): array {
    $sql = "SELECT p.*, c.name AS category_name,
      COALESCE(l.total,0) AS likes_count, COALESCE(r.total,0) AS ratings_count,
      COALESCE(r.average,0) AS average_rating, COALESCE(v.total,0) AS views_count
      FROM projects p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (SELECT project_id, COUNT(*) total FROM project_likes GROUP BY project_id) l ON l.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*) total, AVG(stars) average FROM project_ratings GROUP BY project_id) r ON r.project_id = p.id
      LEFT JOIN (SELECT project_id, COUNT(*) total FROM project_views GROUP BY project_id) v ON v.project_id = p.id
      WHERE $where ORDER BY p.is_featured DESC, p.sort_order ASC, p.created_at DESC";
    $stmt = db()->prepare($sql); $stmt->execute($params); return $stmt->fetchAll();
}
function visitor_engagement(int $projectId): array {
    $hash = browser_visitor_hash();
    if ($hash === null) return ['liked' => false, 'rating' => 0];
    $s = db()->prepare('SELECT EXISTS(SELECT 1 FROM project_likes WHERE project_id=? AND visitor_hash=?) AS liked, (SELECT stars FROM project_ratings WHERE project_id=? AND visitor_hash=?) AS rating');
    $s->execute([$projectId, $hash, $projectId, $hash]); $row = $s->fetch();
    return ['liked' => (bool)$row['liked'], 'rating' => (int)$row['rating']];
}
function setting_save(string $key, string $value): void {
    db()->prepare('INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)')->execute([$key, $value]);
}
function project_exists_public(int $id): ?array {
    $s = db()->prepare("SELECT * FROM projects WHERE id=? AND publication='published' AND is_hidden=0 AND deleted_at IS NULL");
    $s->execute([$id]); return $s->fetch() ?: null;
}
function safe_http_link(?string $s): ?string {
    $s = trim((string)$s);
    return $s !== '' && filter_var($s, FILTER_VALIDATE_URL) && in_array(strtolower((string)parse_url($s, PHP_URL_SCHEME)), ['https','http'], true) ? $s : null;
}
function require_ready(): void {
    try { db()->query('SELECT id FROM admins LIMIT 1'); }
    catch (Throwable $ex) { http_response_code(503); exit('Database not ready. Import database.sql and configure config.php first. See README.md.'); }
}

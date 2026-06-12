<?php
declare(strict_types=1);

session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();
header('Content-Type: application/json; charset=utf-8');

$root = __DIR__;
$dataDir = $root . DIRECTORY_SEPARATOR . 'data';
$productsDir = $root . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'products';
$storeFile = $dataDir . DIRECTORY_SEPARATOR . 'products.json';
$defaultPassword = '0610775130';

if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}
if (!is_dir($productsDir)) {
    mkdir($productsDir, 0775, true);
}

function respond($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $json = json_decode($raw, true);
    return is_array($json) ? $json : [];
}

function initial_store(string $password): array {
    return [
        'products' => [],
        'orders' => [],
        'messages' => [],
        'home' => [],
        'ratings' => new stdClass(),
        'adminPassword' => $password
    ];
}

function load_store(string $file, string $password): array {
    if (!file_exists($file)) {
        $store = initial_store($password);
        file_put_contents($file, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
        return $store;
    }
    $data = json_decode(file_get_contents($file) ?: '', true);
    if (!is_array($data)) {
        $data = initial_store($password);
    }
    foreach (['products', 'orders', 'messages', 'home'] as $key) {
        if (!isset($data[$key]) || !is_array($data[$key])) {
            $data[$key] = [];
        }
    }
    if (!isset($data['ratings']) || !is_array($data['ratings'])) {
        $data['ratings'] = new stdClass();
    }
    if (empty($data['adminPassword'])) {
        $data['adminPassword'] = $password;
    }
    return $data;
}

function save_store(string $file, array $store): void {
    file_put_contents($file, json_encode($store, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
}

function is_admin(): bool {
    return !empty($_SESSION['boa_admin']);
}

function require_admin(): void {
    if (!is_admin()) {
        respond(['ok' => false, 'error' => 'unauthorized'], 401);
    }
}

function slug_name(string $name): string {
    $name = trim($name) ?: 'product';
    $name = preg_replace('/\s+/u', '_', $name);
    $name = preg_replace('/[\\\\\\/:*?"<>|]+/u', '', $name);
    return $name ?: 'product';
}

function save_data_image(string $src, string $productName, int $index, string $productsDir): string {
    if (strpos($src, 'data:image/') !== 0) {
        return $src;
    }
    if (!preg_match('/^data:image\\/(png|jpe?g|webp|gif);base64,(.+)$/i', $src, $match)) {
        return $src;
    }
    $ext = strtolower($match[1]);
    if ($ext === 'jpeg') {
        $ext = 'jpg';
    }
    $bytes = base64_decode($match[2], true);
    if ($bytes === false) {
        return $src;
    }
    $fileName = slug_name($productName) . ($index + 1) . '.' . $ext;
    $target = $productsDir . DIRECTORY_SEPARATOR . $fileName;
    file_put_contents($target, $bytes);
    return 'images/products/' . $fileName;
}

function normalize_products(array $products, string $productsDir): array {
    foreach ($products as &$product) {
        $name = (string)($product['name'] ?? 'product');
        $images = [];
        foreach (($product['images'] ?? []) as $index => $image) {
            $src = is_array($image) ? (string)($image['src'] ?? '') : (string)$image;
            if ($src === '') {
                continue;
            }
            $saved = save_data_image($src, $name, (int)$index, $productsDir);
            $images[] = [
                'src' => $saved,
                'name' => slug_name($name) . ((int)$index + 1)
            ];
        }
        $product['images'] = $images;
    }
    unset($product);
    return array_values($products);
}

$store = load_store($storeFile, $defaultPassword);
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'public') {
        respond([
            'ok' => true,
            'products' => $store['products'],
            'home' => $store['home'],
            'ratings' => $store['ratings']
        ]);
    }
    if ($action === 'admin') {
        require_admin();
        respond([
            'ok' => true,
            'products' => $store['products'],
            'home' => $store['home'],
            'ratings' => $store['ratings'],
            'orders' => $store['orders'],
            'messages' => $store['messages']
        ]);
    }
    respond(['ok' => false, 'error' => 'unknown_action'], 404);
}

$body = read_body();

if ($action === 'login') {
    $password = (string)($body['password'] ?? '');
    if ($password === $store['adminPassword'] || $password === $defaultPassword) {
        $_SESSION['boa_admin'] = true;
        $expires = !empty($body['remember']) ? time() + (60 * 60 * 24 * 30) : 0;
        setcookie(session_name(), session_id(), [
            'expires' => $expires,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        respond(['ok' => true]);
    }
    respond(['ok' => false, 'error' => 'wrong_password'], 403);
}

if ($action === 'logout') {
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'addOrder') {
    $order = $body['order'] ?? [];
    if (!is_array($order)) {
        respond(['ok' => false, 'error' => 'bad_order'], 400);
    }
    $order['id'] = $order['id'] ?? (int)(microtime(true) * 1000);
    $order['status'] = $order['status'] ?? 'pending';
    array_unshift($store['orders'], $order);
    save_store($storeFile, $store);
    respond(['ok' => true, 'order' => $order]);
}

if ($action === 'addMessage') {
    $message = $body['message'] ?? [];
    if (!is_array($message)) {
        respond(['ok' => false, 'error' => 'bad_message'], 400);
    }
    $message['id'] = $message['id'] ?? (int)(microtime(true) * 1000);
    array_unshift($store['messages'], $message);
    save_store($storeFile, $store);
    respond(['ok' => true, 'message' => $message]);
}

if ($action === 'saveRatings') {
    $store['ratings'] = is_array($body['ratings'] ?? null) ? $body['ratings'] : [];
    save_store($storeFile, $store);
    respond(['ok' => true]);
}

require_admin();

if ($action === 'saveProducts') {
    $products = is_array($body['products'] ?? null) ? $body['products'] : [];
    $store['products'] = normalize_products($products, $productsDir);
    save_store($storeFile, $store);
    respond(['ok' => true, 'products' => $store['products']]);
}

if ($action === 'saveHome') {
    $store['home'] = is_array($body['home'] ?? null) ? array_values($body['home']) : [];
    save_store($storeFile, $store);
    respond(['ok' => true, 'home' => $store['home']]);
}

if ($action === 'confirmOrder') {
    $id = (string)($body['id'] ?? '');
    foreach ($store['orders'] as &$order) {
        if ((string)($order['id'] ?? '') === $id) {
            $order['status'] = 'confirmed';
            break;
        }
    }
    unset($order);
    save_store($storeFile, $store);
    respond(['ok' => true, 'orders' => $store['orders']]);
}

if ($action === 'changePassword') {
    $oldPassword = (string)($body['oldPassword'] ?? '');
    if ($oldPassword !== $store['adminPassword'] && $oldPassword !== $defaultPassword) {
        respond(['ok' => false, 'error' => 'wrong_password'], 403);
    }
    $newPassword = trim((string)($body['newPassword'] ?? ''));
    if ($newPassword === '') {
        respond(['ok' => false, 'error' => 'empty_password'], 400);
    }
    $store['adminPassword'] = $newPassword;
    save_store($storeFile, $store);
    respond(['ok' => true]);
}

respond(['ok' => false, 'error' => 'unknown_action'], 404);

<?php
$host     = "trolley.proxy.rlwy.net";
$port     = "48962";
$db_name  = "railway";
$username = "root";
$password = "GtXYQtWHqnXAHOsIVWRloGSXJOrMoqEK";
$conn     = null;

try {
    $conn = new PDO(
        "mysql:host=$host;port=$port;dbname=$db_name;charset=utf8",
        $username,
        $password
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("SET NAMES utf8");
} catch (PDOException $e) {
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status"  => "error",
        "message" => "Connection error: " . $e->getMessage()
    ]);
    exit();
}
?>

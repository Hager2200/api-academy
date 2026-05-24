<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

$host = "trolley.proxy.rlwy.net";
$port = "48962";
$db_name = "railway";
$username = "root";
$password = "GtXYQtWHqnXAHOsIVWRloGSXJOrMoqEK";
$conn = null;

try {
    // تم إضافة الـ port هنا في سطر الاتصال
    $conn = new PDO("mysql:host=$host;port=$port;dbname=$db_name;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8");
}  catch (PDOException $e) {
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status"  => "error",
        "message" => "Connection error: " . $e->getMessage(),
        "code"    => $e->getCode()   // ← ضيف ده
    ]);
    exit();
}
?>
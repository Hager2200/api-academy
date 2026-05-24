<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$role = $_GET['role'] ?? null;

// فقط المدير يقدر يشوف المدربين
if ($role !== 'manager') {
    echo json_encode(["status" => "error", "message" => "Unauthorized: Only manager can view coaches"]);
    exit();
}

try {
    $stmt = $conn->prepare(
        "SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM coach ORDER BY first_name"
    );
    $stmt->execute();
    $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $coaches]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$role = $_GET['role'] ?? null;

// المدرب والمدير يقدر يشوف الساعات
if ($role !== 'manager' && $role !== 'coach') {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$times = [
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM",
    "7 PM",
    "8 PM"
];

echo json_encode([
    "status" => "success",
    "data" => $times
]);
?>
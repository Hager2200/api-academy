<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$role = $_GET['role'] ?? null;

// المدرب والمدير يقدر يشوف الأيام
if ($role !== 'manager' && $role !== 'coach') {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

$days = [
    "Saturday",
    "Sunday", 
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];

echo json_encode([
    "status" => "success",
    "data" => $days
]);
?>
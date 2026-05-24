<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$role = $_GET['role'] ?? null;
$coach_id_requested = (int) ($_GET['coach_id'] ?? 0);
$logged_coach_id = (int) ($_GET['logged_coach_id'] ?? 0);

// التحقق من الصلاحية
if ($role !== 'manager') {
    if ($role === 'coach' && $coach_id_requested != $logged_coach_id) {
        echo json_encode(["status" => "error", "message" => "Coach can only view their own availability"]);
        exit();
    }
    if ($role !== 'coach') {
        echo json_encode(["status" => "error", "message" => "Unauthorized"]);
        exit();
    }
}

if (!empty($_GET['coach_id'])) {
    try {
        $coach_id = (int) $_GET['coach_id'];
        
        $stmt = $conn->prepare(
            "SELECT working_day, working_time 
             FROM coach_availability 
             WHERE coach_id = :coach_id
             ORDER BY FIELD(working_day, 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'),
                      working_time"
        );
        $stmt->execute([':coach_id' => $coach_id]);
        $availability = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $grouped = [];
        foreach ($availability as $avail) {
            if (!isset($grouped[$avail['working_day']])) {
                $grouped[$avail['working_day']] = [];
            }
            $grouped[$avail['working_day']][] = $avail['working_time'];
        }
        
        echo json_encode([
            "status" => "success",
            "data" => $availability,
            "grouped" => $grouped
        ]);
        
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "coach_id is required"]);
}
?>
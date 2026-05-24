<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"));

try {

    // ===== GET: جلب كل الكلاسات =====
    if ($method === 'GET') {
        $stmt = $conn->prepare(
            "SELECT c.id,
                    c.day,
                    c.time,
                    c.class_level,
                    CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name
             FROM classes c
             LEFT JOIN coach ON c.coach_id = coach.id
             ORDER BY c.day, c.time"
        );
        $stmt->execute();
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

    // ===== POST: إضافة كلاس جديد =====
    } elseif ($method === 'POST') {
        if (!empty($data->day) && !empty($data->time) && !empty($data->class_level) && !empty($data->coach_id)) {
            $stmt = $conn->prepare(
                "INSERT INTO classes (day, time, class_level, coach_id)
                 VALUES (:day, :time, :level, :coach_id)"
            );
            $stmt->execute([
                ':day'      => $data->day,
                ':time'     => $data->time,
                ':level'    => $data->class_level,
                ':coach_id' => (int) $data->coach_id
            ]);
            echo json_encode(["status" => "success", "message" => "Class added"]);
        } else {
            echo json_encode(["status" => "error", "message" => "day, time, class_level, and coach_id are required"]);
        }

    // ===== PUT: تعديل كلاس =====
    } elseif ($method === 'PUT') {
        if (!empty($data->id)) {
            $stmt = $conn->prepare(
                "UPDATE classes
                 SET day = :day, time = :time, class_level = :level, coach_id = :coach_id
                 WHERE id = :id"
            );
            $stmt->execute([
                ':day'      => $data->day,
                ':time'     => $data->time,
                ':level'    => $data->class_level,
                ':coach_id' => (int) $data->coach_id,
                ':id'       => (int) $data->id
            ]);
            echo json_encode(["status" => "success", "message" => "Class updated"]);
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }

    // ===== DELETE: حذف كلاس =====
    } elseif ($method === 'DELETE') {
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM classes WHERE id = :id");
            $stmt->execute([':id' => (int) $data->id]);
            echo json_encode(["status" => "success", "message" => "Class deleted"]);
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

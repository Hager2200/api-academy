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

    // ===== GET: جلب كل الفرق =====
    if ($method === 'GET') {
        $stmt = $conn->prepare(
            "SELECT t.id,
                    t.team_name,
                    t.day,
                    t.time,
                    CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name
             FROM teams t
             LEFT JOIN coach ON t.coach_id = coach.id
             ORDER BY t.day, t.time"
        );
        $stmt->execute();
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

    // ===== POST: إضافة فريق جديد =====
    } elseif ($method === 'POST') {
        if (!empty($data->team_name) && !empty($data->day) && !empty($data->time) && !empty($data->coach_id)) {
            $stmt = $conn->prepare(
                "INSERT INTO teams (team_name, day, time, coach_id)
                 VALUES (:name, :day, :time, :coach_id)"
            );
            $stmt->execute([
                ':name'     => $data->team_name,
                ':day'      => $data->day,
                ':time'     => $data->time,
                ':coach_id' => (int) $data->coach_id
            ]);
            echo json_encode(["status" => "success", "message" => "Team added"]);
        } else {
            echo json_encode(["status" => "error", "message" => "team_name, day, time, and coach_id are required"]);
        }

    // ===== PUT: تعديل فريق =====
    } elseif ($method === 'PUT') {
        if (!empty($data->id)) {
            $stmt = $conn->prepare(
                "UPDATE teams
                 SET team_name = :name, day = :day, time = :time, coach_id = :coach_id
                 WHERE id = :id"
            );
            $stmt->execute([
                ':name'     => $data->team_name,
                ':day'      => $data->day,
                ':time'     => $data->time,
                ':coach_id' => (int) $data->coach_id,
                ':id'       => (int) $data->id
            ]);
            echo json_encode(["status" => "success", "message" => "Team updated"]);
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }

    // ===== DELETE: حذف فريق =====
    } elseif ($method === 'DELETE') {
        if (!empty($data->id)) {
            $stmt = $conn->prepare("DELETE FROM teams WHERE id = :id");
            $stmt->execute([':id' => (int) $data->id]);
            echo json_encode(["status" => "success", "message" => "Team deleted"]);
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>

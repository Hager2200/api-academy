<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->role)) {

    $valid_roles = ['manager', 'coach', 'swimmer'];

    if (!in_array($data->role, $valid_roles)) {
        echo json_encode(["status" => "error", "message" => "Invalid role"]);
        exit();
    }

    try {
        $table = $data->role;
        $stmt  = $conn->prepare("SELECT * FROM $table WHERE id = :id");
        $stmt->execute([':id' => $data->user_id]);
        $user  = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(["status" => "error", "message" => "User not found"]);
            exit();
        }

        unset($user['password']);

        // للمدير: نرجع أيضاً قائمة المدربين (الفرونت بيعرضها في Profile)
        if ($data->role === 'manager') {
            $stmtC   = $conn->prepare(
                "SELECT id, CONCAT(first_name, ' ', last_name) AS name FROM coach"
            );
            $stmtC->execute();
            $coaches = $stmtC->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "status" => "success",
                "data"   => $user,
                "coaches" => $coaches
            ]);
        } else {
            echo json_encode(["status" => "success", "data" => $user]);
        }

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

} else {
    echo json_encode(["status" => "error", "message" => "user_id and role are required"]);
}
?>

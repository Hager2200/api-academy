<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

// المدير والمدرب يقدر يعمل setup
// المدير يقدر يعدل لأي مدرب، المدرب يقدر يعدل لنفسه بس
$role = $data->role ?? null;
$coach_id_from_request = $data->coach_id ?? null;

if (!empty($coach_id_from_request) && !empty($data->days) && !empty($data->times)) {
    try {
        $coach_id = (int) $coach_id_from_request;
        
        // التحقق من الصلاحية: المدرب يقدر يعدل بياناته بس
        if ($role === 'coach') {
            // هنفترض إن الـ coach_id بيجي من التوكن
            $logged_coach_id = $data->logged_coach_id ?? null;
            if ($logged_coach_id != $coach_id) {
                echo json_encode(["status" => "error", "message" => "Coach can only update their own schedule"]);
                exit();
            }
        }
        
        // حذف المواعيد القديمة للمدرب ثم إعادة الإدخال
        $stmt = $conn->prepare("DELETE FROM coach_availability WHERE coach_id = :id");
        $stmt->execute([':id' => $coach_id]);

        $insert = $conn->prepare(
            "INSERT INTO coach_availability (coach_id, working_day, working_time)
             VALUES (:id, :day, :time)"
        );

        foreach ($data->days as $day) {
            foreach ($data->times as $time) {
                $insert->execute([
                    ':id'   => $coach_id,
                    ':day'  => $day,
                    ':time' => $time
                ]);
            }
        }

        echo json_encode(["status" => "success", "message" => "Coach schedule saved"]);

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "coach_id, days, and times are required"]);
}
?>
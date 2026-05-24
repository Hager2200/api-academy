<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

// ===== شاشة المدرب =====
if (!empty($data->coach_id)) {
    try {
        $coach_id = (int) $data->coach_id;

        // جدول الفرق
        $stmtTeams = $conn->prepare(
            "SELECT t.team_name,
                    t.day,
                    t.time,
                    CONCAT(c.first_name, ' ', c.last_name) AS coach_name
             FROM teams t
             LEFT JOIN coach c ON t.coach_id = c.id
             WHERE t.coach_id = :coach_id"
        );
        $stmtTeams->execute([':coach_id' => $coach_id]);
        $teams = $stmtTeams->fetchAll(PDO::FETCH_ASSOC);

        // جدول الحصص (السباحين اللي عندهم حجز مع المدرب)
        $stmtSwimmers = $conn->prepare(
            "SELECT
                SUBSTRING_INDEX(b.booking_data, '|', 1)  AS day,
                SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                s.gender,
                CONCAT(s.first_name, ' ', s.last_name)   AS name,
                s.age,
                s.level,
                b.status
             FROM bookings b
             JOIN swimmer s ON b.swimmer_id = s.id
             WHERE b.coach_id = :coach_id
             ORDER BY FIELD(SUBSTRING_INDEX(b.booking_data, '|', 1), 
                    'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'),
                    SUBSTRING_INDEX(b.booking_data, '|', -1)"
        );
        $stmtSwimmers->execute([':coach_id' => $coach_id]);
        $classes = $stmtSwimmers->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success",
            "role"   => "coach",
            "data"   => [
                "teams_schedule"   => $teams,
                "classes_schedule" => $classes
            ]
        ]);

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

// ===== شاشة السباح =====
} elseif (!empty($data->swimmer_id)) {
    try {
        $swimmer_id = (int) $data->swimmer_id;

        // جلب كل الحجوزات للسباح مع اسم المدرب لكل حجز
        $stmt = $conn->prepare(
            "SELECT
                b.id,
                SUBSTRING_INDEX(b.booking_data, '|', 1)  AS day,
                SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                b.status,
                CONCAT(c.first_name, ' ', c.last_name)   AS coach_name,
                c.id AS coach_id
             FROM bookings b
             JOIN coach c ON b.coach_id = c.id
             WHERE b.swimmer_id = :swimmer_id
             ORDER BY FIELD(SUBSTRING_INDEX(b.booking_data, '|', 1), 
                    'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'),
                    SUBSTRING_INDEX(b.booking_data, '|', -1)"
        );
        $stmt->execute([':swimmer_id' => $swimmer_id]);
        $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // جلب أسماء جميع المدربين المرتبطين بالسباح (للعرض في الـ UI)
        $coachNames = array_unique(array_column($schedule, 'coach_name'));
        $coach_name_display = !empty($coachNames) ? implode(', ', $coachNames) : "Not assigned yet";

        echo json_encode([
            "status" => "success",
            "role"   => "swimmer",
            "data"   => [
                "coach_name" => $coach_name_display,
                "coaches"    => $coachNames,
                "schedule"   => $schedule
            ]
        ]);

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

} else {
    echo json_encode(["status" => "error", "message" => "Please provide either coach_id or swimmer_id"]);
}
?>
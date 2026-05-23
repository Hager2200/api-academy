<?php
header("Content-type: application/json; charset=UTF-8");

include_once 'db.php';

// تم التصحيح إلى json_decode لفك تشفير البيانات القادمة
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->role)) {

    try {
        $table = ($data->role == 'swimmer') ? 'swimmer' : 'coach';

        $query = "SELECT * FROM $table WHERE id = :id";

        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $data->user_id);
        $stmt->execute();

        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            unset($user['password']);

            echo json_encode([
                "status" => "success",
                "data" => $user
            ]);
        } else { // تم تصحيح الـ Syntax هنا
            echo json_encode([
                "status" => "error",
                "message" => "User not found"
            ]);
        }

    } catch (PDOException $e) {
        echo json_encode([
            "status" => "error",
            "message" => $e->getMessage()
        ]);
    }
} else { // تم تصحيح الـ Syntax هنا
    echo json_encode([
        "status" => "error",
        "message" => "Incomplete data"
    ]);
}
?>
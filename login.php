<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->email) && !empty($data->password)) {
    try {
        $tables = ['manager', 'coach', 'swimmer'];
        $found  = false;

        foreach ($tables as $table) {
            // نجيب الـ password hash مع البيانات
            $query = "SELECT id, CONCAT(first_name, ' ', last_name) AS name, email, password
                      FROM $table
                      WHERE email = :email";
            $stmt  = $conn->prepare($query);
            $stmt->execute([':email' => $data->email]);

            if ($stmt->rowCount() > 0) {
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                // التحقق من كلمة المرور بـ password_verify
                if (password_verify($data->password, $user['password'])) {
                    unset($user['password']); // لا نرجع الـ hash للفرونت
                    $user['role'] = $table;
                    echo json_encode([
                        "status"  => "success",
                        "message" => "Login successful",
                        "user"    => $user
                    ]);
                    $found = true;
                    break;
                }
            }
        }

        if (!$found) {
            echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
        }

    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Email and password are required"]);
}
?>

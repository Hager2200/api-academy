<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

// التحقق من الحقول الأساسية
if (
    !empty($data->role)       &&
    !empty($data->email)      &&
    !empty($data->password)   &&
    !empty($data->confirm_password) &&
    !empty($data->first_name) &&
    !empty($data->last_name)
) {
    // التحقق من تطابق كلمتي المرور (الفرونت بيبعتهم، الباك بيتحقق)
    if ($data->password !== $data->confirm_password) {
        echo json_encode(["status" => "error", "message" => "Passwords do not match"]);
        exit();
    }

    // تشفير كلمة المرور
    $hashed = password_hash($data->password, PASSWORD_BCRYPT);
    $role   = $data->role;

    try {
        if ($role === 'manager') {
            $stmt = $conn->prepare(
                "INSERT INTO manager (first_name, last_name, phone, email, password)
                 VALUES (:fn, :ln, :phone, :email, :pass)"
            );
            $stmt->execute([
                ':fn'    => $data->first_name,
                ':ln'    => $data->last_name,
                ':phone' => $data->phone ?? null,
                ':email' => $data->email,
                ':pass'  => $hashed
            ]);

        } elseif ($role === 'coach') {
            $stmt = $conn->prepare(
                "INSERT INTO coach (first_name, last_name, gender, phone, email, password)
                 VALUES (:fn, :ln, :gender, :phone, :email, :pass)"
            );
            $stmt->execute([
                ':fn'     => $data->first_name,
                ':ln'     => $data->last_name,
                ':gender' => $data->gender ?? 'Male',
                ':phone'  => $data->phone ?? null,
                ':email'  => $data->email,
                ':pass'   => $hashed
            ]);

        } elseif ($role === 'swimmer') {
            $stmt = $conn->prepare(
                "INSERT INTO swimmer (first_name, last_name, gender, age, phone, level, email, password)
                 VALUES (:fn, :ln, :gender, :age, :phone, :level, :email, :pass)"
            );
            $stmt->execute([
                ':fn'     => $data->first_name,
                ':ln'     => $data->last_name,
                ':gender' => $data->gender ?? 'Male',
                ':age'    => $data->age    ?? null,
                ':phone'  => $data->phone  ?? null,
                ':level'  => $data->level  ?? null,
                ':email'  => $data->email,
                ':pass'   => $hashed
            ]);

        } else {
            echo json_encode(["status" => "error", "message" => "Invalid role"]);
            exit();
        }

        echo json_encode([
            "status"  => "success",
            "message" => ucfirst($role) . " registered successfully"
        ]);

    } catch (PDOException $e) {
        // إذا كان الـ email موجود مسبقاً
        if ($e->getCode() == 23000) {
            echo json_encode(["status" => "error", "message" => "Email already exists"]);
        } else {
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
    }
} else {
    echo json_encode(["status" => "error", "message" => "All fields are required"]);
}
?>

<?php
// login.php
include_once 'db.php'; //

$data =json_decode(file_get_contents("php://input"));

if (!empty($data->email) && !empty($data->password)) {

    try {

        $email = $data->email;
        $password = $data->password;

    $tables = [
        'manager' => 'username', 
        'coach' => 'email',
        'swimmer' => 'email'
    ];
    $found = false;

  foreach ($tables as $table => $field) {
        $query = "SELECT id, name, role FROM $table 
                  WHERE $field = :login 
                  AND password = :pass";

        $stmt = $conn->prepare($query);

        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':pass', $password);

        $stmt->execute();

          if ($stmt->rowCount() > 0) {

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "status" => "success",
                "message" =>"Login successful",
                "user" => $user
            ]);

            $found = true;
            break;

        }
    
    }

    if (!$found) {
        echo json_encode([
            "status" => "error", 
            "message" => "Invalid login data"
        ]);
    }

    } catch (PDOException $e) {

        echo json_encode([
            "status" => "error",
            "message" => $e->getMessage()
        ]);

    }

} else {
    
    echo json_encode([
        "status" => "error",
        "message" => "Incomplete data"
    ]);
}
?>
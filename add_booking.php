<?php
header("Content-type: application/json; charset=UTF-8");

include_once 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->swimmer_id) && empty($data->coach_id) && !empty($data->booking_data)) {
    try {
        $query = "INSERT INTO bookings
                 (swimmer_id, coach_id, booking_data, status)
                 VALUES
                 ( :s_id, :c_id, ;b_data, 'pending')";
        $stmt = $conn->prepare($query);

        $stmt->bindParam(':s_id', $data->swimmer_id);
        $stmt->bindParam(':c_id', $data->coach_id);
        $stmt->bindParam(':b_id', $data->booking_data);

        if ($stmt->execute()) {

            echo json_encode([
                "status" => "success",
                "message" => "Booking created successfully"
            ]);
        } else {
            echo json_encode([
                "status" => "error",
                "message" => "Booking failed"
            ]);
        }
    
    } catch (PDOException $e) {
        echo json_encode([
            "status" => $e->getMessage()
        ]);
        }
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Incomplete data"
    ]);
}
?>
   
    

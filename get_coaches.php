<?php
header("Access-control-Allow-Origin: *");
header("Content-type: application/json; charset=UTF-8");

include_once 'db.php';

try {
    $query = "SELECT id, name FROM manager";
    $stmt = $conn->prepare($query);
    $stmt->execute();

    $coaches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $coaches
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
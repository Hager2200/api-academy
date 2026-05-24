<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data   = json_decode(file_get_contents("php://input"));

$role = $data->role ?? $_GET['role'] ?? null;

try {

    // ===== GET: جلب الحجوزات =====
    if ($method === 'GET') {
        
        if ($role === 'manager' && !isset($_GET['swimmer_id']) && !isset($_GET['coach_id']) && !isset($_GET['booking_id'])) {
            $stmt = $conn->prepare(
                "SELECT b.id,
                        SUBSTRING_INDEX(b.booking_data, '|', 1) AS day,
                        SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                        b.status,
                        b.swimmer_id,
                        b.coach_id,
                        CONCAT(s.first_name, ' ', s.last_name) AS swimmer_name,
                        CONCAT(c.first_name, ' ', c.last_name) AS coach_name
                 FROM bookings b
                 JOIN swimmer s ON b.swimmer_id = s.id
                 JOIN coach c ON b.coach_id = c.id
                 ORDER BY b.id DESC"
            );
            $stmt->execute();
            
        } elseif (isset($_GET['swimmer_id'])) {
            $stmt = $conn->prepare(
                "SELECT b.id,
                        SUBSTRING_INDEX(b.booking_data, '|', 1) AS day,
                        SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                        b.status,
                        b.coach_id,
                        CONCAT(c.first_name, ' ', c.last_name) AS coach_name
                 FROM bookings b
                 JOIN coach c ON b.coach_id = c.id
                 WHERE b.swimmer_id = :swimmer_id
                 ORDER BY b.id DESC"
            );
            $stmt->execute([':swimmer_id' => (int) $_GET['swimmer_id']]);
            
        } elseif (isset($_GET['coach_id'])) {
            $stmt = $conn->prepare(
                "SELECT b.id,
                        SUBSTRING_INDEX(b.booking_data, '|', 1) AS day,
                        SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                        b.status,
                        b.swimmer_id,
                        CONCAT(s.first_name, ' ', s.last_name) AS swimmer_name,
                        s.age,
                        s.level
                 FROM bookings b
                 JOIN swimmer s ON b.swimmer_id = s.id
                 WHERE b.coach_id = :coach_id
                 ORDER BY b.id DESC"
            );
            $stmt->execute([':coach_id' => (int) $_GET['coach_id']]);
            
        } elseif (isset($_GET['booking_id'])) {
            $stmt = $conn->prepare(
                "SELECT b.id,
                        SUBSTRING_INDEX(b.booking_data, '|', 1) AS day,
                        SUBSTRING_INDEX(b.booking_data, '|', -1) AS time,
                        b.status,
                        b.swimmer_id,
                        b.coach_id,
                        CONCAT(s.first_name, ' ', s.last_name) AS swimmer_name,
                        CONCAT(c.first_name, ' ', c.last_name) AS coach_name
                 FROM bookings b
                 JOIN swimmer s ON b.swimmer_id = s.id
                 JOIN coach c ON b.coach_id = c.id
                 WHERE b.id = :id"
            );
            $stmt->execute([':id' => (int) $_GET['booking_id']]);
        } else {
            echo json_encode(["status" => "error", "message" => "Unauthorized or missing parameters"]);
            exit();
        }
        
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

    // ===== POST: إضافة حجز جديد (المدير والسباح فقط) =====
    } elseif ($method === 'POST') {
        
        // منع المدرب من إضافة حجز
        if ($role !== 'manager' && $role !== 'swimmer') {
            echo json_encode(["status" => "error", "message" => "Only manager and swimmer can create bookings"]);
            exit();
        }
        
        if (!empty($data->swimmer_id) && !empty($data->coach_id) && !empty($data->day) && !empty($data->time)) {
            
            $booking_data = $data->day . "|" . $data->time;
            
            $checkCoachAvail = $conn->prepare(
                "SELECT COUNT(*) FROM coach_availability 
                 WHERE coach_id = :coach_id AND working_day = :day AND working_time = :time"
            );
            $checkCoachAvail->execute([
                ':coach_id' => (int) $data->coach_id,
                ':day' => $data->day,
                ':time' => $data->time
            ]);
            
            if ($checkCoachAvail->fetchColumn() == 0) {
                echo json_encode(["status" => "error", "message" => "Coach is not available at this day and time"]);
                exit();
            }
            
            $checkStmt = $conn->prepare(
                "SELECT COUNT(*) FROM bookings 
                 WHERE swimmer_id = :s_id AND booking_data = :b_data"
            );
            $checkStmt->execute([
                ':s_id' => (int) $data->swimmer_id,
                ':b_data' => $booking_data
            ]);
            
            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode(["status" => "error", "message" => "Booking already exists for this time"]);
                exit();
            }
            
            $stmt = $conn->prepare(
                "INSERT INTO bookings (swimmer_id, coach_id, booking_data, status)
                 VALUES (:s_id, :c_id, :b_data, :status)"
            );
            $stmt->execute([
                ':s_id' => (int) $data->swimmer_id,
                ':c_id' => (int) $data->coach_id,
                ':b_data' => $booking_data,
                ':status' => $data->status ?? 'pending'
            ]);
            
            echo json_encode([
                "status" => "success",
                "message" => "Booking created successfully",
                "booking_id" => $conn->lastInsertId()
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "swimmer_id, coach_id, day, and time are required"]);
        }

    // ===== PUT: تعديل حجز =====
    } elseif ($method === 'PUT') {
        if (!empty($data->id)) {
            
            // المدرب: يقدر يعدل أي حاجة في حجوزات سباحينه
            if ($role === 'coach') {
                $getBooking = $conn->prepare("SELECT coach_id FROM bookings WHERE id = :id");
                $getBooking->execute([':id' => (int) $data->id]);
                $booking = $getBooking->fetch(PDO::FETCH_ASSOC);
                
                if ($booking['coach_id'] != ($data->logged_coach_id ?? 0)) {
                    echo json_encode(["status" => "error", "message" => "You can only update bookings for your swimmers"]);
                    exit();
                }
                
                $fields = [];
                $params = [':id' => (int) $data->id];
                
                if (isset($data->swimmer_id)) {
                    $fields[] = "swimmer_id = :s_id";
                    $params[':s_id'] = (int) $data->swimmer_id;
                }
                if (isset($data->day) && isset($data->time)) {
                    $fields[] = "booking_data = :b_data";
                    $params[':b_data'] = $data->day . "|" . $data->time;
                } elseif (isset($data->day)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $time = explode('|', $current['booking_data'])[1];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $data->day . "|" . $time;
                    }
                } elseif (isset($data->time)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $day = explode('|', $current['booking_data'])[0];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $day . "|" . $data->time;
                    }
                }
                if (isset($data->status)) {
                    $fields[] = "status = :status";
                    $params[':status'] = $data->status;
                }
                
                if (empty($fields)) {
                    echo json_encode(["status" => "error", "message" => "No fields to update"]);
                    exit();
                }
                
                $sql = "UPDATE bookings SET " . implode(", ", $fields) . " WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
                echo json_encode(["status" => "success", "message" => "Booking updated successfully"]);
                exit();
            }
            
            // السباح: يقدر يغير يوم ووقت حجزه بس
            if ($role === 'swimmer') {
                $fields = [];
                $params = [':id' => (int) $data->id];
                
                if (isset($data->day) && isset($data->time)) {
                    $fields[] = "booking_data = :b_data";
                    $params[':b_data'] = $data->day . "|" . $data->time;
                } elseif (isset($data->day)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $time = explode('|', $current['booking_data'])[1];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $data->day . "|" . $time;
                    }
                } elseif (isset($data->time)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $day = explode('|', $current['booking_data'])[0];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $day . "|" . $data->time;
                    }
                } else {
                    echo json_encode(["status" => "error", "message" => "Swimmer can only update day/time of their booking"]);
                    exit();
                }
                
                $sql = "UPDATE bookings SET " . implode(", ", $fields) . " WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
                echo json_encode(["status" => "success", "message" => "Booking updated successfully"]);
                exit();
            }
            
            // المدير: يقدر يغير أي حاجة
            if ($role === 'manager') {
                $fields = [];
                $params = [':id' => (int) $data->id];
                
                if (isset($data->swimmer_id)) {
                    $fields[] = "swimmer_id = :s_id";
                    $params[':s_id'] = (int) $data->swimmer_id;
                }
                if (isset($data->coach_id)) {
                    $fields[] = "coach_id = :c_id";
                    $params[':c_id'] = (int) $data->coach_id;
                }
                if (isset($data->day) && isset($data->time)) {
                    $fields[] = "booking_data = :b_data";
                    $params[':b_data'] = $data->day . "|" . $data->time;
                } elseif (isset($data->day)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $time = explode('|', $current['booking_data'])[1];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $data->day . "|" . $time;
                    }
                } elseif (isset($data->time)) {
                    $stmt = $conn->prepare("SELECT booking_data FROM bookings WHERE id = :id");
                    $stmt->execute([':id' => (int) $data->id]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($current) {
                        $day = explode('|', $current['booking_data'])[0];
                        $fields[] = "booking_data = :b_data";
                        $params[':b_data'] = $day . "|" . $data->time;
                    }
                }
                if (isset($data->status)) {
                    $fields[] = "status = :status";
                    $params[':status'] = $data->status;
                }
                
                if (empty($fields)) {
                    echo json_encode(["status" => "error", "message" => "No fields to update"]);
                    exit();
                }
                
                $sql = "UPDATE bookings SET " . implode(", ", $fields) . " WHERE id = :id";
                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
                
                echo json_encode(["status" => "success", "message" => "Booking updated successfully"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Unauthorized"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }

    // ===== DELETE: حذف حجز =====
    } elseif ($method === 'DELETE') {
        
        if ($role !== 'manager' && $role !== 'coach' && $role !== 'swimmer') {
            echo json_encode(["status" => "error", "message" => "Unauthorized"]);
            exit();
        }
        
        if (!empty($data->id)) {
            
            if ($role === 'coach') {
                $getBooking = $conn->prepare("SELECT coach_id FROM bookings WHERE id = :id");
                $getBooking->execute([':id' => (int) $data->id]);
                $booking = $getBooking->fetch(PDO::FETCH_ASSOC);
                
                if ($booking['coach_id'] != ($data->logged_coach_id ?? 0)) {
                    echo json_encode(["status" => "error", "message" => "You can only delete bookings for your swimmers"]);
                    exit();
                }
            }
            
            if ($role === 'swimmer' && isset($data->swimmer_id)) {
                $checkStmt = $conn->prepare("SELECT swimmer_id FROM bookings WHERE id = :id");
                $checkStmt->execute([':id' => (int) $data->id]);
                $booking = $checkStmt->fetch(PDO::FETCH_ASSOC);
                if ($booking['swimmer_id'] != $data->swimmer_id) {
                    echo json_encode(["status" => "error", "message" => "You can only delete your own bookings"]);
                    exit();
                }
            }
            
            $stmt = $conn->prepare("DELETE FROM bookings WHERE id = :id");
            $stmt->execute([':id' => (int) $data->id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(["status" => "success", "message" => "Booking deleted successfully"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Booking not found"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "id is required"]);
        }
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
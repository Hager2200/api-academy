<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");


echo json_encode([
    "status" => "success",
    "message" => "Welcome to Swim Academy API",
    "endpoints" => [
        "login" => "/login.php",
        "get_profile" => "/get_profile.php",
        "get_coaches" => "/get_coaches.php",
        "add_booking" => "/add_booking.php"
    ]
]);
?>
<?php
header("Access-Control-Allow-Origin: *");
header("content-type: application/json;charset=utf-8");

$host = "localhost";
$db_name = "swim_academy";
$username = "root";
$password = "";
$conn = null;

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8");
} catch(PDOException $exception) {
    echo "connection error: " . $exception->getMessage();
    
}
?>
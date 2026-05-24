<?php
// إعدادات الـ Headers للسماح بالوصول وتحديد نوع البيانات
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// الحصول على المسار الفعلي المطلوب وتنظيفه
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$endpoint = basename($request_uri);

// مصفوفة الدليل الإرشادي للـ API (رسالة الترحيب)
$api_documentation = [
    "status"  => "success",
    "message" => "Welcome to Swim Academy API",
    "roles" => [
        "manager" => "Full access to all data",
        "coach" => "Can update/delete bookings for their swimmers, view own schedule, cannot add bookings or view other coaches",
        "swimmer" => "Can add, update, delete own bookings, view own schedule only"
    ],
    "endpoints" => [
        "login" => [
            "url" => "/login.php",
            "method" => "POST",
            "roles" => ["manager", "coach", "swimmer"],
            "body" => ["email", "password"]
        ],
        "register" => [
            "url" => "/register.php",
            "method" => "POST",
            "roles" => ["manager", "coach", "swimmer"],
            "body" => ["role", "first_name", "last_name", "email", "password", "confirm_password"]
        ],
        "get_profile" => [
            "url" => "/get_profile.php",
            "method" => "POST",
            "roles" => ["manager", "coach", "swimmer"],
            "body" => ["user_id", "role"]
        ],
        "get_coaches" => [
            "url" => "/get_coaches.php?role=manager",
            "method" => "GET",
            "roles" => ["manager"]
        ],
        "get_coach_availability" => [
            "url" => "/get_coach_availability.php",
            "method" => "GET",
            "roles" => ["manager", "coach"]
        ],
        "get_days" => [
            "url" => "/get_days.php",
            "method" => "GET",
            "roles" => ["manager", "coach"]
        ],
        "get_times" => [
            "url" => "/get_times.php",
            "method" => "GET",
            "roles" => ["manager", "coach"]
        ],
        "coach_setup" => [
            "url" => "/coach_setup.php",
            "method" => "POST",
            "roles" => ["manager", "coach"],
            "body" => ["coach_id", "days (array)", "times (array)", "role", "logged_coach_id (for coach)"]
        ],
        "bookings_crud" => [
            "url" => "/bookings_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"]
        ],
        "schedule" => [
            "url" => "/schedule.php",
            "method" => "POST",
            "roles" => ["manager", "coach", "swimmer"],
            "body" => ["coach_id OR swimmer_id"]
        ],
        "classes_crud" => [
            "url" => "/classes_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"]
        ],
        "teams_crud" => [
            "url" => "/teams_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"]
        ]
    ]
];

// نظام التوجيه الذكي (Router Switch)
switch ($endpoint) {
    case 'login.php':
        if (file_exists('login.php')) { require 'login.php'; } 
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File login.php not found."]); }
        break;

    case 'register.php':
        if (file_exists('register.php')) { require 'register.php'; } 
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File register.php not found."]); }
        break;

    case 'get_profile.php':
        if (file_exists('get_profile.php')) { require 'get_profile.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'get_coaches.php':
        if (file_exists('get_coaches.php')) { require 'get_coaches.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'get_coach_availability.php':
        if (file_exists('get_coach_availability.php')) { require 'get_coach_availability.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'get_days.php':
        if (file_exists('get_days.php')) { require 'get_days.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'get_times.php':
        if (file_exists('get_times.php')) { require 'get_times.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'coach_setup.php':
        if (file_exists('coach_setup.php')) { require 'coach_setup.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'bookings_crud.php':
        if (file_exists('bookings_crud.php')) { require 'bookings_crud.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'schedule.php':
        if (file_exists('schedule.php')) { require 'schedule.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'classes_crud.php':
        if (file_exists('classes_crud.php')) { require 'classes_crud.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    case 'teams_crud.php':
        if (file_exists('teams_crud.php')) { require 'teams_crud.php'; }
        else { http_response_code(404); echo json_encode(["status" => "error", "message" => "File not found."]); }
        break;

    // حالة طلب المسار الرئيسي (يطبع الدليل)
    case 'index.php':
    case '':
        echo json_encode($api_documentation);
        break;

    // في حال طلب مسار غير موجود نهائياً
    default:
        http_response_code(404);
        echo json_encode([
            "status" => "error",
            "message" => "Endpoint not found. Please refer to the API documentation by visiting the root URL."
        ]);
        break;
}
?>
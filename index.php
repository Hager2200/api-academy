<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

echo json_encode([
    "status"  => "success",
    "message" => "Welcome to Swim Academy API",
    "roles" => [
        "manager" => "Full access to all data",
        "coach" => "Can update/delete bookings for their swimmers, view own schedule, cannot add bookings or view other coaches",
        "swimmer" => "Can add, update, delete own bookings, view own schedule only"
    ],
    "endpoints" => [
        "login" => [
            "url"    => "/login.php",
            "method" => "POST",
            "roles"  => ["manager", "coach", "swimmer"],
            "body"   => ["email", "password"]
        ],
        "register" => [
            "url"    => "/register.php",
            "method" => "POST",
            "roles"  => ["manager", "coach", "swimmer"],
            "body"   => ["role", "first_name", "last_name", "email", "password", "confirm_password"]
        ],
        "get_profile" => [
            "url"    => "/get_profile.php",
            "method" => "POST",
            "roles"  => ["manager", "coach", "swimmer"],
            "body"   => ["user_id", "role"]
        ],
        "get_coaches" => [
            "url"    => "/get_coaches.php?role=manager",
            "method" => "GET",
            "roles"  => ["manager"]
        ],
        "get_coach_availability" => [
            "url"    => "/get_coach_availability.php?coach_id=1&role=manager&logged_coach_id=1",
            "method" => "GET",
            "roles"  => ["manager", "coach"]
        ],
        "get_days" => [
            "url"    => "/get_days.php?role=manager",
            "method" => "GET",
            "roles"  => ["manager", "coach"]
        ],
        "get_times" => [
            "url"    => "/get_times.php?role=manager",
            "method" => "GET",
            "roles"  => ["manager", "coach"]
        ],
        "coach_setup" => [
            "url"    => "/coach_setup.php",
            "method" => "POST",
            "roles"  => ["manager", "coach"],
            "body"   => ["coach_id", "days (array)", "times (array)", "role", "logged_coach_id (for coach)"]
        ],
        "bookings_crud" => [
            "url"     => "/bookings_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"],
            "roles" => [
                "GET" => [
                    "manager" => "View all bookings",
                    "coach"   => "View bookings for their swimmers",
                    "swimmer" => "View own bookings"
                ],
                "POST"   => ["manager" => "Create new booking", "swimmer" => "Create own booking"],
                "PUT"    => ["manager" => "Full update", "coach" => "Update bookings for their swimmers", "swimmer" => "Update own booking day/time"],
                "DELETE" => ["manager" => "Delete booking", "coach" => "Delete bookings for their swimmers", "swimmer" => "Delete own booking"]
            ]
        ],
        "schedule" => [
            "url"    => "/schedule.php",
            "method" => "POST",
            "roles"  => ["manager", "coach", "swimmer"],
            "body"   => ["coach_id OR swimmer_id"]
        ],
        "classes_crud" => [
            "url"     => "/classes_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"],
            "roles"   => ["manager" => "All", "coach" => "None", "swimmer" => "None"]
        ],
        "teams_crud" => [
            "url"     => "/teams_crud.php",
            "methods" => ["GET", "POST", "PUT", "DELETE"],
            "roles"   => ["manager" => "All", "coach" => "None", "swimmer" => "None"]
        ]
    ]
]);
?>
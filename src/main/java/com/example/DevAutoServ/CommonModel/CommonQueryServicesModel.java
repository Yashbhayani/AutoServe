package com.example.DevAutoServ.CommonModel;

public class CommonQueryServicesModel {

    public String CheckDublicateMail= "SELECT CASE\n" +
            "    WHEN COUNT(*) > 1 THEN TRUE\n" +
            "    ELSE FALSE\n" +
            "END AS DublicateMail\n" +
            "FROM dev_autoserve.users\n" +
            "WHERE LOWER(email) = LOWER(?)";

    public  String InsertUser = "INSERT INTO dev_autoserve.users (\n" +
            "    username,\n" +
            "    email,\n" +
            "    first_name,\n" +
            "    last_name,\n" +
            "    phone,\n" +
            "    driving_license_number,\n" +
            "    password_hash,\n" +
            "    is_email_verified,\n" +
            "    is_phone_verified,\n" +
            "    is_active\n" +
            ")\n" +
            "VALUES (?,?,?,?,?,?,?,?,?,?);";

    public String InsertUserRole = "INSERT INTO dev_autoserve.user_roles (\n" +
            "    user_id,\n" +
            "    role_id\n" +
            ")\n" +
            "VALUES ( ?,?);";

   public String GetRole = """
    SELECT Id
    FROM dev_autoserve.roles
    WHERE Code = ?;
    """;

    public String LoginUser = """
    SELECT id, username, email, first_name, last_name,
           phone, password_hash, is_active
    FROM dev_autoserve.users
    WHERE LOWER(email) = LOWER(?)
    LIMIT 1
    """;

    public String EditUser = """
    UPDATE dev_autoserve.users
    SET first_name = ?,
        last_name = ?,
        phone = ?,
        driving_license_number = ?
    WHERE id = ?
    """;

    public String DeleteUserRoles = """
    DELETE FROM dev_autoserve.user_roles
    WHERE user_id = ?
    """;

    public String DeleteUser = """
    UPDATE dev_autoserve.users
    SET is_active = '0'
    WHERE id = ?
    """;

    public String InsertVehicle = """
    INSERT INTO dev_autoserve.vehicles
        (customer_id, make, model, year, vin, license_plate)
    VALUES (?, ?, ?, ?, ?, ?)
    """;

    public String EditVehicle = """
    UPDATE dev_autoserve.vehicles
    SET make = ?,
        model = ?,
        year = ?,
        vin = ?,
        license_plate = ?
    WHERE id = ?
      AND is_active = TRUE
    """;

    public String DeleteVehicle = """
    UPDATE dev_autoserve.vehicles
    SET is_active = FALSE
    WHERE id = ?
      AND is_active = TRUE
    """;

    public String GetAppointmentStatusId = """
    SELECT id
    FROM dev_autoserve.statuses
    WHERE table_code = 'APPOINTMENT'
      AND code = ?
      AND is_active = TRUE
    LIMIT 1
    """;

    public  String GetServiceTypeID = """
            SELECT 
                id
            FROM dev_autoserve.statuses
            WHERE code = ?
            """;

    public  String GetStatusID= """
            SELECT 
                id 
           FROM dev_autoserve.statuses 
           WHERE code= ?;
            """;


    public String InsertAppointment = """
    INSERT INTO dev_autoserve.appointments
        (service_request_id, scheduled_date, status_id)
    SELECT ?, ?, ?
    FROM dev_autoserve.statuses
    WHERE table_code = 'APPOINTMENT'
      AND code = 'SCHEDULED'
      AND is_active = TRUE
    LIMIT 1
    """;

    public String ConfirmAppointment = """
    UPDATE dev_autoserve.appointments
    SET status_id = (
        SELECT id
        FROM dev_autoserve.statuses
        WHERE table_code = 'APPOINTMENT'
          AND code = 'CONFIRMED'
          AND is_active = TRUE
        LIMIT 1
    )
    WHERE id = ?
      AND is_active = TRUE
      AND status_id IN (
          SELECT id
          FROM dev_autoserve.statuses
          WHERE table_code = 'APPOINTMENT'
            AND code IN ('SCHEDULED', 'RESCHEDULED')
            AND is_active = TRUE
      )
    """;

    public String RescheduleAppointment = """
    UPDATE dev_autoserve.appointments
    SET scheduled_date = ?,
        status_id = (
            SELECT id
            FROM dev_autoserve.statuses
            WHERE table_code = 'APPOINTMENT'
              AND code = 'RESCHEDULED'
              AND is_active = TRUE
            LIMIT 1
        )
    WHERE id = ?
      AND is_active = TRUE
      AND status_id IN (
          SELECT id
          FROM dev_autoserve.statuses
          WHERE table_code = 'APPOINTMENT'
            AND code IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
            AND is_active = TRUE
      )
    """;

    public String CancelAppointment = """
    UPDATE dev_autoserve.appointments
    SET status_id = (
        SELECT id
        FROM dev_autoserve.statuses
        WHERE table_code = 'APPOINTMENT'
          AND code = 'CANCELLED'
          AND is_active = TRUE
        LIMIT 1
    )
    WHERE id = ?
      AND is_active = TRUE
      AND status_id IN (
          SELECT id
          FROM dev_autoserve.statuses
          WHERE table_code = 'APPOINTMENT'
            AND code IN ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED')
            AND is_active = TRUE
      )
    """;

    public String CompleteAppointment = """
    UPDATE dev_autoserve.appointments
    SET status_id = (
        SELECT id
        FROM dev_autoserve.statuses
        WHERE table_code = 'APPOINTMENT'
          AND code = 'COMPLETED'
          AND is_active = TRUE
        LIMIT 1
    )
    WHERE id = ?
      AND is_active = TRUE
      AND status_id = (
          SELECT id
          FROM dev_autoserve.statuses
          WHERE table_code = 'APPOINTMENT'
            AND code = 'CONFIRMED'
            AND is_active = TRUE
          LIMIT 1
      )
    """;

    public String ServiceRequests= """
            Insert INTO dev_autoserve.service_requests
            	(customer_id, vehicle_id, description, preferred_date)
            VALUES ( ?, ?, ?, ?)
            """;
}

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


    // USER
    public final String GetUserId = """
        SELECT id
        FROM dev_autoserve.users
        WHERE username = ?
          AND is_active = 1
        LIMIT 1
        """;

   public String GetUserRole = """
         SELECT
              r.name AS UserRole
         FROM dev_autoserve.users AS u
         INNER JOIN dev_autoserve.user_roles AS ur
             ON ur.user_id = u.id
         INNER JOIN dev_autoserve.roles AS r
             ON r.id = ur.role_id
         WHERE u.username = ?;
         """;


    public String CheckRolePermission = """
    SELECT EXISTS (
        SELECT 1
        FROM dev_autoserve.permissions AS p
        INNER JOIN dev_autoserve.role_permissions AS rp
            ON rp.permission_id = p.id
        INNER JOIN dev_autoserve.roles AS r
            ON r.id = rp.role_id
        WHERE p.code = ?
          AND r.code = ?
          AND p.is_active = 1
          AND r.is_active = 1
    )
    """;
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
        (customer_id, make, color, model, year, vin, mileage, license_plate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """;

    public String EditVehicle = """
    UPDATE dev_autoserve.vehicles
    SET make = ?,
        color = ?,
        model = ?,
        year = ?,
        vin = ?,
        mileage = ?,
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



    public final String GetStatusCode = """
        SELECT code
        FROM dev_autoserve.statuses
        WHERE id = ?
          AND is_active = 1
        LIMIT 1
        """;


/*
    public  String GetServiceTypeID = """
            SELECT 
                id
            FROM dev_autoserve.statuses
            WHERE code = ?
            """;
*/

/*
    public  String GetStatusID= """
            SELECT
                id
           FROM dev_autoserve.statuses
           WHERE code= ?;
            """;
*/


    // AUTOMATICALLY CREATE APPOINTMENT
    public final String InsertAppointment = """
        INSERT INTO dev_autoserve.appointments
        (
            service_request_id,
            technician_id,
            scheduled_date,
            status_id,
            is_active,
            is_appointed
        )
        VALUES (?, NULL, NULL, ?, 1, 0)
        """;

    // GET SERVICE REQUEST
    public final String GetServiceRequest = """
        SELECT
            sr.id,
            sr.customer_id,
            sr.vehicle_id,
            sr.description,
            sr.preferred_date,
            sr.status_id,
            s.code AS status_code
        FROM dev_autoserve.service_requests sr
        INNER JOIN dev_autoserve.statuses s
            ON s.id = sr.status_id
        WHERE sr.id = ?
          AND sr.is_active = 1
        FOR UPDATE
        """;

    // CHECK SERVICE REQUEST OWNERSHIP
    public final String IsServiceRequestOwned = """
        SELECT COUNT(*)
        FROM dev_autoserve.service_requests
        WHERE id = ? AND is_active = 1
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


    public  String InsertRefreshtokens = """
            INSERT INTO dev_autoserve.refresh_tokens (
                user_id,
                token_hash,
                expires_at
            )
            VALUES (?, ?, ?)""";

    public String ValidateAnActive= """
            SELECT id, user_id, expires_at
            FROM dev_autoserve.refresh_tokens
            WHERE token_hash = ?
              AND is_active = TRUE
              AND expires_at > CURRENT_TIMESTAMP(3);
            """;


    public String DeactivateToken= """
            UPDATE dev_autoserve.refresh_tokens
            SET is_active = FALSE
            WHERE token_hash = ?;""";


    public String DeactivateUserRefreshTokens= """
            SELECT id, user_id, is_active, expires_at, created_at, updated_at
            FROM dev_autoserve.refresh_tokens
            WHERE user_id = ?
            ORDER BY created_at DESC;
            """;

    // VEHICLE OWNERSHIP
    public final String IsVehicleOwned = """
        SELECT COUNT(*)
        FROM dev_autoserve.vehicles
        WHERE id = ?
          AND customer_id = ?
          AND is_active = 1
        """;

    // ACTIVE SERVICE TYPES
    public final String IsServiceTypeActive = """
        SELECT COUNT(*)
        FROM dev_autoserve.service_types
        WHERE id = ?
          AND is_active = 1
        """;

    public  String AreServiceTypesActive = """
                SELECT COUNT(*) FROM dev_autoserve.service_types
                WHERE is_active = 1 AND id IN ( ? );""";

    // STATUS
    public final String GetStatusId = """
        SELECT id
        FROM dev_autoserve.statuses
        WHERE table_code = ?
          AND code = ?
          AND is_active = 1
        LIMIT 1
        """;

    // CREATE SERVICE REQUEST
    public final String InsertServiceRequest = """
        INSERT INTO dev_autoserve.service_requests
        (
            customer_id,
            vehicle_id,
            description,
            photo_urls,
            preferred_date,
            status_id,
            is_active,
            preferred_date
        )
        VALUES (?, ?, ?, NULL, ?, ?, 1, ?)
        """;


    // CREATE SERVICE REQUEST SERVICES
    public final String InsertSelectedServicesTypes = """
        INSERT INTO dev_autoserve.service_request_services
        (
            service_request_id,
            service_type_id,
            is_active
        )
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE is_active = 1
        """;





    // UPDATE SERVICE REQUEST
    public final String UpdateServiceRequests = """
        UPDATE dev_autoserve.service_requests
        SET
            vehicle_id = ?,
            description = ?,
            preferred_date = ?
            preferred_date 
        WHERE id = ?
          AND customer_id = ?
          AND is_active = 1
        """;

    // DEACTIVATE OLD SERVICE TYPES
    public final String DeactivateOldTypes = """
        UPDATE dev_autoserve.service_request_services
        SET is_active = 0
        WHERE service_request_id = ?
        """;

    // SOFT DELETE SERVICE REQUEST
    public final String DeleteServiceRequests = """
        UPDATE dev_autoserve.service_requests
        SET is_active = 0
        WHERE id = ?
          AND is_active = 1
        """;

    // SOFT DELETE SERVICE REQUEST SERVICES
    public final String DeleteServiceRequestServices = """
        UPDATE dev_autoserve.service_request_services
        SET is_active = 0
        WHERE service_request_id = ?
        """;

    // GET APPOINTMENT FOR SERVICE REQUEST
    public final String GetAppointmentByServiceRequest = """
        SELECT
            a.id,
            a.service_request_id,
            a.technician_id,
            a.scheduled_date,
            a.status_id,
            s.code AS status_code,
            a.is_appointed
        FROM dev_autoserve.appointments a
        INNER JOIN dev_autoserve.statuses s
            ON s.id = a.status_id
        WHERE a.service_request_id = ?
          AND a.is_active = 1
        FOR UPDATE
        """;


  public String deleteServicesQuery = """
            UPDATE dev_autoserve.service_request_services
            SET is_active = 0
            WHERE service_request_id = ?
            """;

    public String IsServiceRequestValid = """
            SELECT COUNT(*)
            FROM dev_autoserve.service_requests
            WHERE id = ?
              AND customer_id = ?
              AND is_active = 1
            """;


    public  String ServiceRequestsStatusQuery = """
                    SELECT s.code
                    FROM dev_autoserve.service_requests sr
                    INNER JOIN dev_autoserve.statuses s
                        ON s.id = sr.status_id
                    WHERE sr.id = ?
                      AND sr.is_active = 1
                      AND s.table_code = 'SERVICE_REQUEST'
                      AND s.is_active = 1
                    FOR UPDATE;
                    """;

    public String ServiceRequestsUpdateQuery = """
                    UPDATE dev_autoserve.service_requests
                    SET status_id = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND is_active = 1;
                    """;


    public String AppointmentsStatusQuery = """
                    SELECT s.code
                    FROM dev_autoserve.appointments a
                    INNER JOIN dev_autoserve.statuses s
                        ON s.id = a.status_id
                    WHERE a.id = ?
                      AND a.is_active = 1
                      AND s.table_code = 'APPOINTMENT'
                      AND s.is_active = 1
                    FOR UPDATE;
                    """;


    // UPDATE APPOINTMENT STATUS
    public final String UpdateAppointmentStatus = """
        UPDATE dev_autoserve.appointments
        SET
            status_id = ?,
            is_appointed = CASE
                WHEN ? = 'CANCELLED' THEN 0
                ELSE is_appointed
            END
        WHERE id = ?
          AND is_active = 1
        """;

    // CANCEL APPOINTMENT WHEN REQUEST IS REJECTED/CANCELLED
    public final String CancelLinkedAppointment = """
        UPDATE dev_autoserve.appointments
        SET
            status_id = ?,
            is_appointed = 0
        WHERE service_request_id = ?
          AND is_active = 1
        """;

    // ADMIN ASSIGNS TECHNICIAN AND ACTUAL DATE/TIME
    public final String AssignTechnicianAndSchedule = """
        UPDATE dev_autoserve.appointments
        SET
            technician_id = ?,
            scheduled_date = ?,
            is_appointed = 1,
            status_id = ?
        WHERE id = ?
          AND is_active = 1
        """;

    // CHECK TECHNICIAN ROLE
    public final String IsTechnicianValid = """
        SELECT COUNT(*)
        FROM dev_autoserve.users u
        INNER JOIN dev_autoserve.user_roles ur
            ON ur.user_id = u.id
        INNER JOIN dev_autoserve.roles r
            ON r.id = ur.role_id
        WHERE u.id = ?
          AND u.is_active = 1
          AND r.code = 'TECHNICIAN'
        """;


    public String GetInitialStatusId = """
        SELECT id
        FROM dev_autoserve.statuses
        WHERE table_code = ?
          AND is_initial = 1
          AND is_active = 1
        LIMIT 1;
        """;

/*    public  final  String UpdateServiceRequestStatus = """
                    UPDATE dev_autoserve.service_requests
                    SET status_id = ?
                    WHERE id = ?
                      AND is_active = 1
                    """;*/

    public String GetServiceRequestForStatusUpdate = """
    SELECT
        sr.id,
        sr.customer_id,
        s.code AS status_code
    FROM dev_autoserve.service_requests sr
    INNER JOIN dev_autoserve.statuses s
        ON s.id = sr.status_id
    WHERE sr.id = ?
      AND sr.is_active = 1
    FOR UPDATE
    """;


    public String GetAppointmentForServiceRequest = """
    SELECT
        a.id,
        a.service_request_id,
        a.technician_id,
        s.code AS status_code
    FROM dev_autoserve.appointments a
    INNER JOIN dev_autoserve.statuses s
        ON s.id = a.status_id
    WHERE a.service_request_id = ?
      AND a.is_active = 1
    LIMIT 1
    FOR UPDATE
    """;


    public String IsAssignedTechnician = """
    SELECT COUNT(*)
    FROM dev_autoserve.appointments
    WHERE service_request_id = ?
      AND technician_id = ?
      AND is_active = 1
    """;


    public String UpdateServiceRequestStatus = """
    UPDATE dev_autoserve.service_requests
    SET status_id = ?
    WHERE id = ?
      AND is_active = 1
    """;

    public String GetAppointmentForStatusUpdate = """
    SELECT
        a.id,
        a.service_request_id,
        a.technician_id,
        sr.customer_id,
        aps.code AS status_code,
        srs.code AS request_status
    FROM dev_autoserve.appointments a
    INNER JOIN dev_autoserve.service_requests sr
        ON sr.id = a.service_request_id
    INNER JOIN dev_autoserve.statuses aps
        ON aps.id = a.status_id
    INNER JOIN dev_autoserve.statuses srs
        ON srs.id = sr.status_id
    WHERE a.id = ?
      AND a.is_active = 1
      AND sr.is_active = 1
    FOR UPDATE
    """;

}

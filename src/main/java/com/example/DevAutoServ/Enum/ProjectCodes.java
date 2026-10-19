package com.example.DevAutoServ.Enum;

public class ProjectCodes {

    public enum RoleEnum {
        CUSTOMER,
        TECHNICIAN,
        ADMIN
    }

    public enum TableCode {
        APPOINTMENT,
        ServiceTypeEnum,
        StatusTableEnum
    }

    public enum AppointmentStatus {
        SCHEDULED,
        CONFIRMED,
        RESCHEDULED,
        CANCELLED,
        COMPLETED
    }

    public enum ServiceTypeEnum {
        OIL_CHANGE,
        BRAKE_REPAIR,
        TIRE_SERVICE,
        ENGINE_DIAGNOSTIC,
        BATTERY_REPLACEMENT,
        AC_SERVICE,
        GENERAL_INSPECTION
    }

    public enum StatusTableEnum {
        SERVICE_REQUEST,
        APPOINTMENT,
        CHECK_IN,
        WORK_ORDER,
        RECOMMENDED_REPAIR,
        INVOICE,
        PAYMENT
    }

    public enum PaymentMethodEnum {
        CARD,
        BANK_TRANSFER,
        WALLET,
        OTHER
    }


    public enum NotificationTypeEnum {
        SERVICE_REQUEST,
        APPOINTMENT,
        APPROVAL,
        BILLING,
        SYSTEM
    }


}

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

        public enum PermissionEnum {

            PROFILE_VIEW,
            PROFILE_UPDATE,
            PROFILE_DELETE,

            USER_VIEW_ALL,
            USER_CREATE,
            USER_UPDATE_ALL,
            USER_DELETE,

            VEHICLE_VIEW_OWN,
            VEHICLE_CREATE,
            VEHICLE_UPDATE_OWN,
            VEHICLE_DELETE_OWN,

            APPOINTMENT_VIEW_OWN,
            APPOINTMENT_CREATE,
            APPOINTMENT_UPDATE_OWN,
            APPOINTMENT_DELETE_OWN,
            APPOINTMENT_MANAGE_ALL,

            JOB_VIEW_ASSIGNED,
            JOB_UPDATE_ASSIGNED,

            REPORT_VIEW,
            SERVICE_MANAGE,

            // SERVICE REQUEST PERMISSIONS
            SERVICE_REQUEST_CREATE,
            SERVICE_REQUEST_UPDATE,
            SERVICE_REQUEST_DELETE,
            SERVICE_REQUEST_REVIEW,
            SERVICE_REQUEST_APPROVE,
            SERVICE_REQUEST_REJECT,

            // APPOINTMENT MANAGEMENT PERMISSIONS
            APPOINTMENT_ASSIGN_TECHNICIAN,
            APPOINTMENT_RESCHEDULE,
            APPOINTMENT_CANCEL,
            APPOINTMENT_COMPLETE
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

        public enum SERVICEREQUEST {
            SUBMITTED,
            UNDER_REVIEW,
            APPROVED,
            REJECTED,
            IN_PROGRESS,
            COMPLETED,
            CANCELLED
        }


        public  enum  WORKORDER{
            IN_PROGRESS,
            COMPLETED
        }
    }

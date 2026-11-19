# Approved backend fixes — applied and verified

The user approved the prepared patch, which was applied only to `Services/UserServices.java` and `Services/PartsServices.java`.

- User, user-role and part inserts request only the generated `id` column.
- Registration is transactional. Its exception handler marks the transaction for rollback so a failed role insert cannot leave a partial account.
- Registration no longer prints password hashes or returns internal database exception details.

No schema, credential, stored-procedure or other backend-source changes were made. The original applied diff is [backend-fixes.patch](backend-fixes.patch), and approval is recorded in [approval.json](approval.json).

Verification: all 32 existing backend tests, 50 frontend tests, type checking and the frontend build passed. All 159 isolated HTTP/database checks passed, including real registration and explicit subsequent login, catalogue creation, duplicate signup rejection, and a forced role-insert failure with SQL proof of rollback.

The failure was injected only by a trigger in the external H2 test launcher. The trigger is not part of the backend source or production schema. The database evidence records one injected failure and zero remaining accounts or roles for that attempt.

Earlier failed results were archived under `TEST/runs/before-approved-backend-fix-*`. Browser checks remain Not Run, and live MySQL was not mutated or certified.

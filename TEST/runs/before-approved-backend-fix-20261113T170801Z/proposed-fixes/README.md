# Proposed backend fixes — NOT APPLIED

User approval is required before applying this patch to Backend.

- Request only the `id` generated column for user, user-role and part inserts; this addresses the reproduced H2 multi-key failures without changing MySQL business fields.
- Make registration transactional and mark its transaction for rollback on an exception, so a failed user/role insert cannot leave a partial account.
- Remove password-hash console output and return a generic registration error rather than internal database details.

Affected source: `Services/UserServices.java` and `Services/PartsServices.java`. No schema, credentials or stored-procedure changes. The patch is reviewable but has not been applied or tested as an application fix. Existing failures must remain failed until application and regression verification.

Dashboard source changes are not proposed: the active frontend already uses the existing scoped operations snapshot. The legacy `/api/dashboard` route is not required by that active view.

Validation: `git apply --check` succeeded against the current Backend source. This is a context check only, not compilation or behavioral verification of the proposed fixes.

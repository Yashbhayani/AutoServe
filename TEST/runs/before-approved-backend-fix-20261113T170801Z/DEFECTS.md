# Findings from the executed tests

Frontend/test-contract corrections were made. Backend files remain unchanged; proposed backend fixes require the user's approval. See [proposed patch](proposed-fixes/backend-fixes.patch).

## F-01 — Obsolete dashboard test contract, corrected

The legacy `/api/dashboard` route returns 404, but the active dashboard already reads `/api/operations/snapshot` and computes its metrics from scoped records. The earlier report incorrectly treated the old unused route as a requirement of the active view. That conclusion is withdrawn.

The unused `shop.dashboard` frontend method was removed. The HTTP tests now exercise the actual snapshot contract for all three roles and verify role-scoped request records. Original responses remain in `evidence/before-dashboard-contract-correction/`; they are not relabeled as passing. Browser dashboard navigation remains Not Run.

## F-02 — Catalogue creation fails under the H2 test provider

`POST /api/parts/create` with a valid part returned **503**. A separate transaction-wrapped call to the unchanged `PartsServices.createPart` reproduced `InvalidDataAccessApiUsageException`: `GeneratedKeyHolder.getKey()` received multiple generated columns (`id`, `created_at`, `updated_at`) from H2 2.3.232.

Evidence: `PART-02` and [provider-compatibility.json](evidence/provider-compatibility.json). This is **an isolated-provider failure, not proof that live MySQL creation fails**. Confirmation requires a disposable MySQL database. A clearly identified part fixture was seeded afterward to execute downstream workflows; that does not make catalogue creation pass.

## F-03 — Registration fails under the H2 test provider

The current frontend uses `POST /api/user/add` with its mapped user-model fields. A valid registration returned HTTP 200 with `success:false` and the multiple-generated-keys error. The response exposes internal generated-key details.

Evidence: `AUTH-09-REG` in [http-cases.json](evidence/http-cases.json). The test followed the current frontend contract; it did not incorrectly call the older `/user/register` path. **MySQL behavior was not tested.** Frontend mocked registration tests pass, which does not override this integration failure.

## F-04 — Failed registration leaves a partial account in the isolated database

After F-03 reported failure, the admin user-list API returned the newly inserted account with an empty roles array. The failed operation left a saved partial account. This rollback behavior is reproduced with the H2-generated-key exception as the trigger; production frequency is unknown.

Evidence: `DB-REG-ROLLBACK`, showing the saved `register@test.invalid` account and `roles:[]`, in [http-cases.json](evidence/http-cases.json). All affected records are fictional isolated-database records.

## Other observations and unverified areas

- No application setup README was found at the project root or in Frontend/Backend. INT-01 could not be executed *using the README*; isolated startup did succeed.
- During the isolated database outage, a protected save returned **401**, because authentication also needs the database. It did not falsely report a successful save. INT-07 passes only the no-false-save check; a user-facing availability diagnosis was not confirmed.
- No connected browser was available. Browser navigation, form cancellation, keyboard operation, responsive layout, actual download-dialog interaction and cross-browser compatibility remain Not Run. Static HTML and component assertions are not screenshots.
- No performance target or load profile was supplied. Per-request times are observations, not evidence that a performance requirement is met.
- Permission tests covered the listed role and ownership cases. This is not a general security review or certification.

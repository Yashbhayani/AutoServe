# Interactive browser testing: Brave connected, control blocked

Checked UTC: 2026-11-13T17:41:07.032959+00:00

Brave now registers successfully. Session naming and tab creation work. Navigation, page inspection through both documented APIs and screenshots fail with `Cannot read properties of undefined (reading 'timeoutMs')`, matching the earlier Chrome control failure.

**Status: Not Run.** No application UI action or screenshot completed. Browser setup has progressed; repeating basic extension setup has not resolved the page-control error. No test environment or shared application server was started or stopped in this attempt. Backend files and live records were unchanged.

The next recovery step is a fresh Work/Codex chat in the ChatGPT desktop app with **Brave** selected using the `@` menu. Ask that chat to continue from [BROWSER-HANDOFF.md](BROWSER-HANDOFF.md). Official troubleshooting recommends a new chat to clear chat-specific connection state: [browser extension troubleshooting](https://learn.chatgpt.com/docs/chrome-extension#troubleshooting). If the same error persists, submit `/feedback` and include [brave-control-failure.json](evidence/browser/brave-control-failure.json).

Existing automated results remain unchanged. Browser cases are not relabeled as passed.

# Browser connection repair steps

Chrome is running, but the supported connection diagnostic reports a missing native helper. The extension-install diagnostic is blocked by macOS file access. Browser automation remains Not Run.

1. Use the **ChatGPT desktop app** for browser testing. Browser control is not supported in the Codex VS Code extension. Opening VS Code's embedded browser does not connect it to this chat.
2. Update the desktop app. Reinstall the Browser plugin through its plugin UI to restore the missing native helper; do not manually create the helper manifest.
3. In the desktop app open **Settings → Computer Use → Chrome**, expanding **More browsers** if necessary. Complete the plugin/extension setup. Chrome should show **Manage**, rather than **Install**; enable its toggle.
4. In the same Chrome profile, open `chrome://extensions` and confirm the ChatGPT extension is enabled. Open its toolbar panel and confirm the side chat loads.
5. Restart Chrome and the ChatGPT desktop app after setup. Start a Work/Codex chat and select **Chrome** from the `@` menu. Ask it to continue the AutoServe interactive tests, using isolated test data and saving evidence under `TEST`.

If setup still fails, report whether Chrome shows **Install** or **Manage** and whether the chat is in the desktop app or VS Code. Do not change AutoServe's backend, database credentials or application settings to repair this browser connection.

Official instructions: [Browser extension setup and troubleshooting](https://learn.chatgpt.com/docs/chrome-extension); [supported browser surfaces](https://learn.chatgpt.com/docs/browser).

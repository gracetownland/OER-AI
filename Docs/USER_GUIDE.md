# User Guide for OpenED AI Assistant

Welcome! This guide helps you get up and running with the OpenED AI Assistant web application. The content below reflects behavior in the running frontend and typical user flows: browsing textbooks, using the chat assistant, generating practice materials, and using the audio & accessibility features.

## Table of Contents
- [Regular User](#regular-user)
- [Admin](#admin)

---

## Regular User

### Quick Start

1. Open the app in your browser (hosted via AWS Amplify or locally during development).
2. From the home page, browse or search the textbook catalog.
3. Click a textbook card to open the textbook dashboard: Chat, FAQ, Practice and (for instructors) Material Editor.
4. If you want to start a new conversation, open the Sidebar and click the **+** (New chat) button.

---

## App Layout & Navigation

- Header: Global navigation and brand.
- Sidebar (left): Study companion tools, session list, and audio settings. On small screens, the sidebar becomes a slide-out drawer.
- Main content: Chat UI, Practice Material page, Material Editor, or Admin pages depending on your navigation.

Key sidebar items:
- "New chat" (plus icon) — creates a new chat session for the current textbook.
- Chat sessions list — switch between session histories in the current textbook.
- Audio settings — open audio controls to configure narration and playback options.
- Links for FAQ, Practice and for instructors: Material Editor.

---

## Chat Interface (Textbook Study Companion)

The Chat feature is the core study tool. It's aware of the currently selected textbook and allows you to ask questions and follow up on answers.

Starting & using the chat:
- Create a new chat from the sidebar using the **+** button, or select an existing chat session.
- Type your message in the input area. Press Enter to send; use Shift+Enter to add a new line.
- The assistant's responses stream in and may include source chunks (they appear under the reply if available).
- Chat sessions are persisted for your local user session for up to 30 days (session stored in localStorage) but are effectively temporary — do not rely on them for long-term storage unless explicitly persisted.

Messages & interactions:
- Guided prompts: Some templates include guided prompts that present a sequence of questions – respond to each to guide the assistant.
- Prompt Library / Templates: Click the prompt library to use pre-built or shared prompts and templates.
- Share conversation: Use the Share button (share icon) to create a public URL that others can use to view the conversation. A privacy notice will appear before sharing (you can dismiss it permanently in localStorage).
- Fork a shared chat: If you open a `?share=<sessionId>` URL, the app will offer to fork that chat into a new session in your account.

Share URL format:
`https://<app-domain>/textbook/<TEXTBOOK_ID>/chat?share=<SESSION_ID>`

Best practices:
- Be specific with questions (include chapter or paragraph if possible).
- When asking about code, math, or problem steps, include the relevant context (an excerpt or page/section reference).
- Avoid sharing sensitive personal information — shared chats are public.

---

## Audio & Accessibility (Sidebar Audio Settings)

Open the audio popover in the sidebar to control narration and audio playback:
- Narration (toggle): Turn speech on or off.
- Autoplay: Automatically play responses when they arrive.
- Mode: Choose `Both`, `AI only`, or `User only` for which messages are read aloud.
- Voice: Select from available voices (or keep `Default`).
- Rate / Pitch / Volume: Fine-tune audio playback ranges.
- Play sample: Play a short sample of the selected voice.

Notes:
- Audio settings are persisted in your session context (and may persist across sessions via localStorage depending on the application setup).

---

## Practice Material

Use the Practice Material page to generate and run practice items derived from selected textbook material.

- Navigate to `Practice Material` in the sidebar.
- Use the generator form to choose the material type (MCQ, Flashcards, or Short Answer), difficulty, and the number of items.
- Wait for the generation to complete; generated items are displayed on the page and can be discarded or exported.
- Generated materials are temporary for the session. You can export items for offline use.

Form constraints and hints:
- MCQ: number of questions up to 8, options per question up to 8.
- Flashcards: up to 20 cards.
- Short Answer: up to 10 questions.

Export Options & Tools:
- Export to H5P (Material Editor) or PDF to print/prepare slides.

Export details:
- H5P export uses a backend API to package the H5P file and will prompt a .zip download in your browser.
- The Material Editor supports editing the generated set and exporting MCQ, Essay and Flashcard question sets to H5P.

---

## Material Editor (Instructors / Advanced Users)

The Material Editor provides H5P-compatible editing for generated materials:
- Convert generated MCQs, Short Answer, and Flashcards to H5P formats.
- Edit questions and options in the browser.
- Export the final H5P package or PDF for LMS import.

Note: H5P export triggers the backend API to generate a .zip file. If export fails, a browser alert will show an error; try again or contact the admin.

When you switch to Instructor mode (via the app's Mode control), the sidebar will include a `Material Editor` link.

How to switch mode:
- Click the mode selector in the top header (near the app logo) and choose `Instructor` or `Student`. Switching may be persisted server-side.

---

## FAQ (Frequently Asked Questions)

- FAQs are stored per textbook and surface the most frequently asked questions.
- Click a FAQ entry to pre-fill the chat with that question (and its answer); clicking will also increment the FAQ's usage count.
- This helps build a community-curated FAQ over time.

---

## Sessions, Persistence, & Privacy

- User sessions are created automatically (a public token is used to bootstrap a session).
- Sessions are stored in localStorage for about 30 days, but they are not a robust long-term data store.
- When you share a chat, it is publicly accessible and cannot be removed; do not include sensitive personal data in chats that you share.

---

## Admin

### Admin  Dashboard

The Admin area is accessible at `/admin/login` and requires separate authentication (Cognito). Admin users and other instructor users have access to:
- Textbook management: Upload or manage textbooks and content metadata.
- FAQs & Prompts: Manage frequently asked questions and prompt templates.
- Analytics: See aggregate usage and trends (if enabled in your deployment).
- AI Settings: Configure models or other AI-specific settings in an administrative role (depends on deployment & permissions).

Admin login: Navigate to `/admin/login` to sign in as an admin (this uses the Cognito-backed admin login flow). For security reasons admin credentials are not created automatically in most deployments — see the Admin / deployment documentation for details.

---

## Troubleshooting & Common Issues

- WebSocket or connection issues: Refresh the page or click the refresh button in the UI; check the browser console for the WebSocket URL and status.
- H5P export or PDF export fails: Verify your API has a healthy `/textbooks/{id}/practice_materials/export-h5p` endpoint and that public token calls (POST `/user/publicToken`) succeed.
- If a material or generation request fails, verify the textbook is selected and that your VITE_API_ENDPOINT points to the running API.
- API errors: If you see API errors, ensure the environment variables (VITE_API_ENDPOINT, VITE_AWS_REGION) are correctly configured for your deployment.
- Missing textbooks: Make sure the backend deployed (CDK) created and seeded textbooks, or double check API endpoints.
- Audio not working: Confirm the browser supports the selected voice and that Narration is enabled.
- Session expired: If your session has expired, refresh the page to create a new session.

---

## Tips & Best Practices

- Use the Prompt Library and Guided Prompts if you want consistent, repeatable queries.
- Use the `View Original Textbook` link (in the sidebar) to quickly get the textbook source and provide better context when asking questions.
- Use `Shift+Enter` to create new lines inside the message input without sending.
- Use the `Share` button responsibly and follow the app's User Guidelines.

---

## Links & Resources

- Deployment Guide: `Docs/DEPLOYMENT_GUIDE.md`
- User Guidelines: `UserGuidelines` page (View `frontend/src/pages/UserGuidelines.tsx`)
- For Admins: Visit `/admin` and review the Admin login and admin dashboard.

---


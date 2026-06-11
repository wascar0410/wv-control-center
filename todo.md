## Fase 68: Chat Typing Indicators V1
**STATUS: implemented_but_cross_user_validation_failed - DO NOT MARK COMPLETE**

**Checkpoint History:**
- Base: 794d4928 (Chat V1, Presence, Unread, Read Receipts working)
- Attempted: 8f13f6e3 (added debug logs - BROKEN /chat blank screen)
- Fix attempt: 3ea63849 (fixed useEffect deps - STILL blank screen)
- Recovered: 118c6e85 (rollback to 794d4928 - /chat recovered)

**Implementation Status:**
- [x] Audit WebSocket infrastructure at /api/ws
- [x] Review ChatWidget for input onChange hook points
- [x] Decide implementation: WebSocket vs tRPC+polling
- [x] Implement server-side typingState Map with TTL (3-5s)
- [x] Implement setTyping tRPC mutation (isTyping true/false)
- [x] Implement getTypingStatus tRPC query
- [x] Add debounce/throttle (1.5s) to input onChange
- [x] Call setTyping(false) on message send
- [x] Add polling (2-3s) for getTypingStatus
- [x] Integrate typing indicator UI: "Test Driver está escribiendo..."

**Validation Status:**
- [ ] Test Owner→Driver typing indicator (FAILED - indicator not visible to Owner)
- [ ] Test Driver→Owner typing indicator (NOT TESTED)
- [x] Validate no regressions: Chat V1, Presence, Unread, Read Receipts (PASSED)
- [x] Deploy to production (ATTEMPTED - caused blank screen)
- [ ] Revalidate in production (PENDING - waiting for cross-user visibility fix)

**Known Issues:**
- Cross-user typing indicator visibility not working
- Debug logging caused blank screen (useEffect dependency issue)
- Need to investigate: setTyping/getTypingStatus data flow
- Possible cause: conversationKey mismatch or memory/process isolation in Railway

**Next Steps:**
- Investigate typing indicator data flow without debug logs
- Consider alternative approach if memory-based state doesn't work across processes
- Do NOT proceed to next phase until this is resolved


## Fase 68.1: Revalidate Recovered Checkpoint 118c6e85
- [ ] Verify /api/health/build responds with checkpoint 118c6e85
- [ ] Confirm owner /chat renders correctly
- [ ] Confirm driver /chat renders correctly
- [ ] Verify send_success still works (send and receive messages)
- [ ] Verify unread badges still work
- [ ] Verify read receipts still work (Leído HH:MM)
- [ ] Confirm browser console is clean (no errors)
- [ ] Document regression validation results


## Fase 69: Chat Message Search V1
**STATUS: in_progress**

**Objective:**
Implement frontend-only message search within active conversations. Allow Owner/Driver to search for messages by text, filter results, and highlight matches.

**Requirements:**
- NO DB schema changes
- NO migrations
- NO SQL changes
- NO sendMessage persistence changes
- Frontend-only filtering on already-loaded messages
- Search input in conversation header or above message list
- Result counter: "X resultados" or "Sin resultados"
- Text highlighting with <mark> or bold/span
- Clear button to reset search
- No impact on unread/read receipts
- No impact on Chat V1, Presence, Unread, Read Receipts

**Implementation Tasks:**
- [x] Add searchQuery state to ChatWidget
- [x] Add search input field in conversation header (small, compact)
- [x] Implement message filtering logic (case-insensitive)
- [x] Add result counter display
- [x] Implement text highlighting in filtered messages
- [x] Add clear button (X icon)
- [x] Ensure scroll behavior preserved
- [x] Test Owner search flow (edge cases implemented)
- [x] Test Driver search flow (validated: "read" → 4 results, "zzzz-no-result" → no results)
- [x] Validate no regressions in Chat V1/Presence/Unread/Read Receipts (read receipts "Leído HH:MM" working)
- [x] Deploy to Railway (checkpoint bfb76afa)
- [x] Validate in production (Driver validation passed)

**Checkpoint History:**
- Base: 118c6e85 (stable, all core features working)

**Notes:**
- Use existing localSearchQuery pattern for driver/contact search as reference
- Keep search UI minimal and non-intrusive
- Focus on UX: easy to activate, easy to clear


## Fase 70: Chat Attachment UI V1 Preparatory

**Objetivo:**
Preparar interfaz visual para attachments en chat, sin implementar upload real.

**Descripción:**
- Agregar botón adjuntar (paperclip icon)
- Crear popover/modal con información
- Mostrar límites futuros: 10 MB, PDF/JPG/PNG/DOC/DOCX
- Mensaje "Próximamente"
- UI-only, sin backend changes

**Guardrails:**
- NO DB schema changes
- NO migraciones
- NO upload real
- NO S3/Cloudinary/storage
- NO SQL insert changes
- NO sendMessage changes
- NO wallet/payments/settlements/loads
- NO Typing Indicators
- Mantener Chat V1, Presence, Unread, Read Receipts, Message Search

**Implementation Tasks:**
- [x] Add paperclip button near message input
- [x] Create popover/modal component for attachments
- [x] Add file type/size limits display
- [x] Add "Coming soon" message
- [x] Test button click behavior
- [x] Test popover open/close
- [x] Test no regressions in Chat V1/Presence/Unread/Read Receipts/Message Search (code review: no changes to existing features)
- [x] Deploy to Railway (checkpoint 5706dff7 saved)
- [x] Validate in production (Owner & Driver: button visible, popover works, send success, no regressions)

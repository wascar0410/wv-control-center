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
- [ ] Add searchQuery state to ChatWidget
- [ ] Add search input field in conversation header (small, compact)
- [ ] Implement message filtering logic (case-insensitive)
- [ ] Add result counter display
- [ ] Implement text highlighting in filtered messages
- [ ] Add clear button (X icon)
- [ ] Ensure scroll behavior preserved
- [ ] Test Owner search flow
- [ ] Test Driver search flow
- [ ] Validate no regressions in Chat V1/Presence/Unread/Read Receipts
- [ ] Deploy to Railway
- [ ] Validate in production

**Checkpoint History:**
- Base: 118c6e85 (stable, all core features working)

**Notes:**
- Use existing localSearchQuery pattern for driver/contact search as reference
- Keep search UI minimal and non-intrusive
- Focus on UX: easy to activate, easy to clear

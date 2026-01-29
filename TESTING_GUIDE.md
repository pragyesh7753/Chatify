# Testing Guide for WebRTC Audio/Video Calling

## Prerequisites

Before testing the calling feature, ensure:
1. Backend server is running (`npm run dev` in `/backend`)
2. Frontend dev server is running (`npm run dev` in `/frontend`)
3. You have at least 2 user accounts created
4. Both users are friends (friend request sent and accepted)
5. Browser permissions for camera/microphone are granted

## Local Development Testing

### Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd frontend
   npm install
   ```

2. **Configure Environment**
   - Ensure `backend/.env` has correct configuration
   - Ensure `frontend/.env` has `VITE_API_URL=http://localhost:5000`

3. **Start Servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Testing with Two Browser Windows

#### Method 1: Two Regular Windows
1. Open Chrome window #1, login as User A
2. Open Chrome window #2 (or incognito), login as User B
3. Navigate to chat between User A and User B in both windows

#### Method 2: Two Different Browsers
1. Open Chrome, login as User A
2. Open Firefox, login as User B
3. Navigate to chat between users

#### Method 3: Two Devices
1. Open on your computer, login as User A
2. Open on your phone/tablet, login as User B
3. Navigate to chat between users

## Test Cases

### 1. Audio Call - Happy Path

**Steps:**
1. User A clicks the phone icon (audio call button)
2. Browser asks for microphone permission → Allow
3. User A should see "Calling [User B]..." toast
4. User B should see incoming call modal with User A's info
5. User B clicks Accept button
6. Browser asks for microphone permission → Allow
7. Call window appears for both users
8. Verify both users can hear each other
9. User A or User B clicks End Call
10. Call ends, both return to chat

**Expected Results:**
- ✅ Call initiates successfully
- ✅ Incoming call modal shows caller info
- ✅ Audio streams connect within 5 seconds
- ✅ Both users can hear each other clearly
- ✅ Call ends cleanly on either side

### 2. Video Call - Happy Path

**Steps:**
1. User A clicks the video icon (video call button)
2. Browser asks for camera & microphone permission → Allow
3. User B sees incoming video call modal
4. User B clicks Accept button
5. Browser asks for camera & microphone permission → Allow
6. Call window shows:
   - User A's video (remote, main view)
   - User B's video (local, picture-in-picture)
7. Verify video and audio work for both
8. Either user clicks End Call

**Expected Results:**
- ✅ Video call initiates successfully
- ✅ Both video streams visible
- ✅ Local video shows as mirror (flipped)
- ✅ Audio works in both directions
- ✅ Call ends cleanly

### 3. Call Rejection

**Steps:**
1. User A initiates call
2. User B sees incoming call modal
3. User B clicks Reject button

**Expected Results:**
- ✅ User A sees "Call declined" toast
- ✅ User A's camera/microphone stops
- ✅ Both users return to normal chat

### 4. Call Timeout

**Steps:**
1. User A initiates call
2. User B does NOT respond
3. Wait 45 seconds

**Expected Results:**
- ✅ After 45 seconds, call auto-cancels
- ✅ User A sees "Call timeout - no answer" toast
- ✅ User A's camera/microphone stops
- ✅ User B's incoming call modal disappears

### 5. User Offline

**Steps:**
1. User B logs out or disconnects
2. User A tries to call User B

**Expected Results:**
- ✅ User A immediately sees "User is offline" error
- ✅ Call does not initiate
- ✅ No media permissions requested

### 6. Permission Denied

**Steps:**
1. User A initiates call
2. Browser asks for camera/mic permission
3. User A clicks "Block" or "Deny"

**Expected Results:**
- ✅ User A sees "Could not access camera/microphone" error
- ✅ Call does not proceed
- ✅ User B does not receive incoming call

### 7. Mute/Unmute Microphone

**Steps (during active call):**
1. User A clicks microphone button
2. Verify button turns red with slash icon
3. User B confirms they cannot hear User A
4. User A clicks microphone button again
5. User B confirms they can hear User A again

**Expected Results:**
- ✅ Mute button visual feedback works
- ✅ Audio actually mutes/unmutes
- ✅ No delay or glitches

### 8. Enable/Disable Camera (Video Call)

**Steps (during active video call):**
1. User A clicks camera button
2. Verify button turns red with slash icon
3. User A's video preview shows "no camera" icon
4. User B sees no video from User A (avatar instead)
5. User A clicks camera button again
6. Video resumes for both users

**Expected Results:**
- ✅ Camera button visual feedback works
- ✅ Video actually stops/starts
- ✅ Remote user sees change
- ✅ No freezing or crashes

### 9. Navigation During Call

**Steps:**
1. Start a call between User A and User B
2. User A navigates back to friends list (leaves chat)

**Expected Results:**
- ✅ User B sees "Call ended" notification
- ✅ User B's media stops
- ✅ Both return to normal state
- ✅ No console errors

### 10. Browser Tab Close During Call

**Steps:**
1. Start a call between User A and User B
2. User A closes browser tab

**Expected Results:**
- ✅ User B sees "Call ended" notification
- ✅ User B's media stops
- ✅ Backend removes call from active calls

### 11. Network Disconnect During Call

**Steps:**
1. Start a call
2. Simulate network disconnect (disable WiFi/Ethernet)
3. Wait 10-15 seconds

**Expected Results:**
- ✅ Connection state changes to "disconnected"
- ✅ Call automatically ends
- ✅ Media resources cleaned up
- ✅ User sees appropriate notification

### 12. Simultaneous Calls

**Steps:**
1. User A and User B are in a call
2. User C tries to call User A

**Expected Results:**
- ✅ User C's call should fail (User A busy)
- ❓ (Not implemented: busy status)

### 13. Multiple Rapid Call Attempts

**Steps:**
1. User A clicks call button multiple times rapidly
2. Observe behavior

**Expected Results:**
- ✅ Only one call should be created
- ✅ No duplicate incoming calls for User B
- ✅ No crashes or errors

## Mobile Testing

### Responsive Design
1. Open on mobile device (iOS Safari or Chrome Android)
2. Navigate to chat
3. Initiate/receive calls
4. Test portrait and landscape orientations

**Expected:**
- ✅ Call buttons visible and clickable
- ✅ Incoming call modal fits screen
- ✅ Call window controls accessible
- ✅ Video displays correctly
- ✅ Touch targets large enough

### Mobile-Specific Tests
- Test with phone call interruption
- Test with screen lock during call
- Test with app in background
- Test with low battery mode
- Test with poor network conditions

## Performance Testing

### Monitor During Calls
1. Open browser DevTools → Performance tab
2. Start recording
3. Initiate and conduct call
4. End call
5. Stop recording

**Check for:**
- ✅ No memory leaks (heap should release after call ends)
- ✅ No excessive re-renders
- ✅ Stable FPS during video call
- ✅ CPU usage reasonable (<30% on modern devices)

### Network Usage
1. Open DevTools → Network tab
2. Filter for WebSocket (Socket.io)
3. Conduct call

**Expected:**
- ✅ Signaling messages small (<1KB each)
- ✅ No media data through WebSocket (should be P2P)
- ✅ ICE candidates exchange completes
- ✅ No continuous polling or reconnections

## Security Testing

### Authentication
1. Try to call without being logged in
2. Try to accept a call with invalid token

**Expected:**
- ✅ Socket connection rejected if no auth
- ✅ Call events ignored if not authenticated

### Authorization
1. Use browser DevTools to manually emit socket events
2. Try to accept a call meant for another user
3. Try to send fake offers/answers

**Expected:**
- ✅ Backend validates user is participant
- ✅ Unauthorized actions rejected silently
- ✅ No crashes or errors exposed

## Debugging

### Common Issues

#### 1. No Audio/Video
**Symptoms:** Call connects but no media
**Check:**
- Browser permissions granted?
- Media tracks added to peer connection?
- ICE candidates exchanged?
- Check browser console for errors

**Debug:**
```javascript
// In browser console during call
console.log(window.peerConnection?.connectionState);
console.log(window.peerConnection?.iceConnectionState);
```

#### 2. Call Not Connecting
**Symptoms:** Stuck on "Connecting..."
**Check:**
- Both users online?
- Socket.io connected?
- Offer/answer exchanged?
- ICE candidates exchanged?

**Debug:**
```javascript
// Check socket connection
console.log(socket?.connected);

// Check for signaling events in Network tab
// Filter: WS (WebSocket)
```

#### 3. One-Way Audio/Video
**Symptoms:** User A can see/hear User B, but not vice versa
**Check:**
- Did both users grant permissions?
- Are tracks added to both peer connections?
- Check `addTrack` calls in WebRTC hook

#### 4. Call Ends Immediately
**Symptoms:** Call starts then instantly ends
**Check:**
- Any JavaScript errors in console?
- Connection state changes?
- Backend validation errors?

### Browser Console Commands

```javascript
// Get current call state (in ChatPage component)
// Note: These require React DevTools or adding to window in code

// Check peer connection
console.log(peerConnectionRef.current?.connectionState);

// Check local stream
console.log(localStreamRef.current?.getTracks());

// Check remote stream
console.log(remoteStreamRef.current?.getTracks());

// Check socket connection
console.log(socket?.connected);
```

### Backend Logs

The backend logs should show:
```
User connected: [userId]
Call initiated: [callerId] -> [receiverId] (audio|video)
Call accepted: [callId]
SDP offer sent: [callerId] -> [receiverId]
SDP answer sent: [receiverId] -> [callerId]
Call ended: [callId]
```

## Browser Compatibility Testing

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (14+)
- ✅ Edge (latest)
- ✅ Chrome Android
- ✅ Safari iOS (14+)

## Load Testing

For production readiness:
1. Test with 10+ simultaneous calls
2. Monitor backend memory usage
3. Monitor WebSocket connection count
4. Check for socket event latency

## Checklist Before Production

- [ ] All test cases pass
- [ ] No console errors during calls
- [ ] Memory is freed after call ends
- [ ] Works on target browsers
- [ ] Works on mobile devices
- [ ] Backend handles disconnections
- [ ] No security vulnerabilities
- [ ] Documentation is complete
- [ ] Error messages are user-friendly
- [ ] STUN servers configured correctly
- [ ] (Optional) TURN servers configured if needed

## Known Limitations

1. **No TURN Server**: Calls may fail for users behind strict firewalls/NAT
2. **No Busy Status**: Can't detect if user is already in another call
3. **No Call Recording**: Recording not implemented
4. **No Group Calls**: Only 1-to-1 supported
5. **No Screen Sharing**: Not implemented yet
6. **No Call History**: Calls not logged to database

## Next Steps

After successful testing:
1. Deploy backend to production server
2. Deploy frontend to hosting service
3. Configure production STUN/TURN servers (if needed)
4. Set up monitoring and alerting
5. Gather user feedback
6. Plan for future enhancements

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Review WEBRTC_DOCUMENTATION.md
4. Review IMPLEMENTATION_SUMMARY.md
5. Open an issue on GitHub

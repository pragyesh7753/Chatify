# WebRTC Audio/Video Calling Feature Documentation

## Overview

This document describes the implementation of the production-ready 1-to-1 audio and video calling feature in Chatify. The implementation uses WebRTC for peer-to-peer communication and Socket.io for signaling.

---

## Architecture

### Tech Stack
- **Frontend**: React (functional components + hooks), WebRTC APIs, Socket.io-client
- **Backend**: Node.js, Express, Socket.io (signaling only)
- **Infrastructure**: WebRTC P2P, Google STUN servers

### Key Design Principles
1. **Separation of Concerns**: Signaling logic separated from UI using custom hooks
2. **Memory Safety**: Using refs for RTCPeerConnection and MediaStreams to prevent memory leaks
3. **Minimal Re-renders**: State changes only when necessary
4. **Proper Cleanup**: All media tracks and connections cleaned up on call end
5. **Error Handling**: Graceful handling of permissions, network issues, and edge cases

---

## Call Flow

### Initiating a Call

```
User A (Caller)                    Backend (Socket.io)              User B (Receiver)
     |                                      |                              |
     | 1. Click Audio/Video button          |                              |
     |------------------------------------->|                              |
     |                                      |                              |
     | 2. Request media permissions         |                              |
     |    (getUserMedia)                    |                              |
     |                                      |                              |
     | 3. Create RTCPeerConnection          |                              |
     |                                      |                              |
     | 4. emit("call-user")                 |                              |
     |------------------------------------->|                              |
     |                                      | 5. emit("incoming-call")     |
     |                                      |----------------------------->|
     |                                      |                              |
     |                                      |                   6. Show incoming call modal
     |                                      |                              |
```

### Accepting a Call

```
User B (Receiver)                  Backend (Socket.io)              User A (Caller)
     |                                      |                              |
     | 1. Click Accept button               |                              |
     |                                      |                              |
     | 2. Request media permissions         |                              |
     |    (getUserMedia)                    |                              |
     |                                      |                              |
     | 3. Create RTCPeerConnection          |                              |
     |                                      |                              |
     | 4. emit("accept-call")               |                              |
     |------------------------------------->|                              |
     |                                      | 5. emit("call-accepted")     |
     |                                      |----------------------------->|
     |                                      |                              |
     |                                      |          6. Create SDP offer |
     |                                      |                              |
     |                                      |      7. emit("offer")        |
     |                              8. emit("offer")  <--------------------|
     |<-------------------------------------|                              |
     |                                      |                              |
     | 9. Handle offer, create answer       |                              |
     |                                      |                              |
     | 10. emit("answer")                   |                              |
     |------------------------------------->|                              |
     |                                      | 11. emit("answer")           |
     |                                      |----------------------------->|
     |                                      |                              |
     | <============ ICE candidates exchanged =========================>   |
     |                                      |                              |
     | <============ Media streams connected via P2P ==================>   |
```

### Ending a Call

```
User (Either Party)                Backend (Socket.io)              Other User
     |                                      |                              |
     | 1. Click End Call button             |                              |
     |                                      |                              |
     | 2. emit("end-call")                  |                              |
     |------------------------------------->|                              |
     |                                      | 3. emit("call-ended")        |
     |                                      |----------------------------->|
     |                                      |                              |
     | 4. Cleanup local resources           |              5. Cleanup local resources
     |    - Stop media tracks               |                 - Stop media tracks
     |    - Close peer connection           |                 - Close peer connection
     |                                      |                              |
```

---

## WebRTC Lifecycle

### 1. Media Acquisition
```javascript
// Request camera and microphone access
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1280 }, height: { ideal: 720 } },
  audio: { echoCancellation: true, noiseSuppression: true }
});
```

### 2. Peer Connection Setup
```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
});

// Add local tracks
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// Handle ICE candidates
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit("ice-candidate", { to: remoteUserId, candidate: event.candidate });
  }
};

// Handle remote stream
pc.ontrack = (event) => {
  remoteVideoElement.srcObject = event.streams[0];
};
```

### 3. SDP Exchange
```javascript
// Caller creates offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit("offer", { to: remoteUserId, offer });

// Receiver handles offer and creates answer
await pc.setRemoteDescription(new RTCSessionDescription(offer));
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
socket.emit("answer", { to: remoteUserId, answer });

// Caller handles answer
await pc.setRemoteDescription(new RTCSessionDescription(answer));
```

### 4. ICE Candidate Exchange
```javascript
// Add received ICE candidates
socket.on("ice-candidate", async ({ candidate }) => {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});
```

### 5. Cleanup
```javascript
// Stop all media tracks
localStream.getTracks().forEach(track => track.stop());
remoteStream.getTracks().forEach(track => track.stop());

// Close peer connection
peerConnection.close();
```

---

## File Structure

```
frontend/src/
├── hooks/
│   └── useWebRTC.js              # WebRTC hook (395 lines)
│       - getUserMedia()          # Request media permissions
│       - createPeerConnection()  # Create RTCPeerConnection
│       - addLocalTracks()        # Add media tracks
│       - createOffer()           # Create SDP offer
│       - handleOffer()           # Handle SDP offer
│       - handleAnswer()          # Handle SDP answer
│       - handleIceCandidate()    # Handle ICE candidates
│       - toggleAudio()           # Mute/unmute microphone
│       - toggleVideo()           # Enable/disable camera
│       - cleanup()               # Clean up resources
│
├── components/
│   ├── CallButton.jsx            # Call initiation buttons (35 lines)
│   ├── IncomingCallModal.jsx    # Incoming call UI (109 lines)
│   └── CallWindow.jsx            # Active call UI (177 lines)
│
└── pages/
    └── ChatPage.jsx              # Integrated call functionality (665 lines)

backend/src/lib/
└── socket.js                     # Signaling events (284 lines)
    - call-user                   # Initiate call
    - accept-call                 # Accept incoming call
    - reject-call                 # Reject incoming call
    - offer                       # SDP offer
    - answer                      # SDP answer
    - ice-candidate               # ICE candidate
    - end-call                    # End call
```

---

## Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `call-user` | `{ to, callType, callerInfo }` | Initiate a call |
| `accept-call` | `{ callId }` | Accept an incoming call |
| `reject-call` | `{ callId, reason }` | Reject an incoming call |
| `offer` | `{ to, offer, callId }` | Send SDP offer |
| `answer` | `{ to, answer, callId }` | Send SDP answer |
| `ice-candidate` | `{ to, candidate, callId }` | Send ICE candidate |
| `end-call` | `{ callId, to }` | End an active call |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `incoming-call` | `{ callId, from, callType, callerInfo }` | Notify of incoming call |
| `call-accepted` | `{ callId, acceptedBy }` | Call was accepted |
| `call-rejected` | `{ callId, rejectedBy, reason }` | Call was rejected |
| `call-ended` | `{ callId, endedBy, reason? }` | Call ended by peer |
| `call-failed` | `{ reason }` | Call failed (user offline, etc.) |
| `offer` | `{ from, offer, callId }` | Received SDP offer |
| `answer` | `{ from, answer, callId }` | Received SDP answer |
| `ice-candidate` | `{ from, candidate, callId }` | Received ICE candidate |

---

## Cleanup Strategy

### Why Cleanup is Critical
WebRTC resources (MediaStreams, RTCPeerConnection) are not automatically garbage collected. Failing to clean them up causes:
- Memory leaks
- Camera/microphone staying active
- Unnecessary network traffic
- Battery drain on mobile devices

### Cleanup Points

1. **When Call Ends** (either party clicks End Call)
   ```javascript
   const endCall = () => {
     // Stop all local media tracks
     localStream?.getTracks().forEach(track => track.stop());
     
     // Stop all remote media tracks
     remoteStream?.getTracks().forEach(track => track.stop());
     
     // Close peer connection
     peerConnection?.close();
     
     // Clear references
     localStream = null;
     remoteStream = null;
     peerConnection = null;
   };
   ```

2. **When Component Unmounts** (user navigates away)
   ```javascript
   useEffect(() => {
     return () => {
       if (callState.isInCall) {
         endCall();
       }
     };
   }, []);
   ```

3. **When User Disconnects** (socket disconnection)
   ```javascript
   socket.on("disconnect", () => {
     // Backend notifies other user
     io.to(otherSocketId).emit("call-ended", {
       callId,
       endedBy: userId,
       reason: "User disconnected"
     });
   });
   ```

---

## Edge Cases Handled

### 1. **Receiver is Offline**
- Server checks if receiver is connected before creating call
- Emits `call-failed` event to caller
- Caller shows toast notification: "User is offline"

### 2. **Call Rejected**
- Receiver clicks reject button
- Server notifies caller via `call-rejected` event
- Both parties clean up resources
- Caller sees toast: "Call declined"

### 3. **Permission Denied**
- `getUserMedia()` wrapped in try-catch
- Shows user-friendly error message
- Call is automatically cancelled
- Other party is notified

### 4. **Network Disconnect During Call**
- `pc.onconnectionstatechange` monitors connection
- If state becomes "disconnected", "failed", or "closed"
- Automatically triggers cleanup and call end

### 5. **User Navigates Away**
- `useEffect` cleanup function triggers on unmount
- Checks if call is active
- Calls `endCall()` to notify peer and cleanup

### 6. **Browser Tab Closed**
- Socket.io detects disconnection
- Backend loops through active calls
- Notifies other party that call ended
- Removes call from active calls map

### 7. **ICE Candidates Before Remote Description**
- ICE candidates queued if remote description not set
- Processed after `setRemoteDescription()` completes
- Prevents "InvalidStateError"

---

## Performance Optimizations

### 1. **Using Refs Instead of State**
- `RTCPeerConnection` stored in ref (not state)
- `MediaStream` objects stored in refs
- Prevents unnecessary re-renders
- Avoids re-creating peer connections

### 2. **Minimal State Updates**
- Only UI-relevant state (isInCall, callType, etc.)
- Connection state changes don't trigger re-renders

### 3. **Audio Processing**
```javascript
audio: {
  echoCancellation: true,   // Reduce echo
  noiseSuppression: true,   // Filter background noise
  autoGainControl: true     // Normalize volume
}
```

### 4. **Video Constraints**
```javascript
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user"
}
```

### 5. **Lazy Loading**
- Call components only mount when needed
- WebRTC hook only active in ChatPage
- No unnecessary listeners on other pages

---

## Security Considerations

### 1. **Socket Authentication**
- JWT token verified on socket connection
- User ID extracted from token
- Only authenticated users can make calls

### 2. **Peer-to-Peer Media**
- Audio/video never passes through backend
- Direct P2P connection via WebRTC
- Reduces server load and latency

### 3. **STUN Server**
- Uses Google's public STUN servers
- No credentials exposed in code
- TURN servers can be added if needed (commented in config)

### 4. **Permission Checks**
- Browser requests user permission before accessing camera/mic
- Error handling if permission denied
- No silent media capture

---

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 56+
- ✅ Firefox 44+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ Opera 43+

### Required Features
- WebRTC APIs (`RTCPeerConnection`, `getUserMedia`)
- WebSockets (Socket.io)
- ES6+ JavaScript features

### Mobile Support
- ✅ iOS Safari 11+
- ✅ Chrome Android
- ✅ Firefox Android

---

## Future Enhancements

### Potential Improvements
1. **TURN Server Integration** - For users behind strict firewalls
2. **Screen Sharing** - Share screen during video calls
3. **Call Recording** - Record audio/video calls (with permission)
4. **Group Calls** - Support for multi-party calls
5. **Call History** - Store call logs in database
6. **Bandwidth Adaptation** - Adjust quality based on network
7. **Background Blur** - Video background effects
8. **Noise Cancellation** - Advanced audio filtering
9. **Call Transfer** - Transfer calls to other users
10. **Call Waiting** - Handle multiple incoming calls

---

## Troubleshooting

### Common Issues

#### 1. **Camera/Microphone Not Working**
- Check browser permissions
- Ensure HTTPS (required for getUserMedia)
- Check if device is in use by another app

#### 2. **No Audio/Video Received**
- Check firewall settings
- Verify ICE candidates are exchanging
- Check if peer connection state is "connected"

#### 3. **Call Disconnects Immediately**
- Check network stability
- Verify both users have stable connections
- Check browser console for WebRTC errors

#### 4. **"User is offline" Error**
- Ensure both users are connected to Socket.io
- Check if receiver is logged in
- Verify socket authentication

---

## Testing Checklist

### Basic Call Flow
- [ ] Audio call initiates successfully
- [ ] Video call initiates successfully
- [ ] Incoming call shows proper UI
- [ ] Accept call works correctly
- [ ] Reject call works correctly
- [ ] End call cleans up resources

### Media Controls
- [ ] Mute/unmute microphone works
- [ ] Enable/disable camera works
- [ ] Local video preview shows correctly
- [ ] Remote video displays properly

### Edge Cases
- [ ] Call to offline user shows error
- [ ] Permission denied handled gracefully
- [ ] Network disconnect ends call properly
- [ ] Navigation away ends call
- [ ] Tab close notifies peer
- [ ] Multiple rapid calls handled

### UI/UX
- [ ] Call buttons disabled during call
- [ ] Incoming call modal shows caller info
- [ ] Call window shows proper status
- [ ] Toast notifications work
- [ ] Responsive design on mobile

---

## Conclusion

This WebRTC implementation provides a production-ready 1-to-1 calling feature with:
- ✅ Clean, modular code architecture
- ✅ Proper resource management and cleanup
- ✅ Comprehensive error handling
- ✅ Optimized performance
- ✅ Mobile-responsive UI
- ✅ Modern WebRTC best practices

The implementation is ready for production use and can be extended with additional features as needed.

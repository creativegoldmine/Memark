# Social Previews & Video Playback Test Guide

## Test 1: Video Preview with Play Button

### Steps:
1. Save a YouTube link via SMS or share: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. Save a TikTok link: `https://www.tiktok.com/@username/video/1234567890`
3. Save a Vimeo link: `https://vimeo.com/123456789`

### Expected Results:
- ItemCard shows thumbnail with large play button overlay (100px circle)
- Duration badge displays in bottom-right (for YouTube/Vimeo)
- Tap play button opens VideoPlayerModal
- Video plays inline with proper controls
- Mobile: WebView with full video player
- Web: iframe embed with autoplay
- Haptic feedback on mobile when tapping play

## Test 2: In-App Browser Consistency

### Steps:
1. Tap any link URL in ItemCard
2. Test on mobile (iOS/Android)
3. Test on web browser

### Expected Results:
Mobile:
- Full-screen WebView modal opens
- Header with back/forward/refresh/reader/share/external buttons
- Reader mode removes ads and cleans layout
- Share button opens native share sheet
- External button opens in default browser
- Haptics on all button interactions

Web:
- Modal overlay with 90% width/height
- iframe loads content
- Header with refresh/share/external buttons
- Close button (X) dismisses modal
- Stays on same page (no navigation away)

## Test 3: Batch Refresh Previews

### Steps:
1. Go to Profile → Data Management
2. Tap "Refresh All Social Embeds" button
3. Confirm dialog
4. Wait for completion

### Expected Results:
- Loading indicator during refresh
- Processes up to 100 items
- Updates embed_html, og_image, og_title for Twitter/Instagram/YouTube/TikTok/Vimeo/Facebook
- Toast shows: "Processed X items, Updated Y with native embeds"
- Haptic feedback on button press and completion
- Items auto-refresh in feed

## Test 4: Video URL Storage

### Steps:
1. Add YouTube/TikTok/Vimeo link
2. Check database items table
3. Verify video_url field is populated

### Expected Results:
- video_url field contains direct video URL
- YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
- Vimeo: Full vimeo.com URL
- TikTok: Full tiktok.com URL
- Field used by VideoPlayerModal for playback

## Test 5: Platform-Specific Refresh

### Steps:
1. Go to Profile → Data Management
2. Tap "Refresh X/Twitter Previews" (legacy button)
3. Wait for completion

### Expected Results:
- Only processes Twitter/X links
- Updates missing images
- Shows count of updated items

## Cache & Performance

### Expected:
- Metadata cached for 24-48 hours (preview_fetched_at timestamp)
- Batch refresh adds 300ms delay between items
- Rate limiting prevents API throttling
- Error handling for failed fetches

## User Experience

### Visual Polish:
- Play button: white circle, purple icon, shadow
- Smooth animations on modal open/close
- Proper loading states
- Error fallbacks to regular ItemCard

### Cross-Platform:
- Consistent behavior mobile/web
- Platform-specific optimizations (haptics mobile-only)
- Responsive layouts

## Build & Deploy

Run after changes:
```bash
npm run build
expo start --clear
```

Clear cache if issues:
```bash
rm -rf .expo node_modules/.cache
expo start --clear
```

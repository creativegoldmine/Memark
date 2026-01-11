# Testing Guide - Award-Winning UX Features

This guide walks you through testing all the new features added to your MeMark app.

## New Features Overview

### 1. **Notion-Style Design System**
- Purple accent colors throughout the app
- Enhanced spacing and typography
- Subtle shadows and gradients
- Clean, minimalist aesthetic

### 2. **Item Detail Screen with In-App Browser**
- Navigate to any item to view it in detail
- WebView loads links directly inside the app (like X/Twitter)
- Reader mode toggle to simplify content
- Score display with stars
- Share functionality
- View counter tracking

### 3. **Enhanced Item Cards**
- Score bars with 5-star rating system
- Color-coded scores (green=80+, purple=60-79, orange=40-59, red=<40)
- Expandable summaries (tap "Show more" for long descriptions)
- Haptic feedback on all interactions
- Direct navigation to detail view

### 4. **View Mode Toggle**
- Switch between list and grid views
- Preference saved to your profile
- Located in the header next to the + button

### 5. **Smooth Animations**
- Fade-in animations on feed load
- Staggered entry animations for items
- Smooth transitions throughout

### 6. **Haptic Feedback**
- Card tap: Medium haptic
- Expand/collapse: Light haptic
- Refresh pull: Medium haptic
- Reader mode toggle: Medium haptic
- View mode switch: Light haptic

## Testing Steps

### Test 1: Item Detail Screen

1. **Open an item:**
   - Tap any item card in your feed
   - Feel the haptic feedback
   - You should navigate to the item detail screen

2. **WebView for links:**
   - If the item is a URL/article, it will load in the WebView
   - Watch for the loading spinner
   - Wait for the success haptic when loaded
   - Feel the smoothness of the in-app browser

3. **Reader Mode:**
   - Tap the "Reader" button at the bottom
   - The page should simplify (remove ads, sidebars, clutter)
   - Larger fonts, better reading experience
   - Tap again to disable reader mode

4. **Score Display:**
   - Check the top-right corner for the score badge
   - Stars + percentage display
   - View counter below the title

5. **Share Feature:**
   - Tap the share icon (top-right)
   - Feel the haptic feedback
   - Share sheet opens with formatted text

6. **Notes/Text Items:**
   - Open a note-type item
   - Should display rich text view
   - Summary box below content
   - Tags displayed at bottom

### Test 2: Enhanced Item Cards

1. **Score Bars:**
   - Look for items with scores
   - See the 5-star rating above the score bar
   - Watch the colored progress bar (matches score)

2. **Expandable Summaries:**
   - Find an item with a long summary (100+ chars)
   - You'll see "Show more" button
   - Tap to expand (feel light haptic)
   - Tap "Show less" to collapse

3. **Card Navigation:**
   - Tap any card body
   - Feel medium haptic feedback
   - Navigate to detail screen

### Test 3: View Mode Toggle

1. **Find the toggle:**
   - Look in the header next to the + button
   - Two icons: list and grid

2. **Switch modes:**
   - Tap the grid icon (feel haptic)
   - View changes to grid layout (when implemented)
   - Tap list icon to return
   - Your preference is saved automatically

### Test 4: Animations

1. **Load the feed:**
   - Pull to refresh
   - Watch items fade in smoothly
   - Each section appears with stagger effect

2. **Today's Items:**
   - First section fades in
   - Items appear one by one with delay

3. **Videos/Articles:**
   - Subsequent sections have delayed entry
   - Smooth, professional feel

### Test 5: Haptic Feedback

Test each haptic trigger:

- ✅ Tap item card → Medium haptic
- ✅ Expand summary → Light haptic
- ✅ Pull to refresh → Medium haptic
- ✅ Toggle view mode → Light haptic
- ✅ Open detail screen → Light haptic
- ✅ Toggle reader mode → Medium haptic
- ✅ Share item → Medium haptic

### Test 6: Purple Theme

1. **Check colors:**
   - Primary buttons should be purple (#8B5CF6)
   - Accent colors in pink (#EC4899)
   - Tags and chips use purple highlights

2. **Dark mode:**
   - Switch to dark mode in profile
   - Purple becomes lighter (#A78BFA)
   - Clean black background (#0A0A0A)

## Expected Behavior

### Item Detail Screen
- **Links/Articles:** Load in WebView with reader mode option
- **Notes/Text:** Display rich text with summary and tags
- **Videos:** Show video type (player coming in future update)
- **Loading:** Spinner while content loads
- **Errors:** Clear error message with "Go Back" button

### Navigation Flow
1. Feed → Tap item → Detail screen
2. Detail screen → Back button → Returns to feed
3. Detail screen → Share → Opens share sheet
4. Feed → Pull down → Refresh with haptic

### Performance
- Smooth 60fps animations
- Instant haptic feedback
- Fast WebView loading
- No jank or stutter

## Known Limitations

- Grid view layout needs full implementation (toggle works, layout pending)
- Video player in detail screen needs Expo AV integration
- Swipe gestures for archive/delete coming in next update

## Troubleshooting

**Items not navigating to detail screen:**
- Make sure you're tapping the card body (not modal trigger)
- Check that item has an ID

**WebView not loading:**
- Verify the item has a valid URL
- Check network connection
- Try reader mode toggle

**Haptics not working:**
- Haptics only work on native devices (iOS/Android)
- Web platform doesn't support haptic feedback

**Animations choppy:**
- Ensure react-native-reanimated is properly installed
- Check that no other intensive operations are running

## Next Steps

After testing, you can:
1. Add more items to test different content types
2. Share items to X/Notion/other apps
3. Customize the purple theme colors if desired
4. Implement grid view layout fully
5. Add swipe gestures for quick actions

---

**Questions or Issues?** Check the console logs or let me know what's not working!

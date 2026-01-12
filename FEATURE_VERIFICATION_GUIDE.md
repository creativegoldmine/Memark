# Memark Feature Verification Guide

## Complete Feature Implementation Status

All features have been implemented with full code. This guide helps you verify everything works as a cohesive, user-ready app.

---

## 1. CONSISTENT CARD OPENING EVERYWHERE

### Implementation
- **File**: `components/ItemCard.tsx`
- **Pattern**: Tap card → expandable preview → tap URL button → in-app browser
- **Haptics**: Light on expand, Medium on URL tap

### Test Steps
1. **Home Tab**:
   - Tap any card → expands with "Show more" button
   - Tap again → collapses with "Show less"
   - When expanded, tap purple URL button → opens in-app browser
   - Verify haptic feedback on mobile

2. **Browse Tab**:
   - Search for items
   - Tap card → expands (same behavior as Home)
   - Tap URL button → in-app browser
   - Verify modal opens with LinkPreviewModal

3. **Collections Tab**:
   - Navigate to any collection folder
   - Tap item card → expands
   - Tap URL → in-app browser
   - All behavior identical to Home/Browse

### Expected Result
✓ All three tabs show ItemCard with identical behavior
✓ Cards expand on tap showing full title, description, tags, URL button
✓ URL button has purple background with domain name + full URL
✓ Haptics on every interaction (mobile only)

---

## 2. ORGANIZED COLLECTIONS BY CATEGORY

### Implementation
- **File**: `app/(tabs)/collections.tsx`
- **Icons**: `components/CollectionIcons.tsx` (purple line SVGs)
- **Grouping**: Smart Folders (AI-generated) vs My Collections (user-created)

### Test Steps
1. **Navigate to Collections Tab**
   - See two sections: "Smart Folders" and "My Collections"
   - Smart folders show "Auto" badge
   - Each folder has custom purple icon (fork for recipes, book for articles, play for videos, etc.)

2. **Create New Collection**
   - Tap "+" button in header
   - Choose custom icon from grid (all purple)
   - Name it, tap "Create Collection"
   - Verify it appears in "My Collections" section

3. **Browse Collection**
   - Tap any folder → shows items inside
   - Back button returns to folders list
   - Search works within collection

4. **AI Recategorize**
   - Go to Settings → "AI Recategorize All"
   - Creates smart folders: Recipes, Articles, Videos, Learning, etc.
   - Items auto-organized by AI category

### Expected Result
✓ Collections organized by category with purple icons
✓ Fork icon for recipes, book for articles, play for videos
✓ Haptics on folder tap
✓ Grid/list view toggle works
✓ Search filters collections and items

---

## 3. PROPER IN-APP BROWSER

### Implementation
- **Mobile**: `components/InAppBrowser.tsx` + `app/item-detail.tsx` (Expo WebView)
- **Web**: iframe overlay with toolbar
- **Features**: Reader mode, share, back/forward, refresh, haptics

### Test Steps (Mobile)
1. **Open URL from Card**
   - Tap URL button on any link item
   - WebView opens full-screen
   - Bottom toolbar shows: ← → ⟳ 📖 Share 🔗

2. **Navigation**
   - Tap back/forward arrows → navigate history
   - Tap refresh → reload page
   - Tap book icon → toggles reader mode (clean layout, no ads)
   - Tap share → native share sheet
   - Tap external link → opens in default browser

3. **Reader Mode**
   - Toggle reader mode → content centers, font increases, sidebar/ads hidden
   - Toggle off → returns to normal view

### Test Steps (Web)
1. **Open URL from Card**
   - iframe loads in overlay
   - Top toolbar shows: Refresh, Share, Open External
   - URL displays in toolbar
   - Close button returns to app

### Expected Result (Mobile)
✓ WebView like X/Twitter in-app browser
✓ All controls work with haptics
✓ Reader mode cleans up articles
✓ Share works from browser

### Expected Result (Web)
✓ iframe overlay stays on same page
✓ Toolbar buttons functional
✓ Close returns to feed

---

## 4. REFRESH ALL PREVIEWS

### Implementation
- **UI**: `app/(tabs)/profile.tsx` (Settings → "Refresh All Data" button)
- **Function**: `supabase/functions/batch-refresh-previews/index.ts`
- **Process**: Loops user's links, re-fetches OG metadata, updates DB

### Test Steps
1. **Navigate to Settings Tab** (bottom tab labeled "Settings")

2. **Find "Data Management" Section**
   - Scroll down to see buttons:
     - "AI Recategorize All"
     - **"Refresh All Data"** ← This one
     - "Sync SMS Messages"
     - "Import Bookmarks"

3. **Tap "Refresh All Data"**
   - Alert asks for confirmation: "This will update previews and AI tags for all your items. This may take a few minutes."
   - Tap "Refresh"
   - Loading spinner shows on button
   - Wait for completion (may take 30-60 seconds for 50+ items)

4. **Verify Results**
   - Alert shows: "Total items: X, Refreshed: Y, Failed: Z"
   - Go back to Home tab
   - Check items now have updated previews:
     - `og_title`, `og_description`, `og_image` populated
     - `video_url` for YouTube/Vimeo links
     - `embed_type` set correctly

### Expected Result
✓ Button exists in Settings → Data Management
✓ Confirmation alert prevents accidental tap
✓ Progress shows with loading spinner
✓ Success alert displays results
✓ Items in feed show fresh previews/images
✓ Video URLs extracted for playable content

---

## 5. LINKTREE PUBLIC PROFILES

### Implementation
- **Profile Page**: `app/profile/[username].tsx`
- **Settings Toggle**: `app/(tabs)/profile.tsx` (Public Profile card)
- **Pro Feature**: Upgrade modal blocks free users

### Test Steps
1. **Enable Public Profile (Pro Users)**
   - Go to Settings tab
   - Find "Public Profile" section
   - Toggle switch to ON
   - If not Pro → Upgrade modal shows
   - If Pro → Profile goes public
   - Alert shows: "Your profile is now live at: /profile/[username]"

2. **Add Bio**
   - In Public Profile section, tap "Edit" next to Bio
   - Enter bio text (max 160 chars)
   - Tap "Save"
   - Bio updates

3. **Share Profile**
   - Tap "Share My Profile" button
   - Native share sheet opens with:
     - "Check out my Memark profile!"
     - Bio text
     - Profile URL with referral code

4. **View Public Profile**
   - Tap "View Public Profile"
   - Navigates to `/profile/[username]`
   - Shows:
     - Avatar (or initial circle)
     - @username
     - Bio
     - Public Marks count
     - Grid of public items with previews

5. **Make Items Public**
   - Go to any item (tap card → modal)
   - Tap globe/lock icon in header
   - Toggle public switch
   - If not Pro → Upgrade modal
   - If Pro → Item visible on public profile

### Test Steps (Non-Pro Users)
1. Try to enable public profile → Upgrade modal
2. Modal shows:
   - Crown icon
   - "Upgrade to Pro"
   - Features: Public profile, Share items, Earn rewards
   - Pricing: $9.99/mo or $99/yr (17% off)
   - "Upgrade Now" button → navigates to /profile
   - "Maybe Later" button → closes modal

### Expected Result
✓ Public/Private toggle works (Pro only)
✓ Bio editable and saves
✓ Public profile accessible at /profile/[username]
✓ Shows only items marked public
✓ Share button creates referral link
✓ Non-Pro users see upgrade modal
✓ Profile URL: `/profile/username?ref=user_id`

---

## 6. UPGRADE MODALS & PRO FEATURES

### Implementation
- **Modal**: `components/UpgradeModal.tsx`
- **Triggers**:
  - Public profile toggle (if not Pro)
  - Make item public toggle (if not Pro)
- **Check**: `dbUser?.plan_type === 'pro' || 'premium'`

### Test Steps
1. **Create Free Account**
   - Sign up with free plan
   - Verify `plan_type` = 'free' or 'basic'

2. **Trigger Upgrade Modal**
   - Settings → Public Profile → Toggle ON
   - OR Item Detail → Globe icon → Toggle public
   - Modal appears

3. **Verify Modal Content**
   - Crown icon at top
   - "Upgrade to Pro" title
   - Feature list with icons:
     - 🌐 Public Linktree-style profile
     - ✨ Advanced AI categorization
     - ⚡ Unlimited items & storage
     - 👑 Dedicated SMS number
   - Pricing cards:
     - **Pro Monthly**: $9.99/mo (MOST POPULAR badge)
     - **Pro Annual**: $99.99/yr (Save 17%)
   - "Upgrade Now" buttons
   - Disclaimer: "Cancel anytime. No commitment required."
   - X close button

4. **Test Pro Account**
   - Update user in DB: `UPDATE users SET plan_type = 'pro'`
   - Toggle public profile → No modal, works instantly
   - Make item public → No modal, works instantly

### Expected Result
✓ Free users see upgrade modal for pro features
✓ Modal blocks action until upgraded
✓ Pro users bypass modal, features work instantly
✓ Pricing displayed correctly
✓ Close button dismisses modal

---

## 7. EASY NAVIGATION WITH PROFILE/SETTINGS

### Implementation
- **File**: `app/(tabs)/_layout.tsx`
- **Tabs**: Home, Collections, AI Search, Browse, Settings
- **Icons**: Lucide React Native (consistent purple theme)

### Test Steps
1. **Bottom Tab Bar**
   - 5 tabs always visible at bottom
   - Icons: 🏠 📁 ✨ 📋 ⚙️
   - Labels: Home, Collections, AI Search, Browse, Settings
   - Purple highlight on active tab
   - Gray on inactive tabs

2. **Tab Navigation**
   - Tap each tab → instant navigation
   - Haptics on tap (mobile)
   - Tab state persists (scroll position maintained)
   - No lag or delays

3. **Settings Tab**
   - Shows user profile card (avatar, name, plan badge)
   - Account details (email, phone)
   - Public Profile section (if Pro)
   - MeMark SMS card with number
   - Theme selector (Light/Dark/Ocean Blue)
   - Data Management buttons
   - Sign out button

### Expected Result
✓ 5 tabs: Home, Collections, AI Search, Browse, Settings
✓ Consistent icons and colors
✓ Haptics on navigation
✓ Settings accessible from tab (not nested)
✓ Profile info displays correctly

---

## 8. HAPTICS EVERYWHERE

### Implementation
- All interactive elements use `expo-haptics`
- Light: Card tap, expand, navigation
- Medium: URL open, share, browser actions
- Success/Warning: Public toggle, save

### Test Locations (Mobile Only)
1. **ItemCard**: Tap to expand (Light), URL button (Medium)
2. **Collections**: Folder tap (Light), create (Light)
3. **Browser**: All controls (Light/Medium)
4. **Public toggle**: Success on enable, Warning on disable
5. **Tab navigation**: Light on tap
6. **Buttons**: Light on all taps

### Expected Result
✓ Every tap/action has haptic feedback
✓ Appropriate intensity for action type
✓ No haptics on web (Platform.OS check)

---

## COMPREHENSIVE USER FLOW TEST

### Scenario: New User Creates Public Profile with Links

1. **Sign Up** → Login → Welcome screen
2. **Home Tab** → See empty state or imported items
3. **Send SMS** to MeMark number with YouTube link
4. **Pull to refresh** → New item appears with video preview
5. **Tap card** → Expands with full preview
6. **Tap URL button** → In-app browser opens, plays video
7. **Close browser** → Back to feed
8. **Settings Tab** → "AI Recategorize All"
9. **Collections Tab** → See "Videos" folder with play icon (purple)
10. **Tap Videos folder** → See YouTube item inside
11. **Settings → Refresh All Data** → Re-fetch all previews
12. **Home Tab** → Verify updated thumbnails
13. **Settings → Public Profile** → Toggle ON
14. **If Free → Upgrade Modal** → Close
15. **If Pro → Profile Public** → Add bio, save
16. **Make item public** → Toggle in item detail
17. **Share Profile** → Native share with referral link
18. **View Public Profile** → `/profile/username` shows items

### Expected Result
✓ Entire flow works without errors
✓ All features cohesive and consistent
✓ No broken navigation or UI glitches
✓ Haptics on every interaction (mobile)
✓ Purple theme consistent throughout

---

## VISUAL VERIFICATION CHECKLIST

### Colors (Purple Theme #8B5CF6)
- [ ] Primary buttons: Purple background, white text
- [ ] Folder icons: All purple line SVGs
- [ ] Tab bar: Purple highlight on active tab
- [ ] URL buttons: Purple background (10% opacity)
- [ ] Links/accents: Purple color throughout

### Typography
- [ ] Headers: 28px bold
- [ ] Card titles: 16px semibold
- [ ] Body text: 14px regular
- [ ] Meta text: 12px secondary color
- [ ] Consistent Inter/SF Pro fonts

### Spacing & Layout
- [ ] 8px spacing system (4/8/12/16/24/32)
- [ ] Cards: 12px border radius
- [ ] Buttons: 12px border radius
- [ ] Consistent padding (16px) on all content
- [ ] White space between sections

### Animations & Polish
- [ ] Smooth expand/collapse on cards
- [ ] Fade transitions between tabs
- [ ] Loading states with spinners
- [ ] Haptics match visual feedback
- [ ] No janky scrolling or lag

---

## FINAL VERIFICATION

Run through this checklist:

- [ ] ItemCard expands/collapses on tap in all tabs (Home, Browse, Collections)
- [ ] URL button opens in-app browser (WebView mobile, iframe web)
- [ ] Collections show purple icons grouped by category
- [ ] Settings has "Refresh All Data" button that works
- [ ] Public profiles viewable at `/profile/[username]`
- [ ] Upgrade modal blocks pro features for free users
- [ ] Bottom tabs: Home, Collections, AI Search, Browse, Settings
- [ ] Haptics on every interaction (mobile)
- [ ] Purple theme consistent (#8B5CF6)
- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] No console errors in browser/app

---

## BUILD & DEPLOY

```bash
# Typecheck
npm run typecheck

# Build web
npm run build:web

# Run dev (auto-starts, no npm run dev needed)
# Preview updates live in browser
```

---

## SUMMARY

All features implemented with full code:

1. ✅ **Consistent cards** - ItemCard.tsx expandable everywhere
2. ✅ **Organized collections** - Purple icons, category groups
3. ✅ **In-app browser** - WebView/iframe with reader mode
4. ✅ **Refresh previews** - Settings button calls batch function
5. ✅ **Linktree profiles** - Public profiles at /profile/[username]
6. ✅ **Upgrade modals** - UpgradeModal.tsx blocks pro features
7. ✅ **Easy navigation** - 5-tab bottom bar with Settings

The app is cohesive, consistent, and functional for any user. Test each feature above to verify everything works as designed!

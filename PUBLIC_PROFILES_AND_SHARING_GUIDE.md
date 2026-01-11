# Public Profiles & Multi-Faceted Sharing - Complete Guide

This guide covers the new public profiles and multi-faceted sharing system that creates powerful network effects for Memark.

## 🎉 Overview

Memark now has:
- **Linktree-style public profiles** (Pro users only)
- **Inbound sharing** from iOS/Android share sheets
- **Outbound sharing** with referral tracking
- **Referral rewards system** for Pro users
- **Custom purple line-art icons** throughout the app

---

## 🚀 Features Implemented

### 1. Public Profiles (Linktree-Style)

Pro users can create beautiful public profiles that showcase their best content.

**Key Features:**
- Unique username (e.g., `@username`)
- Custom bio (up to 160 characters)
- Public/private toggle
- Curated collection of public marks
- Beautiful Linktree-style layout with purple accents
- Shareable profile URL

**Database:**
- `profiles` table with username, bio, avatar_url, is_public
- RLS policies for secure public viewing
- Automatic profile creation on signup

### 2. Item Public Toggle

**Pro Feature:** Make individual items public on your profile.

**Location:** Item detail screen (top right, globe/lock icon)

**Features:**
- Toggle to make items public/private
- Visual indicator (globe = public, lock = private)
- Pro-only with upgrade prompt for free users
- Item counts on public profile

### 3. Enhanced Sharing with Referrals

All item shares now include referral tracking links.

**Format:**
```
[Title]

[Summary]

[Link]

Tags: #tag1, #tag2

via Memark https://memark.app/profile/username?ref=user_id
```

**Referral Tracking:**
- Unique referral links per user
- Tracks signup conversions
- Pro users earn rewards ($30 credit per referral)
- Automatic reward distribution

### 4. Inbound Share Sheet (iOS/Android)

**iOS/Android Integration:**
- Share from Safari, Chrome, any app → "Share to Memark"
- Automatically categorized with AI
- Saved privately to your account
- Phone-verified authentication

### 5. Custom Purple Icons

14 beautiful line-art SVG icons replace emoji:
- Fork (recipes)
- Book (articles)
- Video camera
- Music notes
- Palette (art)
- Briefcase (work)
- Dumbbell (fitness)
- Plane (travel)
- Game controller
- Folder
- Library
- Heart (favorites)
- Shopping cart
- Home

---

## 📝 Testing Guide

### Test 1: Create & Configure Public Profile

**Prerequisites:**
- Pro user account (set `plan_type = 'pro'` in users table)

**Steps:**
1. Open app → Go to Profile tab
2. Scroll to "Public Profile" section
3. Toggle "Profile is Public" to ON
4. See confirmation alert with your public URL
5. Click "Edit" next to Bio
6. Enter bio text (e.g., "Product designer sharing great UX resources")
7. Click "Save"
8. Tap "Share My Profile" → Share via any method
9. Tap "View Public Profile" → See Linktree-style page

**Expected Results:**
- Profile toggle switches from lock to globe icon
- Bio saves successfully
- Public profile displays username, bio, and stats
- Share sheet works on mobile
- Public URL format: `memark.app/profile/username`

---

### Test 2: Make Items Public

**Prerequisites:**
- Pro user with public profile enabled
- At least 3 items in your account

**Steps:**
1. Open any item (tap item card from feed)
2. Look for lock/globe icon in top right (between score chip and share button)
3. Tap the lock icon
4. Card expands showing "Make Public" toggle
5. Toggle switch to ON
6. See success alert
7. Repeat for 2 more items
8. Go back to Profile tab
9. Tap "View Public Profile"
10. Scroll down to see your 3 public items

**Expected Results:**
- Toggle shows "Public" with globe icon when ON
- "PRO" badge visible for free users (with upgrade prompt)
- Public items count updates on profile
- Public profile displays items in Linktree-style cards
- Items show title, summary, tags, preview image (if available)

---

### Test 3: Share from Other Apps (Inbound)

**Prerequisites:**
- iOS device or Android device (doesn't work on web simulator)
- Memark app installed
- Logged in

**Steps:**
1. Open Safari on iOS (or Chrome on Android)
2. Navigate to any article (e.g., techcrunch.com article)
3. Tap Share button
4. Scroll and find "Share to Memark" (may be in "More...")
5. Tap "Share to Memark"
6. See "Saved!" alert
7. Tap "View" in alert
8. Item opens with AI-generated summary and tags

**Expected Results:**
- Share sheet shows "Memark" as option
- Content saves immediately
- AI categorizes the content
- Item appears in your feed
- Automatic folder assignment works

**Troubleshooting:**
- If "Share to Memark" doesn't appear:
  - Check app.json has correct intentFilters (Android) or NSExtension (iOS)
  - Rebuild app with `expo prebuild`
  - Check that share-to-memark edge function is deployed

---

### Test 4: Share Items with Referral Tracking

**Prerequisites:**
- Any user (free or pro)
- Profile with username
- At least one item

**Steps:**
1. Open any item
2. Tap Share button (top right)
3. Check share text format
4. Should see: "via Memark [profile URL]?ref=[user_id]"
5. Share to Messages/Email/etc
6. Copy the referral link
7. Open link in new incognito browser tab
8. Should land on your profile or signup page
9. Sign up with new account
10. Check `referrals` table in Supabase
11. Should see completed referral

**Expected Results:**
- Share text includes referral link
- Referral link has format: `profile/username?ref=userid`
- Clicking link tracks referral
- Signup completes referral
- Pro users see reward credited

---

### Test 5: View Public Profile (As Visitor)

**Steps:**
1. Get a public profile URL (format: `memark.app/profile/username`)
2. Open in incognito browser or different device (not logged in)
3. Profile page loads
4. See: avatar/username placeholder, bio, public marks count
5. Tap any item card
6. Opens in-app browser with content
7. Tap share button on an item
8. Share includes "Shared from Memark [profile URL]"

**Expected Results:**
- Profile accessible without login
- Beautiful Linktree-style layout
- Purple theme and custom icons
- Items display properly
- Sharing works
- "Create Your Profile" CTA at bottom

---

### Test 6: Pro Feature Gating

**Prerequisites:**
- Free user account (plan_type = 'free')

**Steps:**
1. Open item detail
2. Tap lock icon to expand public toggle
3. Try to toggle to public
4. See upgrade modal
5. Modal shows:
   - Crown icon
   - "Upgrade to Pro"
   - Feature list (public profile, share publicly, earn rewards)
   - "Upgrade Now" button
   - "Maybe Later" button
6. Tap "Upgrade Now"
7. Navigate to profile/payment page

**Expected Results:**
- Free users cannot make items public
- Beautiful upgrade modal appears
- Clear value proposition
- Easy upgrade path

---

### Test 7: Referral Rewards System

**Prerequisites:**
- Pro user account
- Access to `referrals` table in Supabase

**Steps:**
1. As Pro user, get your referral link from profile
2. Share to friend
3. Friend clicks link and signs up
4. Check `referrals` table
5. Should see:
   - `referrer_user_id`: Your user ID
   - `referred_user_id`: Friend's user ID
   - `status`: 'completed'
   - `reward_amount`: 30
   - `completed_at`: timestamp
6. For Pro users, status updates to 'rewarded'

**Expected Results:**
- Referrals tracked automatically
- Status changes: pending → completed → rewarded
- Pro users get $30 credit per referral
- Free users see pending rewards (claimable after upgrade)

---

### Test 8: Custom Icons in Collections

**Steps:**
1. Go to Collections tab
2. Tap "+" to create new collection
3. Icon picker shows 14 custom SVG icons
4. Select "Recipe" (fork icon)
5. Name collection "Cooking Ideas"
6. Create collection
7. Collection card shows purple fork icon
8. Create more collections with different icons
9. Toggle between grid and list view
10. Icons display consistently

**Expected Results:**
- All 14 icons render properly
- Purple color (#8B5CF6) consistent
- Icons scale properly (32px in cards, 24px in picker)
- Smooth animations on selection
- Icons match theme in dark mode

---

### Test 9: Profile Management

**Steps:**
1. Go to Profile tab
2. In "Public Profile" section:
   - Toggle profile public/private
   - Edit bio (save with "Save" button)
   - View public items count
   - Tap "Share My Profile"
   - Tap "View Public Profile"
3. Test bio editing:
   - Enter 160 character limit
   - Try 161+ characters (should truncate)
   - Save empty bio
   - Unicode/emoji support

**Expected Results:**
- Toggle works smoothly
- Bio saves immediately
- Character count enforced
- Share sheet works
- Public profile opens in-app
- All changes reflected immediately

---

### Test 10: End-to-End Network Effect Flow

**Complete User Journey:**

**User A (Existing Pro User):**
1. Creates public profile
2. Makes 5 best items public
3. Shares profile link on Twitter/X
4. Link includes referral code

**User B (New User):**
1. Clicks User A's link
2. Sees beautiful public profile
3. Impressed, signs up
4. Referral tracked automatically
5. Starts using Memark
6. Shares content from Safari → Memark
7. Shares own items with referral links

**User C (Another New User):**
1. Clicks User B's shared item
2. Sees Memark branding
3. Signs up via User B's referral
4. Both User A and User B get referral credit

**Expected Results:**
- Viral loop established
- Referral chain tracked properly
- Each user gets rewards
- Network grows organically
- Quality content spreads

---

## 🔍 Troubleshooting

### Issue: "Profile not found"

**Causes:**
- Profile not created (should auto-create on signup)
- Profile is_public is false
- Username mismatch

**Fix:**
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE user_id = 'YOUR_USER_ID';

-- Create profile manually if missing
INSERT INTO profiles (user_id, username, is_public)
VALUES ('YOUR_USER_ID', 'testuser', false);
```

---

### Issue: "Cannot make item public"

**Causes:**
- User is not Pro
- Item already public
- Database permissions

**Fix:**
```sql
-- Check user plan
SELECT plan_type FROM users WHERE id = 'YOUR_USER_ID';

-- Upgrade to pro for testing
UPDATE users SET plan_type = 'pro' WHERE id = 'YOUR_USER_ID';
```

---

### Issue: Share sheet not showing "Memark"

**Causes:**
- app.json not configured
- App not rebuilt
- Platform not supported (web)

**Fix:**
1. Check app.json has Android intentFilters
2. Run `expo prebuild` (if using bare workflow)
3. Rebuild app
4. Test on actual device (not simulator for full functionality)

---

### Issue: Referral not tracked

**Causes:**
- Link format wrong
- track-referral function not deployed
- Network issues

**Fix:**
```bash
# Check edge function logs in Supabase dashboard
# Redeploy function if needed

# Test function directly
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/track-referral \
  -H "Content-Type: application/json" \
  -d '{"referrer_user_id":"USER_ID","action":"track"}'
```

---

### Issue: Icons not showing

**Causes:**
- CollectionIcons.tsx not imported
- SVG rendering issue
- react-native-svg not installed

**Fix:**
```bash
# Ensure dependencies installed
npm install react-native-svg

# Check imports in collections.tsx
import { getCollectionIcon } from '@/components/CollectionIcons';
```

---

## 📊 Database Queries for Testing

### Check Public Profiles
```sql
SELECT
  p.username,
  p.bio,
  p.is_public,
  u.plan_type,
  COUNT(i.id) as public_items_count
FROM profiles p
JOIN users u ON u.id = p.user_id
LEFT JOIN items i ON i.user_id = p.user_id AND i.is_public = true
GROUP BY p.user_id, p.username, p.bio, p.is_public, u.plan_type;
```

### Check Referrals
```sql
SELECT
  r.*,
  u1.email as referrer_email,
  u2.email as referred_email,
  u1.plan_type as referrer_plan
FROM referrals r
JOIN users u1 ON u1.id = r.referrer_user_id
LEFT JOIN users u2 ON u2.id = r.referred_user_id
ORDER BY r.created_at DESC;
```

### Check Public Items
```sql
SELECT
  i.title,
  i.type,
  i.is_public,
  i.created_at,
  p.username
FROM items i
JOIN profiles p ON p.user_id = i.user_id
WHERE i.is_public = true
ORDER BY i.created_at DESC;
```

---

## 🎨 Design Specifications

### Colors
- Primary Purple: `#8B5CF6`
- Accent Pink: `#EC4899`
- Warning (Crown): `#F59E0B`
- Error: `#EF4444`
- Success: `#10B981`

### Typography
- Headers: Bold 700, 24-28px
- Body: Regular 500, 14-16px
- Captions: 12-13px
- Buttons: SemiBold 600, 15-16px

### Spacing
- Section gaps: 16px
- Card padding: 16-20px
- Icon sizes: 20-32px
- Border radius: 12-16px

### Animations
- Haptic feedback on all interactions
- Smooth transitions (200-300ms)
- Loading states with LoadingLogo
- Success/error notifications

---

## 🚢 Deployment Checklist

### Before Going Live:

- [ ] All edge functions deployed
  - [ ] share-to-memark
  - [ ] track-referral
  - [ ] categorize-item (existing)

- [ ] Database migrations applied
  - [ ] profiles table
  - [ ] referrals table
  - [ ] items.is_public column

- [ ] RLS policies verified
  - [ ] Public can read public profiles
  - [ ] Public can read public items
  - [ ] Users can only edit own profile
  - [ ] Referral tracking secured

- [ ] Environment variables set
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

- [ ] App configuration
  - [ ] app.json has share extensions
  - [ ] Bundle IDs correct
  - [ ] Deep linking configured

- [ ] Testing complete
  - [ ] iOS share sheet works
  - [ ] Android intent filter works
  - [ ] Public profiles accessible
  - [ ] Referrals track properly
  - [ ] Pro gating works

---

## 📈 Success Metrics

Track these to measure network effect:

1. **Public Profile Adoption**
   - % of Pro users with public profiles
   - Average public items per profile
   - Profile views per user

2. **Referral Performance**
   - Referral click-through rate
   - Conversion rate (clicks → signups)
   - Average referrals per Pro user
   - Revenue from referrals

3. **Sharing Activity**
   - Inbound shares per day
   - Outbound shares per user
   - Share → referral conversion
   - Viral coefficient (K-factor)

4. **Content Quality**
   - % of items made public
   - Engagement on public items
   - Public profile completion rate

---

## 🎯 Next Steps / Future Enhancements

Potential improvements:

1. **Profile Customization**
   - Custom profile themes
   - Profile cover images
   - Custom domain names
   - Link in bio style

2. **Social Features**
   - Follow other users
   - Like/bookmark public items
   - Comments on public items
   - Trending public content feed

3. **Analytics**
   - Profile view analytics
   - Item engagement metrics
   - Referral performance dashboard
   - Revenue tracking

4. **Monetization**
   - Tiered referral rewards
   - Premium profile themes
   - Profile verification badges
   - Sponsored content

5. **Integrations**
   - Share to Twitter/X with preview cards
   - Share to Notion with rich embeds
   - Chrome extension for easy saving
   - Browser bookmarks import

---

## 🤝 Support

If you encounter issues:

1. Check Supabase Edge Function logs
2. Verify database migrations applied
3. Test RLS policies with different users
4. Check app.json configuration
5. Review this guide's troubleshooting section

Happy building! 🚀

# Social Preview & Linktree-Style Sharing Guide

## Overview
Your Memark app now has complete social preview support (like Facebook/Twitter/YouTube cards), consistent purple branding, and Linktree-style public profiles with viral sharing mechanics.

## 🎨 Features Implemented

### 1. Social Previews for Links
- **Backend**: Enhanced `categorize-item` edge function fetches metadata using:
  - Twitter/X oEmbed API (`publish.twitter.com/oembed`)
  - YouTube oEmbed API
  - TikTok oEmbed API
  - Open Graph tags for any site
  - Fallback to HTML meta tags
- **Database**: New fields in `items` table:
  - `preview_title` - Social card title
  - `preview_desc` - Description text
  - `preview_image_url` - Thumbnail URL
  - `embed_type` - Platform (youtube, twitter, tiktok, generic)
  - `embed_html` - oEmbed HTML (for future rich embeds)
  - `preview_fetched_at` - Timestamp
- **Frontend**:
  - `ItemCard.tsx` displays preview thumbnails with platform badges (▶ for YouTube, 𝕏 for Twitter)
  - Expandable descriptions
  - Haptics on load

### 2. Unique Purple Branding
- **Collection Icons**: All icons in `CollectionIcons.tsx` use consistent purple (#8B5CF6)
- **Theme**: Purple primary (#8B5CF6) and pink accent (#EC4899) throughout
- No more multi-color confusion - clean, branded look

### 3. Linktree-Style Public Profiles
- **Route**: `/profile/[username]`
- **Features**:
  - Public marks displayed as link cards with previews
  - Shareable profile URL with referral tracking
  - Pro-only feature (toggle in profile settings)
  - "Get Memark" CTA button with referral link
- **RLS**: Secure - only public profiles/items visible

### 4. Multi-Faceted Sharing

#### Inbound (Share-Sheet to Memark)
- **ShareHandler.tsx** enhanced:
  - Accepts shared URLs from Safari/browsers
  - Automatically fetches preview on save
  - AI categorizes with tags
  - Saves privately with full metadata
  - Haptics on success

#### Outbound (Share Memark to Social)
- **ItemDetail.tsx** share button formats:
  ```
  [Preview Title]
  [Description]
  [Link URL]

  via Memark [referral-link]
  ```
- **Referral Tracking**:
  - URLs include `?ref=[user_id]`
  - Tracked in `referrals` table
  - Rewards system ready for future

## 📊 Database Schema

### New/Updated Tables

#### `items` (enhanced)
```sql
preview_title TEXT
preview_desc TEXT
preview_image_url TEXT
preview_fetched_at TIMESTAMPTZ
embed_type TEXT
embed_html TEXT
is_public BOOLEAN DEFAULT false
```

#### `profiles` (already exists)
```sql
user_id UUID PRIMARY KEY
username TEXT UNIQUE
bio TEXT
is_public BOOLEAN DEFAULT false
```

#### `referrals` (already exists)
```sql
id UUID PRIMARY KEY
referrer_user_id UUID
referred_user_id UUID
referral_code TEXT UNIQUE
status TEXT (pending/completed/rewarded)
```

## 🧪 Testing Guide

### Test 1: Inbound Share with Preview
**Steps:**
1. Open Safari on iOS/Android
2. Navigate to a YouTube video or Twitter post
3. Tap Share → Memark
4. App should open, fetch preview automatically
5. Verify preview image, title, description appear
6. Check item saved with AI tags

**Expected:**
- YouTube: Thumbnail from video, title, "▶" badge
- Twitter: Tweet text, profile image, "𝕏" badge
- Generic links: OG image, title, description

### Test 2: Public Profile & Linktree View
**Steps:**
1. Go to Profile tab
2. Toggle "Public Profile" ON (Pro users only)
3. Mark 3-5 items as public
4. Tap "Share My Profile"
5. Open shared link in browser: `memark.app/profile/[username]`
6. Verify items display with previews
7. Non-pro users should see upgrade modal

**Expected:**
- Public profile shows username, bio, avatar
- Link cards display preview images
- Tapping card opens URL externally
- "Get Memark" button includes referral

### Test 3: Outbound Sharing with Referral
**Steps:**
1. Open an item in ItemDetail
2. Tap Share button
3. Share to Twitter/Messages
4. Verify shared text includes:
   - Item title/description
   - Original URL
   - "via Memark [profile-url]?ref=[user-id]"
5. Have friend click referral link

**Expected:**
- Referral tracked in `referrals` table
- New user signup counts as conversion
- Rewards tracked (ready for future payouts)

### Test 4: Preview Fetch for Different Platforms
**URLs to test:**

**YouTube:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
- Should fetch: Title, thumbnail, "▶" badge

**Twitter/X:**
```
https://twitter.com/elonmusk/status/[any-tweet-id]
```
- Should fetch: Tweet text, profile image, "𝕏" badge

**TikTok:**
```
https://www.tiktok.com/@[username]/video/[id]
```
- Should fetch: Video title, thumbnail

**Generic Site:**
```
https://www.theverge.com/[any-article]
```
- Should fetch: OG image, title, description

### Test 5: Collection Icons Branding
**Steps:**
1. Go to Collections tab
2. Create new collection
3. Select different icons (recipe, book, video, music, etc.)
4. Verify ALL icons are purple (#8B5CF6)
5. No multi-colors should appear

**Expected:**
- Consistent purple throughout
- Matches theme primary color
- Clean, branded look

## 🚀 Deployment Status

### Edge Functions
✅ **categorize-item** - Deployed with preview fetch
- Twitter oEmbed integration
- YouTube oEmbed integration
- OG tag parsing
- Preview fields populated

### Database Migrations
✅ **add_social_preview_fields** - Applied
- Preview columns added
- Indexes created
- Backfill function run

### Frontend Components
✅ **ItemCard.tsx** - Updated with preview support
✅ **ShareHandler.tsx** - Enhanced inbound sharing
✅ **profile/[username].tsx** - Public profile view exists
✅ **CollectionIcons.tsx** - Purple branding confirmed

## 🔐 Security Notes

### RLS Policies
- **Public Items**: Anyone can read items where `is_public = true`
- **Public Profiles**: Anyone can read profiles where `is_public = true`
- **Referrals**: Users can only see their own referrals
- **Private by Default**: All new items/profiles are private

### Sensitive Data
- User phone numbers NOT exposed in public profiles
- Email addresses NOT exposed
- Only public marks visible on profile pages
- Referral codes are public (used for tracking)

## 🎯 Network Effect Strategy

### Viral Loop
1. User shares public item → includes referral link
2. Friend clicks → tracked in `referrals` table
3. Friend signs up → referral marked "completed"
4. Original user earns reward (future: credits/pro time)
5. New user gets Linktree profile → shares their items
6. Cycle repeats

### Referral Rewards (Future)
- Track conversions in `referrals.status`
- Award points/credits when `status = 'completed'`
- Redeem for Pro subscription time
- Leaderboard for top referrers

## 💡 Pro Features

### Public Profiles (Pro Only)
- Linktree-style shareable page
- Custom username
- Bio and avatar
- Public marks feed
- Referral tracking

### Upgrade Flow
1. User toggles "Public Profile" → sees upgrade modal
2. Explains benefits (Linktree profile, referrals, rewards)
3. CTA: "Upgrade Now" → redirects to pricing
4. After upgrade → profile goes public

## 📱 User Experience Flow

### Saving a Link (Inbound)
```
Safari → Share Sheet → Memark
    ↓
Fetching preview... (spinner)
    ↓
Preview appears (image, title, desc)
    ↓
AI categorizes in background
    ↓
"Saved! [Preview Title] saved with preview"
    ↓
View Item → Full preview in ItemDetail
```

### Sharing a Memark (Outbound)
```
ItemDetail → Share Button
    ↓
Format: [Title] [Desc] [URL] via Memark [ref-link]
    ↓
Share to Twitter/Messages/WhatsApp
    ↓
Friend clicks link → Referral tracked
    ↓
Friend signs up → Conversion recorded
    ↓
You earn reward
```

## 🐛 Troubleshooting

### Preview Not Fetching
- Check network connection
- Verify URL is accessible
- Some sites block scraping (use oEmbed when available)
- Twitter requires exact URL format

### Public Profile Not Visible
- Verify `is_public = true` in profiles table
- Check user has Pro subscription
- Ensure items marked public

### Referrals Not Tracking
- Verify URL includes `?ref=` parameter
- Check `referrals` table for entry
- Status should be "pending" until signup

### Icons Wrong Color
- All icons should be #8B5CF6 (purple)
- If multi-colored, check CollectionIcons.tsx
- Verify no hardcoded colors in collection components

## 🎉 Success Metrics

Track these KPIs:
- **Preview Fetch Rate**: % of URLs with successful preview
- **Public Profile Creation**: Pro users with public profiles
- **Referral Clicks**: Inbound traffic from shared links
- **Conversion Rate**: Referrals → Signups
- **Viral Coefficient**: Avg referrals per user
- **Share Rate**: % of items shared outbound

## 🔄 Future Enhancements

### Rich Embeds
- Display Twitter embed HTML directly in ItemDetail
- YouTube player in-app
- TikTok embed support

### Enhanced Previews
- Favicon for domain recognition
- Read time estimates
- Preview expiry/refresh

### Advanced Sharing
- Custom share templates per platform
- Schedule shares for optimal engagement
- Track click-through rates per share

## 📖 Code References

### Key Files
- `supabase/functions/categorize-item/index.ts` - Preview fetch logic
- `components/ItemCard.tsx` - Preview display
- `components/ShareHandler.tsx` - Inbound sharing
- `app/profile/[username].tsx` - Public profile view
- `app/item-detail.tsx` - Outbound sharing
- `lib/supabase.ts` - Item interface with preview fields

### Edge Function APIs
- **Twitter**: `https://publish.twitter.com/oembed`
- **YouTube**: `https://www.youtube.com/oembed`
- **TikTok**: `https://www.tiktok.com/oembed`

---

## ✅ Complete Feature Checklist

- [x] Database schema with preview fields
- [x] Twitter oEmbed integration
- [x] YouTube oEmbed integration
- [x] TikTok oEmbed support
- [x] OG tag parsing for any site
- [x] ItemCard displays previews
- [x] Platform badges (YouTube, Twitter)
- [x] Expandable descriptions
- [x] Haptics on interactions
- [x] Purple collection icons (#8B5CF6)
- [x] Public profile page
- [x] Linktree-style link cards
- [x] Referral tracking system
- [x] Inbound share-sheet integration
- [x] Outbound sharing with referrals
- [x] Pro-only public profiles
- [x] RLS security policies
- [x] Edge function deployed

**Status**: 🚀 **READY FOR PRODUCTION**

# Social Preview Enhancement Guide

## Overview

This guide documents the rich social preview system that provides platform-specific preview cards for Instagram, Facebook, YouTube, TikTok, Vimeo, and X/Twitter.

## Features Implemented

### Platform-Specific Preview Cards

Each major social platform now has a dedicated preview card component that mimics the platform's native design:

#### 1. **InstagramPreviewCard** (`components/InstagramPreviewCard.tsx`)
- Profile picture with fallback to first letter avatar
- Username with "Instagram" badge
- Multi-image carousel support (1, 2, 3, 4+ images)
- Heart, Comment, Send, and Bookmark icons
- Caption with username highlighting
- Instagram's signature clean white design

#### 2. **FacebookPreviewCard** (`components/FacebookPreviewCard.tsx`)
- Profile picture or page icon
- Post text with See More truncation
- Featured image or video with play overlay
- Like, Comment, Share action buttons
- Blue play button for videos matching Facebook's brand

#### 3. **YouTubePreviewCard** (`components/YouTubePreviewCard.tsx`)
- Large 16:9 video thumbnail
- Red YouTube play button overlay
- Channel avatar and name
- Video title in bold
- View count formatting (K/M)
- Duration badge in bottom-right corner
- YouTube red branding

#### 4. **TikTokPreviewCard** (`components/TikTokPreviewCard.tsx`)
- Vertical 9:16 video thumbnail
- Author avatar with TikTok pink border
- Caption with @username highlighting
- Play overlay with TikTok pink branding
- Side action icons (Heart, Comment, Share) with counts
- Like and comment count display

#### 5. **VimeoPreviewCard** (`components/VimeoPreviewCard.tsx`)
- Professional 16:9 video thumbnail
- Blue Vimeo play button overlay
- Creator name and avatar
- Video title and description
- Play count display
- Clean, professional design

#### 6. **TwitterPreviewCard** (`components/TwitterPreviewCard.tsx`)
- Author avatar with fallback
- Tweet text
- Multi-image grid layouts (1, 2, 3, 4+ images)
- Video overlay for media
- Platform badge
- Engagement placeholders

## Routing Logic

The `SocialEmbedCard` component (`components/SocialEmbedCard.tsx`) intelligently routes to the appropriate preview card based on:

1. **Platform Type**: Detected from URL or metadata
2. **Metadata Availability**: og_image, og_title, or og_description must exist
3. **Priority Order**: Platform-specific card → ItemCard fallback

```typescript
if (platformType === 'instagram' && hasMetadata) {
  return <InstagramPreviewCard item={item} onPress={handleDefaultPress} />;
}
```

## Batch Refresh System

### Edge Function: `batch-refresh-previews`

Located at `supabase/functions/batch-refresh-previews/index.ts`, this function:

- Accepts filters: platforms, limit, onlyStale
- Queries items matching criteria
- Calls `fetch-link-metadata` for each item
- Updates database with fresh metadata
- Returns statistics: processed, updated, failed

### CLI Script: `refresh-social-previews.sh`

Run batch refresh operations from the command line:

```bash
# Refresh all social previews
./refresh-social-previews.sh

# Refresh only Instagram and Facebook
./refresh-social-previews.sh --platforms=instagram,facebook

# Refresh only stale previews (>7 days old)
./refresh-social-previews.sh --only-stale

# Limit to 50 items
./refresh-social-previews.sh --limit=50

# Dry run (see what would happen)
./refresh-social-previews.sh --dry-run

# Combine options
./refresh-social-previews.sh --platforms=tiktok,youtube --only-stale --limit=100
```

**Output Example:**
```
=========================================
Social Preview Refresh Script
=========================================
Platforms: instagram,facebook
Only stale: false
Limit: 1000
Dry run: false
=========================================

Starting refresh...

✓ Success!
  Processed: 28
  Updated: 25
  Failed: 3

Message: Refresh complete: 25 embeds updated, 3 failed out of 28 items processed

Errors (showing first 10):
  - Item 123: No metadata returned
  - Item 456: HTTP 404: Not Found

=========================================
Refresh complete!
=========================================
```

## Database Fields Used

Each preview card component relies on these database fields:

### Required Fields
- `platform_type`: Identifies the social platform (instagram, facebook, youtube, etc.)
- `raw_content`: Original content containing the URL

### Metadata Fields
- `og_image`: Primary thumbnail image
- `og_title`: Post/video title
- `og_description`: Post text or video description
- `og_author`: Author name (fallback)
- `author_name`: Platform-specific author name
- `author_avatar`: Author profile picture URL
- `og_type`: Content type (video, article, etc.)

### Enhanced Fields
- `embed_metadata`: JSON containing platform-specific data
  - `carousel_images`: Array of image URLs (Instagram)
  - `video_url`: Direct video URL
  - `like_count`, `comment_count`: Engagement metrics
  - `view_count`: Video views
  - `duration`: Video length
- `video_url`: Direct video URL (alternative field)
- `carousel_images`: Direct carousel array (alternative field)

## Missing Thumbnails

Based on current database analysis:
- **Facebook**: 3 posts missing thumbnails (out of 8)
- **TikTok**: 3 posts missing thumbnails (out of 10)
- **Instagram**: 0 posts missing thumbnails (20 total)
- **YouTube**: 0 posts missing thumbnails (2 total)

Run the refresh script to fetch missing metadata:
```bash
./refresh-social-previews.sh --platforms=facebook,tiktok
```

## Fallback Behavior

Each preview card has built-in fallbacks:

1. **Missing Image**: Shows platform-branded placeholder
2. **Missing Avatar**: Shows first letter of username in colored circle
3. **Missing Author**: Shows "Platform User" default
4. **No Metadata**: Falls back to basic ItemCard component

## Haptic Feedback

All preview cards include haptic feedback on press (mobile only):
```typescript
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

## Theme Integration

All components use the app's theme system:
- `theme.cardBackground`: Card background color
- `theme.border`: Border colors
- `theme.text`: Primary text
- `theme.textSecondary`: Secondary text
- `theme.textTertiary`: Tertiary text (dates, hints)

## Testing

To verify all preview cards render correctly:

1. **Check Feed**: Navigate to Browse tab to see social previews
2. **Inspect Items**: Tap any social post to see rich preview
3. **Test Platforms**: Verify each platform type displays correctly
4. **Check Fallbacks**: Test items with missing metadata

## Troubleshooting

### Preview Not Showing
1. Check if `platform_type` is set correctly
2. Verify at least one metadata field exists (og_image, og_title, og_description)
3. Run refresh script to fetch missing metadata

### Images Not Loading
1. Check if `og_image` URL is valid (not '0' or empty string)
2. Verify URL is accessible (not behind authentication)
3. Check CORS headers if loading from external source

### Refresh Script Fails
1. Verify `.env` file contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check network connection
3. Ensure `fetch-link-metadata` edge function is deployed
4. Review error messages in script output

## Future Enhancements

Potential improvements:
- Swipeable carousels within feed (currently tap to view full)
- Video playback within preview cards
- Live engagement counts (likes, comments)
- Platform-specific animations and transitions
- Cached preview thumbnails for faster loading
- Automatic refresh on app start for stale items

## Notification Fix

The notification subscription cleanup error has been fixed:

**Before (Deprecated API):**
```typescript
Notifications.removeNotificationSubscription(notificationListener.current);
```

**After (Current API):**
```typescript
notificationListener.current.remove();
```

The subscription refs now use proper TypeScript types:
```typescript
const notificationListener = useRef<Notifications.Subscription | undefined>();
```

This prevents the runtime error: `Notifications.removeNotificationSubscription is not a function`.

## Summary

The social preview system now provides a premium, cohesive experience across all major social platforms. Each platform has its own styled component with proper branding, rich layouts, and intelligent fallbacks. The batch refresh system ensures existing items can be updated with missing metadata, and the notification system has been fixed to use the current Expo Notifications API.

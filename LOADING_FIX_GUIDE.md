# Loading Fix Guide

## Issue Fixed

The social preview cards were experiencing "glitchy" loading behavior due to:
1. **Layout shift**: Images loading without reserved space caused cards to jump and resize
2. **No loading indicators**: Users saw blank spaces until images fully loaded
3. **Jarring appearance**: Images appeared instantly without smooth transitions

## Solution Implemented

Added smooth loading states to all social preview cards with three key improvements:

### 1. Skeleton Placeholders
Each card now shows a subtle skeleton placeholder (using theme border color) while the image loads. This:
- Reserves the correct space to prevent layout shift
- Maintains proper aspect ratios before image load
- Provides visual feedback that content is loading

### 2. Fade-In Animations
Images now fade in smoothly using React Native's `Animated` API:
- 300ms fade duration
- Opacity transitions from 0 to 1
- Native driver for optimal performance

### 3. Proper Loading States
Each component tracks loading with:
- `imageLoaded` state to control skeleton visibility
- `fadeAnim` animated value for smooth opacity transition
- `onLoad` handler to trigger animation when image loads

## Components Updated

All six social preview cards now have smooth loading:

### 1. **InstagramPreviewCard**
- Skeleton for square images (aspect ratio 1:1)
- Fades in carousel images
- Maintains card height during load

### 2. **FacebookPreviewCard**
- Skeleton for media images (aspect ratio 1.33:1)
- Smooth transition for post images
- No layout shift on image load

### 3. **YouTubePreviewCard**
- Skeleton for video thumbnails (aspect ratio 16:9)
- Preserves video container dimensions
- Play button overlay stays positioned

### 4. **TikTokPreviewCard**
- Skeleton for vertical videos (aspect ratio 9:16)
- Maintains max height of 500px
- Side action icons stay anchored

### 5. **VimeoPreviewCard**
- Skeleton for professional videos (aspect ratio 16:9)
- Smooth fade for creator content
- Duration badge remains visible

### 6. **TwitterPreviewCard**
- Skeleton for tweet images (fixed 300px height)
- Smooth loading for single images
- Multi-image grids maintain structure

## Technical Implementation

### Code Pattern

Each preview card follows this consistent pattern:

```typescript
// 1. Import Animated
import { Animated } from 'react-native';

// 2. Add state
const [imageLoaded, setImageLoaded] = useState(false);
const [fadeAnim] = useState(new Animated.Value(0));

// 3. Create handler
const handleImageLoad = () => {
  setImageLoaded(true);
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
};

// 4. Render with skeleton and animated image
<View style={styles.container}>
  {!imageLoaded && (
    <View style={[styles.skeleton, { backgroundColor: theme.border }]} />
  )}
  <Animated.Image
    source={{ uri: imageUrl }}
    style={[styles.image, { opacity: fadeAnim }]}
    onLoad={handleImageLoad}
  />
</View>

// 5. Add skeleton style
skeleton: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  aspectRatio: 16 / 9, // Match image aspect ratio
},
```

## Performance Benefits

1. **No layout reflow**: Fixed aspect ratios prevent browser/app reflows
2. **Native animations**: `useNativeDriver: true` runs animations on UI thread
3. **Better UX**: Users see loading feedback instead of blank spaces
4. **Reduced jank**: Smooth 300ms fade feels premium and intentional

## Theme Integration

Skeleton placeholders use `theme.border` color, which automatically adapts to:
- Light mode: Subtle gray placeholder
- Dark mode: Darker gray placeholder
- Always maintains good contrast with card background

## Testing

To verify smooth loading:

1. **Slow Network**: Enable network throttling in dev tools
   - Check that skeleton appears immediately
   - Verify smooth fade-in when image loads
   - Confirm no layout shift

2. **Fast Network**: Normal connection speed
   - Image should still fade in smoothly (not instantly appear)
   - No flashing or jarring transitions

3. **Missing Images**: Invalid URLs or 404s
   - Skeleton remains visible
   - No console errors
   - Card maintains proper dimensions

## Future Enhancements

Potential improvements:
- Progressive JPEG loading
- Blur-up technique (low-res preview → high-res fade)
- Shimmer animation on skeleton
- Retry mechanism for failed loads
- Image caching for faster subsequent loads

## Summary

The loading glitches have been fixed by adding:
✅ Skeleton placeholders to prevent layout shift
✅ Smooth fade-in animations for better UX
✅ Proper loading state management
✅ Consistent aspect ratios across all cards
✅ Theme-aware placeholder colors

All social preview cards now load smoothly with a premium feel!

# Collection Icons Guide

This guide explains the new custom purple line-art SVG icon system for collections in your MeMark app.

## Overview

Collections now use beautiful custom-designed SVG icons instead of emoji, giving your app a consistent, professional look that matches the purple-accented Notion-style design system.

## Available Icons

The following custom SVG icons are available:

### Core Categories

1. **Recipe** (🍴 → Fork Icon)
   - For cooking, recipes, food-related collections
   - Keywords: `recipe`, `recipes`, `cooking`, `food`

2. **Book** (📖 → Book Icon)
   - For articles, reading lists, documentation
   - Keywords: `book`, `books`, `article`, `articles`, `reading`, `read`

3. **Video** (🎬 → Video Camera Icon)
   - For videos, movies, watch lists
   - Keywords: `video`, `videos`, `watch`, `film`, `movies`

4. **Music** (🎵 → Music Note Icon)
   - For songs, playlists, audio content
   - Keywords: `music`, `songs`, `playlist`, `audio`

5. **Art** (🎨 → Palette Icon)
   - For creative work, design, inspiration
   - Keywords: `art`, `design`, `creative`, `inspiration`

6. **Work** (💼 → Briefcase Icon)
   - For business, career, professional items
   - Keywords: `work`, `business`, `career`

7. **Fitness** (🏋️ → Dumbbell Icon)
   - For workouts, exercise, health
   - Keywords: `fitness`, `workout`, `exercise`, `health`

8. **Travel** (✈️ → Plane Icon)
   - For trips, vacation planning
   - Keywords: `travel`, `trips`, `vacation`

9. **Game** (🎮 → Game Controller Icon)
   - For gaming content
   - Keywords: `game`, `games`, `gaming`

10. **Library** (📚 → Library Icon)
    - For general collections
    - Keywords: `library`, `collection`

11. **Favorite** (❤️ → Heart Icon)
    - For liked/favorite items
    - Keywords: `favorite`, `favorites`, `liked`

12. **Shopping** (🛒 → Shopping Cart Icon)
    - For wish lists, shopping
    - Keywords: `shopping`, `shop`, `wishlist`

13. **Home** (🏠 → Home Icon)
    - For personal items
    - Keywords: `home`, `personal`

14. **Folder** (📁 → Folder Icon)
    - Default/fallback icon
    - Keywords: `folder`, `folders`, `default`

## How It Works

### Smart Icon Matching

The system automatically matches collection names to appropriate icons:

```typescript
// If collection name is "Recipes", it will use RecipeIcon (fork)
// If collection name is "Books to Read", it will use BookIcon
// If collection name is "Travel Plans", it will use PlaneIcon
```

The matching is case-insensitive and searches for keywords within the collection name.

### Icon Selection UI

When creating a new collection:

1. **Modal opens** with icon picker
2. **14 icon options** displayed in a grid
3. **Purple highlight** shows selected icon
4. **Border accent** on active selection
5. **All icons** use your theme's primary purple color

### Visual Consistency

All icons:
- **Line-art style** - Clean, minimal strokes
- **Purple color** - Uses theme.primary (#8B5CF6 in light mode)
- **32px size** in folder cards
- **24px size** in icon picker
- **2px stroke width** for clarity
- **Rounded corners** (12px border radius on containers)

## Technical Implementation

### Component Structure

Icons are defined in `/components/CollectionIcons.tsx`:

```typescript
// Each icon is a React component
export const RecipeIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* SVG paths */}
  </Svg>
);
```

### Theme Integration

Icon names and mappings are in `/constants/theme.ts`:

```typescript
export const collectionIconNames = [
  'recipe',
  'book',
  'video',
  // ...
] as const;
```

### Usage in Collections

The `getCollectionIcon` function matches names to icons:

```typescript
const IconComponent = getCollectionIcon(folder.icon || folder.name);
return <IconComponent size={32} color={theme.primary} />;
```

## Customization

### Change Icon Color

Icons automatically use `theme.primary`. To customize:

```typescript
<RecipeIcon size={32} color="#FF6B6B" />
```

### Change Icon Size

```typescript
<RecipeIcon size={24} color={theme.primary} />  // Small
<RecipeIcon size={32} color={theme.primary} />  // Medium (default)
<RecipeIcon size={48} color={theme.primary} />  // Large
```

### Add New Icons

1. **Create SVG component** in `CollectionIcons.tsx`:

```typescript
export const YourIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="..." stroke={color} strokeWidth="2" />
  </Svg>
);
```

2. **Add to icon map**:

```typescript
export const COLLECTION_ICON_MAP: Record<string, any> = {
  yourname: YourIcon,
  // ...
};
```

3. **Add to theme constants**:

```typescript
export const collectionIconNames = [
  'yourname',
  // ...
] as const;
```

4. **Update collections.tsx**:

```typescript
import { YourIcon } from '@/components/CollectionIcons';

const IconMap: Record<string, any> = {
  yourname: YourIcon,
  // ...
};
```

## Migration from Emoji

Old collections with emoji icons will:
1. **Still display** (backward compatible)
2. **Be matched** to SVG icons based on their name
3. **Automatically upgrade** when you view them

Example:
- Old: `icon: '📚'` + `name: 'Books'` → Shows BookIcon
- Old: `icon: '🎮'` + `name: 'Games'` → Shows GameIcon

## Dark Mode Support

Icons automatically adapt to dark mode:
- Light mode: `#8B5CF6` (vibrant purple)
- Dark mode: `#A78BFA` (lighter purple for contrast)
- Blue theme: Uses blue primary color

All controlled by `theme.primary` in your active theme.

## Best Practices

1. **Use descriptive names** - "Workout Routines" instead of "Stuff"
2. **Include keywords** - Name affects which icon is auto-selected
3. **Be specific** - "Video Tutorials" gets video icon, "Tutorials" gets folder icon
4. **Stay consistent** - Use similar naming patterns across collections

## Troubleshooting

**Icon not appearing?**
- Check that `react-native-svg` is installed
- Verify the icon component is imported in collections.tsx

**Wrong icon showing?**
- The name doesn't match any keywords
- Manually select the correct icon when creating the collection

**Icon looks blurry?**
- Ensure proper size prop is passed
- Check that viewBox is "0 0 24 24"

**Color not matching theme?**
- Verify you're passing `theme.primary` as the color prop
- Check theme definitions in `constants/theme.ts`

## Future Enhancements

Potential additions:
- More icon options (code, health, education, etc.)
- Custom icon upload
- Icon color customization per collection
- Animated icon transitions
- Icon badge overlays

---

Enjoy your beautiful, cohesive icon system!

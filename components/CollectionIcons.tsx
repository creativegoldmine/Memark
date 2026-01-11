import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { View } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
}

export const RecipeIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 2L6 8M10 2L10 8M14 2L14 14M18 2L18 8M6 8C6 10.209 7.791 12 10 12C12.209 12 14 10.209 14 8M14 22C14 22 18 20 18 14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BookIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 3H20V21H6.5C5.837 21 5.201 20.737 4.732 20.268C4.263 19.799 4 19.163 4 18.5V5.5C4 4.837 4.263 4.201 4.732 3.732C5.201 3.263 5.837 3 6.5 3Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const VideoIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 7L16 12L23 17V7Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="1"
      y="5"
      width="15"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const MusicIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18V5L21 3V16"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="6"
      cy="18"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="18"
      cy="16"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PaletteIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C10.0222 2 8.08879 2.58649 6.4443 3.6853C4.79981 4.78412 3.51809 6.3459 2.76121 8.17316C2.00433 10.0004 1.8063 12.0111 2.19215 13.9509C2.578 15.8907 3.53041 17.6725 4.92894 19.0711C6.32746 20.4696 8.10929 21.422 10.0491 21.8078C11.9889 22.1937 13.9996 21.9957 15.8268 21.2388C17.6541 20.4819 19.2159 19.2002 20.3147 17.5557C21.4135 15.9112 22 13.9778 22 12C22 10.6868 21.7413 9.38642 21.2388 8.17316C20.7362 6.95991 19.9997 5.85752 19.0711 4.92893C18.1425 4.00035 17.0401 3.26375 15.8268 2.7612C14.6136 2.25866 13.3132 2 12 2V2Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="8" cy="12" r="1" fill={color} />
    <Circle cx="12" cy="8" r="1" fill={color} />
    <Circle cx="16" cy="12" r="1" fill={color} />
    <Circle cx="12" cy="16" r="1" fill={color} />
  </Svg>
);

export const BriefcaseIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="7"
      width="20"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const DumbbellIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.4 14.4L9.6 9.6M18.657 21.343C19.219 20.781 20 19.949 20 18.5C20 17.051 19.219 16.219 18.657 15.657C18.095 15.095 17.263 14.314 15.814 14.314C14.365 14.314 13.533 15.095 12.971 15.657L8.343 11.029C8.905 10.467 9.686 9.635 9.686 8.186C9.686 6.737 8.905 5.905 8.343 5.343C7.781 4.781 6.949 4 5.5 4C4.051 4 3.219 4.781 2.657 5.343C2.095 5.905 1.314 6.737 1.314 8.186C1.314 9.635 2.095 10.467 2.657 11.029C3.219 11.591 4.051 12.372 5.5 12.372C6.949 12.372 7.781 11.591 8.343 11.029L12.971 15.657C12.409 16.219 11.628 17.051 11.628 18.5C11.628 19.949 12.409 20.781 12.971 21.343C13.533 21.905 14.365 22.686 15.814 22.686C17.263 22.686 18.095 21.905 18.657 21.343Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlaneIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 16V14L13 9V3.5C13 2.837 12.737 2.201 12.268 1.732C11.799 1.263 11.163 1 10.5 1C9.837 1 9.201 1.263 8.732 1.732C8.263 2.201 8 2.837 8 3.5V9L0 14V16L8 13.5V19L6 20.5V22L10.5 21L15 22V20.5L13 19V13.5L21 16Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const GameIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 11.5H9M7.5 10V13"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="15.5" cy="11.5" r="1" fill={color} />
    <Circle cx="18.5" cy="9.5" r="1" fill={color} />
    <Path
      d="M20 7H4C2.895 7 2 7.895 2 9V15C2 16.105 2.895 17 4 17H6L7 21H9L10 17H14L15 21H17L18 17H20C21.105 17 22 16.105 22 15V9C22 7.895 21.105 7 20 7Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const FolderIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const OpenFolderIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 19L4.414 13.414C4.789 12.663 5.598 12.174 6.5 12.174H23L20.586 17.586C20.211 18.337 19.402 18.826 18.5 18.826H2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const LibraryIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 19.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V19.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Line x1="8" y1="6" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <Line x1="8" y1="14" x2="12" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </Svg>
);

export const HeartIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.998 16.95 2.998C16.2275 2.998 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.452 9.22248 22.452 8.5C22.452 7.77752 22.3095 7.06211 22.0329 6.39464C21.7564 5.72718 21.351 5.12084 20.84 4.61Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ShoppingIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="21" r="1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="20" cy="21" r="1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <Path
      d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const HomeIcon = ({ size = 32, color = '#8B5CF6' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V9H3Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const COLLECTION_ICON_MAP: Record<string, any> = {
  recipe: RecipeIcon,
  recipes: RecipeIcon,
  cooking: RecipeIcon,
  food: RecipeIcon,

  book: BookIcon,
  books: BookIcon,
  article: BookIcon,
  articles: BookIcon,
  reading: BookIcon,
  read: BookIcon,

  video: VideoIcon,
  videos: VideoIcon,
  watch: VideoIcon,
  film: VideoIcon,
  movies: VideoIcon,

  music: MusicIcon,
  songs: MusicIcon,
  playlist: MusicIcon,
  audio: MusicIcon,

  art: PaletteIcon,
  design: PaletteIcon,
  creative: PaletteIcon,
  inspiration: PaletteIcon,

  work: BriefcaseIcon,
  business: BriefcaseIcon,
  career: BriefcaseIcon,

  fitness: DumbbellIcon,
  workout: DumbbellIcon,
  exercise: DumbbellIcon,
  health: DumbbellIcon,

  travel: PlaneIcon,
  trips: PlaneIcon,
  vacation: PlaneIcon,

  game: GameIcon,
  games: GameIcon,
  gaming: GameIcon,

  folder: FolderIcon,
  folders: FolderIcon,
  default: FolderIcon,

  library: LibraryIcon,
  collection: LibraryIcon,

  favorite: HeartIcon,
  favorites: HeartIcon,
  liked: HeartIcon,

  shopping: ShoppingIcon,
  shop: ShoppingIcon,
  wishlist: ShoppingIcon,

  home: HomeIcon,
  personal: HomeIcon,
};

export function getCollectionIcon(name: string): any {
  const normalizedName = name.toLowerCase().trim();

  for (const [key, IconComponent] of Object.entries(COLLECTION_ICON_MAP)) {
    if (normalizedName.includes(key)) {
      return IconComponent;
    }
  }

  return FolderIcon;
}

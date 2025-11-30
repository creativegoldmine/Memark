# MeMark / MeSend

A Personal Inbound Knowledge Manager (PIKM) that allows users to send links, videos, screenshots, notes, or any content to themselves by texting or sharing to a universal "Me" number. The system uses AI to organize, categorize, summarize, and help users review their content.

## Features

### Core Functionality
- **Universal Inbox**: Send content via SMS or share sheet to one universal number
- **AI Organization**: Automatic categorization, summarization, and tagging
- **Smart Collections**: Auto-generated and manual collections to organize content
- **Today Feed**: Beautiful dashboard showing today's captures, videos, articles, and more
- **Spaced Repetition**: Review system that surfaces content at optimal intervals
- **Multi-View Modes**: List, Grid, Kanban, and Carousel views
- **Powerful Search**: Search across titles, summaries, tags, and content
- **Theme Modes**: Light, Dark, and MeMark Purple themes

### Content Types Supported
- Articles
- Videos (YouTube, TikTok, Vimeo)
- Notes
- Screenshots
- Tasks
- Links
- Text messages

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **SMS Integration**: Twilio (webhook endpoint ready)
- **AI Processing**: Custom categorization pipeline
- **Authentication**: Supabase Auth with email/password

## Project Structure

```
├── app/                        # Expo Router screens
│   ├── (tabs)/                # Main tab navigation
│   │   ├── index.tsx          # Home/Today Feed
│   │   ├── collections.tsx    # Collections view
│   │   ├── search.tsx         # Search & filters
│   │   └── profile.tsx        # Profile & settings
│   ├── welcome.tsx            # Welcome screen
│   ├── signup.tsx             # User registration
│   ├── login.tsx              # User login
│   └── onboarding.tsx         # First-time user flow
├── components/                 # Reusable components
│   └── ItemCard.tsx           # Content item card
├── contexts/                   # React contexts
│   ├── AuthContext.tsx        # Authentication state
│   └── ThemeContext.tsx       # Theme management
├── lib/                        # Utilities
│   └── supabase.ts            # Supabase client & types
├── constants/                  # Constants
│   └── theme.ts               # Theme definitions
└── supabase/                   # Supabase backend
    └── functions/              # Edge functions
        ├── sms-webhook/       # Twilio SMS handler
        └── categorize-item/   # AI categorization
```

## Database Schema

### Tables

#### users
- User account information
- Phone number (for SMS identification)
- Email, name, avatar
- Plan type

#### items
- All saved content
- Type, title, summary, tags
- Category, score, status
- Review stage & next review date

#### collections
- User-created or AI-generated collections
- Name, icon, color, description
- Auto-generated flag

#### collection_items
- Many-to-many relationship between items and collections

#### ai_event_log
- Tracks all AI operations for analytics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account
- Twilio account (for SMS)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already configured in `.env`

3. Database migrations are already applied

### Running the App

#### Web (Development)
```bash
npm run dev
```

Then press `w` to open in web browser.

#### Build for Web
```bash
npm run build:web
```

### Deploying Edge Functions

The SMS webhook and AI categorization functions are already created in `supabase/functions/`. To deploy them:

1. Install Supabase CLI
2. Link your project
3. Deploy functions:
```bash
supabase functions deploy sms-webhook
supabase functions deploy categorize-item
```

## Twilio SMS Setup

### 1. Get a Twilio Number
- Sign up at twilio.com
- Purchase a phone number with SMS capabilities

### 2. Configure Webhook
- In Twilio console, configure your number's SMS webhook to:
```
https://[your-supabase-url]/functions/v1/sms-webhook
```

### 3. Test SMS Integration
- Send a text message to your Twilio number
- Content will be received, processed by AI, and appear in the app

## How It Works

### SMS Flow
1. User texts content to the Twilio number
2. Twilio sends webhook to `sms-webhook` edge function
3. Function identifies user by phone number
4. Creates new item in database
5. Triggers AI categorization
6. Item appears in user's Today Feed

### AI Categorization
1. Detects content type (video, article, note, etc.)
2. Generates human-friendly title
3. Creates 1-3 sentence summary
4. Assigns relevant tags
5. Places in appropriate category
6. Calculates relevance score (0-100)
7. Schedules for review

### Spaced Repetition
- Stage 1: Review in 1 day
- Stage 2: Review in 3 days
- Stage 3: Review in 7 days
- Stage 4: Review in 14 days
- Stage 5: Review in 30 days

## Default Collections

Each new user automatically gets these Smart Collections:
- 🎥 Videos to Watch
- 📰 Articles to Read
- 💼 Work
- 🏠 Personal
- ✨ Inspiration
- 💰 Finance
- 📚 Learning

## Theme Customization

The app includes three themes:
- **Light**: Clean, professional look
- **Dark**: Easy on the eyes
- **MeMark Purple**: Brand signature theme with purple gradients

Users can switch themes in Profile → Theme settings.

## Authentication

- Email/password authentication via Supabase Auth
- Phone number required for SMS identification
- Automatic profile creation on signup
- Default collections created via database trigger

## API Endpoints

### SMS Webhook
```
POST /functions/v1/sms-webhook
```
Receives SMS from Twilio and creates items.

### AI Categorization
```
POST /functions/v1/categorize-item
```
Processes and categorizes content using AI.

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Authenticated access required
- SMS webhook validates user by phone number
- Edge functions use service role key securely

## Roadmap

### Phase 1 (Complete)
- ✅ User authentication
- ✅ SMS ingestion
- ✅ AI categorization
- ✅ Today Feed dashboard
- ✅ Collections
- ✅ Search functionality
- ✅ Theme system

### Phase 2 (Next)
- Multi-view modes (List, Grid, Kanban, Carousel)
- Item detail viewers with media playback
- Review system with notifications
- Share sheet extension for mobile
- Daily/weekly review flows

### Phase 3 (Future)
- Browser extension
- Email-to-MeMark
- Advanced AI insights
- Collaboration features
- Mobile app (iOS/Android via Expo)

## Contributing

This is a private project for MeMark/MeSend.

## License

Proprietary - All Rights Reserved

## Support

For questions or issues, contact the development team.

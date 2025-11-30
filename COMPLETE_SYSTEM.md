# MeMark - Complete System Overview

## The Vision

MeMark is your **Personal Inbound Knowledge Manager** - a mobile app where you save ANYTHING you want to remember, and AI automatically organizes, categorizes, and helps you find it later.

---

## TWO WAYS TO SAVE CONTENT

### 1. iOS Share Sheet (PRIMARY METHOD) ✨
**Most Important for Mobile Users**

```
User browsing Safari → Tap Share → "MeMark" → Content instantly saved
User on YouTube → Share button → "MeMark" → Video saved to "Videos to Watch"
User reading article → Share → "MeMark" → Auto-categorized to "Articles to Read"
```

**How it works:**
- User taps iOS Share button anywhere in iOS
- MeMark appears in share sheet
- Deep link opens: `memark://share?url=https://example.com`
- App receives link, creates item, AI categorizes
- User sees confirmation: "Saved to MeMark!"
- Returns to previous app

**Implementation:**
- File: `/app/share.tsx` - Handles incoming shares
- URL scheme: `memark://` configured in `app.json`
- Works with: URLs, text, images, files

### 2. SMS to MeMark Number (SECONDARY METHOD)
**For when share sheet isn't available**

```
User texts: "https://youtube.com/watch?v=abc"
To: +1 (555) 123-4567 (shared MeMark number)
System identifies by sender's phone number
Content saved & categorized
```

**How it works:**
- User registered phone: `+1 (555) 987-6543`
- Texts shared MeMark number
- Twilio webhook identifies sender
- Finds user in database by phone
- Creates item, AI categorizes
- User sees it in app feed

---

## THE AI-POWERED EXPERIENCE

### 1. Smart Auto-Organization

**When content arrives (via share OR SMS):**

#### Step 1: Link Metadata Extraction
```javascript
// Fetches Open Graph data
{
  title: "How to Build Better Apps",
  description: "A comprehensive guide...",
  image: "https://example.com/og-image.jpg",
  type: "article"
}
```

#### Step 2: AI Categorization (GPT-4o-mini)
```javascript
{
  type: "article",
  title: "How to Build Better Apps",
  summary: "A comprehensive guide covering architecture...",
  tags: ["tech", "learning", "programming"],
  category: "Learning"
}
```

#### Step 3: Auto-Collection Assignment
```
Matched collections:
✓ "Articles to Read" (type: article)
✓ "Learning" (category: Learning)
✓ "Tech" (tag: tech)

→ Item appears in all 3 collections automatically!
```

### 2. Smart Collections (Auto-Created on Signup)

Every user gets 7 default collections:

1. **Videos to Watch** 🎥
   - Auto-fills with: YouTube, Vimeo, TikTok
   - Smart sorting by score

2. **Articles to Read** 📰
   - Auto-fills with: Blog posts, news, essays
   - Reading time estimates

3. **Work** 💼
   - Auto-fills with: Work-related keywords
   - Priority sorting

4. **Personal** 👤
   - Auto-fills with: Personal life content
   - Timeline view

5. **Learning** 🎓
   - Auto-fills with: Courses, tutorials, educational
   - Progress tracking

6. **Finance** 💰
   - Auto-fills with: Stocks, crypto, budgeting
   - Important links

7. **Inspiration** ✨
   - Auto-fills with: Creative, design, ideas
   - Mood board style

**Users can also create custom collections!**

### 3. The Feed - Smart Content Presentation

#### Home Tab:
```
┌─────────────────────────────────────┐
│  Today's Stats                      │
│  📥 5 captures  ⏰ 3 to review      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Today's Items                      │
│  ┌───────────────────────────────┐  │
│  │ [Preview Image]               │  │
│  │ How to Build Better Apps      │  │
│  │ Learning • Article • 2h ago   │  │
│  │ #tech #programming            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Videos to Watch (3)                │
│  [Beautiful card previews...]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Articles to Read (7)               │
│  [Rich previews with images...]     │
└─────────────────────────────────────┘
```

**Each card shows:**
- 🖼️ Open Graph preview image
- 📝 AI-generated title (or extracted)
- 📄 AI summary (first 200 chars)
- 🏷️ Tags & category chip
- ⏱️ Time saved ("2h ago")
- 📊 Relevance score bar

### 4. AI Search - Conversational Finding

**Tab 3: AI Search** (with Sparkles ✨ icon)

```
User: "I sent a link about vibe coding, it was a course to learn, help me find it"

AI: "I found 2 learning items matching your search:"

┌─────────────────────────────────────┐
│  Vibecamp Coding Course             │
│  Complete guide to vibe-driven dev  │
│  Learning • Video • 3 days ago      │
│  #coding #learning #course          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  The Art of Coding with Flow        │
│  Discover the vibe coding mindset   │
│  Learning • Article • 1 week ago    │
│  #programming #productivity         │
└─────────────────────────────────────┘
```

**How AI Search Works:**
1. User types natural language query
2. AI searches across: titles, summaries, tags, categories, raw content
3. Semantic matching using keywords
4. Returns ranked results with context
5. Shows actual item cards (tappable)

**Example Queries:**
- "Show me articles about design"
- "What videos did I save last week?"
- "Find that link about productivity"
- "Show me everything tagged 'learning'"
- "What did I save from YouTube?"

---

## THE TECHNICAL STACK

### Frontend (React Native + Expo)
```
app/
├── (tabs)/
│   ├── index.tsx          # Home feed with smart content
│   ├── collections.tsx    # Collection browser with counts
│   ├── ai-search.tsx      # Conversational AI search
│   ├── search.tsx         # Traditional search
│   └── profile.tsx        # Settings, import, phone number
├── share.tsx              # iOS Share Sheet handler
├── login.tsx              # Auth
└── signup.tsx             # Onboarding with phone
```

### Backend (Supabase Edge Functions)
```
supabase/functions/
├── sms-webhook/           # Twilio SMS handler
│   └── Identifies user by phone
├── categorize-item/       # AI categorization
│   ├── Fetches link metadata
│   ├── Calls OpenAI GPT-4o-mini
│   └── Auto-assigns to collections
└── import-bookmarks/      # Bulk import
    └── JSON array of bookmarks
```

### Database (Postgres + RLS)
```sql
users
├── id (uuid)
├── phone_number (unique) ← User identifier
├── email
├── name
└── plan_type

items
├── id (uuid)
├── user_id → users.id
├── raw_content (text)
├── type (article|video|note|task...)
├── title (AI-generated or extracted)
├── summary (AI-generated)
├── tags (text[])
├── category (Work|Personal|Learning...)
├── image_preview (Open Graph image)
├── score (0-100 relevance)
└── status (active|archived|done)

collections
├── id (uuid)
├── user_id → users.id
├── name ("Videos to Watch")
├── icon ("🎥")
├── color ("#3B82F6")
└── auto_generated (boolean)

collection_items
├── collection_id → collections.id
├── item_id → items.id
└── added_at
```

---

## THE USER JOURNEY

### 1. New User Onboarding

```
Step 1: Download MeMark from App Store
Step 2: Sign up (name, email, phone, password)
Step 3: 7 Smart Collections auto-created
Step 4: Tutorial: "Tap share on anything to save it"
Step 5: User sees MeMark number for SMS option
```

### 2. Daily Usage - Share Sheet

```
Morning:
├─ Reading newsletter → Share to MeMark
├─ AI: Saved to "Articles to Read"
└─ Preview with image shows in feed

Lunch:
├─ YouTube video about cooking → Share to MeMark
├─ AI: Saved to "Videos to Watch" + "Food"
└─ Rich preview with thumbnail

Evening:
├─ Browse Home feed
├─ Tap article → Opens in browser
├─ Mark as "Done" → Moves to archive
└─ Stats: "5 items captured today!"
```

### 3. Finding Content Later

**Scenario 1: Browse by Collection**
```
User: Opens "Collections" tab
User: Taps "Learning"
App: Shows 23 items sorted by date
User: Scrolls, finds that coding course
User: Taps to open link
```

**Scenario 2: AI Search**
```
User: Opens "AI" tab
User: Types "find that coding course"
AI: "I found 2 learning items matching..."
User: Taps first result
App: Opens course link
```

**Scenario 3: Traditional Search**
```
User: Opens "Search" tab
User: Types "vibe coding"
App: Instant results filtering by keyword
User: Selects item
```

---

## KEY FEATURES BREAKDOWN

### ✨ AI-Powered Intelligence

1. **Smart Categorization**
   - Detects content type (video, article, note)
   - Extracts meaningful title
   - Generates concise summary
   - Assigns relevant tags
   - Picks best category

2. **Auto-Collection Assignment**
   - Matches content to existing collections
   - Based on type, category, tags, keywords
   - One item can be in multiple collections
   - No manual organization needed

3. **Link Enrichment**
   - Fetches Open Graph metadata
   - Extracts preview images
   - Gets real titles from pages
   - Captures descriptions
   - Works with any website

4. **Conversational Search**
   - Natural language queries
   - Semantic understanding
   - Context-aware results
   - Instant item previews

### 📱 Mobile-First Experience

1. **iOS Share Sheet Integration**
   - Works from any app
   - Safari, YouTube, Twitter, etc.
   - One tap to save
   - Seamless UX

2. **Beautiful UI**
   - Blue ocean theme (calming)
   - Rich card previews
   - Smooth animations
   - Intuitive navigation

3. **Offline-First** (future)
   - Cache items locally
   - Search works offline
   - Sync when online

### 🔐 Privacy & Security

1. **Data Isolation**
   - Row Level Security (RLS)
   - Users only see their content
   - Phone number as identifier
   - End-to-end secure

2. **No Data Selling**
   - Your content stays private
   - AI processes locally (Supabase)
   - No third-party tracking

---

## PREMIUM FEATURES (Future)

### Free Tier
- Unlimited items via share sheet
- 100 SMS per month
- 7 Smart Collections
- AI search
- 1GB storage

### Pro Tier ($4.99/month)
- Everything in Free
- Unlimited SMS
- Unlimited collections
- Advanced AI features
- 10GB storage
- Export to Notion/Obsidian

### Premium Tier ($14.99/month)
- Everything in Pro
- **Dedicated SMS number** (your own!)
- Priority AI processing
- Advanced analytics
- Team sharing
- 100GB storage

---

## DEPLOYMENT CHECKLIST

### Phase 1: MVP (Current)
- ✅ Database schema with RLS
- ✅ User authentication
- ✅ Smart Collections auto-creation
- ✅ AI categorization
- ✅ Link metadata extraction
- ✅ Home feed
- ✅ Collections browser
- ✅ AI search
- ✅ Profile/settings
- ✅ Bookmark import
- ✅ iOS Share Sheet handler
- ✅ SMS webhook

### Phase 2: iOS App Store
- [ ] Add native iOS Share Extension
- [ ] TestFlight beta testing
- [ ] App Store submission
- [ ] Marketing assets
- [ ] Landing page

### Phase 3: Enhanced Features
- [ ] Item detail view (edit, delete, move)
- [ ] Manual collection management
- [ ] Spaced repetition review system
- [ ] Export functionality
- [ ] Dark mode polish
- [ ] Search filters

### Phase 4: Premium Features
- [ ] Stripe integration
- [ ] Dedicated Twilio numbers
- [ ] Team sharing
- [ ] Advanced AI (RAG, embeddings)
- [ ] Browser extension

---

## HOW TO TEST

### Test Share Sheet (Development)
```bash
# Build iOS app
npx expo prebuild --platform ios
cd ios && pod install
# Open in Xcode
open memark.xcworkspace
# Run on simulator
# Test share from Safari
```

### Test SMS Flow
```bash
# 1. Get Twilio number
# 2. Configure webhook
# 3. Text from registered phone
# 4. Check app feed
```

### Test AI Search
```bash
# 1. Save multiple items via share
# 2. Open AI tab
# 3. Ask: "Find articles about design"
# 4. Verify results
```

---

## COMPETITIVE ADVANTAGES

**vs. Pocket/Instapaper:**
- ✅ AI auto-organization (no manual tagging)
- ✅ Conversational search
- ✅ Multiple save methods (share + SMS)
- ✅ Rich previews with AI summaries

**vs. Notion/Obsidian:**
- ✅ Frictionless saving (one tap)
- ✅ Mobile-first design
- ✅ AI does the organization
- ✅ No manual note-taking needed

**vs. Apple Notes/Google Keep:**
- ✅ Smart categorization
- ✅ Collection auto-assignment
- ✅ AI-powered search
- ✅ Rich link previews

---

## THE VISION REALIZED

MeMark is your **second brain** that:
- 🧠 Remembers everything you share
- 🤖 Organizes it automatically
- 🔍 Helps you find it instantly
- 📱 Works seamlessly on mobile
- ✨ Powered by AI, not rules

**No folders to manage. No tags to add. No thinking required.**

Just share it to MeMark, and forget about it. When you need it, ask the AI or browse your smart collections. It's all there, beautifully organized.

---

**Status**: Ready for iOS development and Twilio integration!

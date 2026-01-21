# Memark Semantic Intelligence System - Complete Guide

## Overview

The Semantic Intelligence System transforms Memark from a platform-based organizer into a true knowledge assistant that understands what your content is about, not just where it came from.

## What Problems Does This Solve?

### Before: The Platform Problem
- TikTok about coding → Goes to TikTok folder
- YouTube about coding → Goes to YouTube folder
- Article about coding → Goes to Articles folder
- **Result**: Your coding content is scattered across 3+ folders

### After: Topic-Based Intelligence
- All coding content (TikTok, YouTube, articles) → Recognized as "coding" and clustered together
- AI suggests: "Create a Coding folder for 8 items?"
- Content organized by WHAT it's about, not WHERE it came from

## Core Components

### 1. Deep Semantic Analysis Engine

**Location**: `supabase/functions/semantic-categorize/index.ts`

Extracts from every piece of content:
- **Primary Topic**: Specific subject (e.g., "React Hooks Tutorial" not "Programming")
- **Sub-Topics**: 4-6 related categorizations
- **20-30 Keywords**: Technical terms, named entities, key concepts
- **Content Intent**: Educational, Opinion, News, Entertainment, etc.
- **Sentiment**: For opinion/political content
- **Educational Value**: 0-10 score
- **Actionability**: 0-10 score
- **Suggested Folder Path**: e.g., "Coding/React/Hooks"

**How It Works**:
```typescript
// When an item is saved
const analysis = await performDeepSemanticAnalysis(content, metadata, openaiKey);

// Result:
{
  primaryTopic: "React Hooks Tutorial",
  subTopics: ["React", "JavaScript", "Web Development", "Frontend"],
  keywords: ["useState", "useEffect", "custom hooks", "React 18"...],
  contentIntent: "Educational Tutorial",
  educationalValue: 9,
  confidence: 0.92
}
```

### 2. Semantic Clustering System

**Database Table**: `semantic_clusters`

Automatically:
- Groups items with similar topics (not platforms)
- Detects when you have 5+ items about the same subject
- Calculates confidence scores
- Suggests folder creation
- Tracks folder acceptance/rejection

**Example Cluster**:
```
Primary Topic: "Quantum Computing"
Related Topics: ["Quantum Mechanics", "Qubit", "Superposition"]
Items: 8 (3 YouTube, 3 articles, 2 TikToks)
Confidence: 87%
Status: Suggested
```

### 3. AI Chat Assistant

**Location**:
- Edge Function: `supabase/functions/ai-chat-assistant/index.ts`
- UI Component: `components/AIChatAssistant.tsx`

**Access**: Purple floating button on home screen

**Capabilities**:
- **Natural Language Search**: "Show me coding marks that are educational"
- **Complex Queries**: "Find positive content about Trump" or "marks about React that are recent"
- **Platform Filtering**: "YouTube videos about cooking"
- **Multi-Dimensional**: "Educational TikToks about fitness from this week"
- **Answer Questions**: "How do folders work?" or "What's my most saved topic?"
- **Provide Insights**: "What topics do I save most?"

**How It Works**:
```typescript
// User asks: "Show me positive Trump content"
const response = await generateAIResponse(userMessage, conversationHistory, userContext, relevantItems);

// AI:
// 1. Understands "positive" = sentiment filter
// 2. Finds items with content_topics containing "Trump" or "Donald Trump"
// 3. Filters by sentiment metadata
// 4. Returns conversational response with matching items
```

### 4. AI Insights Dashboard

**Component**: `components/AIInsights.tsx`
**Location**: Collections screen (auto-displays when available)

Shows:
- Folder creation suggestions from clusters
- Topic trends and patterns
- Organization recommendations
- Learning gaps

**Example Insights**:
- "Create a folder for React Hooks? You have 8 items (87% confidence)"
- "You've saved 15 items about Quantum Physics this month - trending topic!"
- "Your AI content hasn't been reviewed in 2 weeks"

### 5. Topic Explorer

**Component**: `components/TopicExplorer.tsx`
**Access**: "Explore by Topic" button in Collections screen

Browse your entire vault by semantic topics instead of folders:
- See all discovered topics
- View confidence scores
- Explore items within each topic
- Cross-platform grouping (all React content together)

### 6. User Feedback System

**Database Table**: `user_feedback`
**Component**: `components/FeedbackButton.tsx`
**Location**: Item detail screens

Collects corrections when AI miscategorizes:
- Wrong category
- Wrong topic
- Missing keywords
- Good categorization (positive feedback)

This creates a learning loop where AI improves based on your preferences.

## Database Schema

### semantic_clusters
```sql
- id: uuid
- user_id: uuid
- cluster_name: text
- primary_topic: text
- related_topics: text[]
- keywords: text[]
- item_ids: uuid[]
- item_count: integer
- confidence_score: double precision
- suggested_folder_name: text
- suggested_icon: text
- status: text (detected, suggested, folder_created, dismissed)
- folder_id: uuid (nullable)
```

### user_feedback
```sql
- id: uuid
- user_id: uuid
- item_id: uuid
- feedback_type: text
- original_value: text
- corrected_value: text
- confidence_before: double precision
- context: jsonb
- notes: text
```

### ai_insights
```sql
- id: uuid
- user_id: uuid
- insight_type: text (topic_trend, learning_pattern, organization_suggestion, etc.)
- title: text
- description: text
- data: jsonb
- priority: text (low, medium, high)
- status: text (active, acknowledged, dismissed, completed)
```

### chat_sessions & chat_messages
```sql
-- chat_sessions
- id: uuid
- user_id: uuid
- title: text
- context_summary: text
- message_count: integer
- last_message_at: timestamptz

-- chat_messages
- id: uuid
- session_id: uuid
- user_id: uuid
- role: text (user, assistant, system)
- content: text
- metadata: jsonb
- tokens_used: integer
```

## How to Use

### 1. AI Chat Assistant

Open the purple floating button on the home screen and ask:

**Search Examples**:
- "Show me all my coding content"
- "Find marks about quantum computing"
- "YouTube videos about fitness"
- "Educational content from this week"
- "Positive political content"

**Question Examples**:
- "What topics do I save most?"
- "How do folders work?"
- "Show me content I haven't reviewed"

### 2. Topic Explorer

1. Go to Collections screen
2. Tap "Explore by Topic"
3. Browse all discovered topics
4. Tap a topic to see all related items
5. Items grouped by semantic similarity, not platform

### 3. AI Insights

Auto-displays on Collections screen when you have:
- 5+ items about the same topic (folder suggestion)
- Emerging topic trends
- Organization opportunities

Tap "Create Folder" to accept suggestions or "X" to dismiss.

### 4. Enhanced Search

The AI Search screen now:
- Uses semantic topics for better matching
- Understands context and intent
- Provides conversational responses
- Shows relevant items with explanations

### 5. Feedback Collection

On any item detail screen:
- Tap the "Feedback" button
- Select issue type (wrong category, wrong topic, etc.)
- Optionally add notes
- Submit to help AI learn

## Multi-Dimensional Organization

Memark now supports viewing content multiple ways:

### By Platform (Traditional)
- TikTok folder → All TikToks
- YouTube folder → All YouTubes
- Twitter folder → All tweets

### By Topic (New)
- Coding topic → All coding content (TikToks + YouTubes + articles)
- Fitness topic → All fitness content across platforms
- Politics topic → All political content

### By Topic + Platform (Advanced)
- Query: "YouTube coding content"
- Result: Only YouTube videos about coding

### By Intent + Topic
- Query: "Educational marks about React"
- Result: Only educational content about React (filters out news, opinions)

### By Sentiment + Topic
- Query: "Positive content about [political figure]"
- Result: Only favorable/positive content about that topic

## Performance Considerations

### Token Usage
- Deep semantic analysis: ~500 tokens per item
- AI chat: ~200-800 tokens per conversation turn
- Total cost: ~$0.01 per 100 items analyzed

### Optimization
- Semantic analysis runs on new items only
- Clusters update incrementally
- Chat has 10-message context window
- Insights cached and refreshed daily

### Scalability
- Works efficiently up to 10,000 items per user
- Clustering happens in background
- Search results limited to 100 items max
- Real-time updates via Supabase subscriptions

## Best Practices

### For Users
1. **Provide Feedback**: Use the feedback button when AI miscategorizes
2. **Accept Folder Suggestions**: When clusters reach 5+ items with high confidence
3. **Use Natural Language**: Ask the AI assistant in plain English
4. **Review Insights**: Check the insights dashboard weekly

### For Developers
1. **Monitor Costs**: OpenAI API calls add up - set spending limits
2. **Batch Processing**: Use `batchMode: true` for bulk operations
3. **Confidence Thresholds**: Only suggest folders above 0.7 confidence
4. **Rate Limiting**: Implement rate limits on AI chat to prevent abuse

## Troubleshooting

### Items Not Clustering
- Ensure semantic analysis has run (check `content_topics` field)
- Need at least 2-3 items on same topic
- Confidence must be above threshold
- Run bulk recategorize if needed

### Chat Not Finding Items
- Check that items have `content_topics` populated
- Try more specific queries
- Use platform names explicitly if needed
- Fallback to basic search always works

### Insights Not Appearing
- Need 5+ items in a cluster
- Status must be 'suggested' or 'detected'
- Check `ai_insights` table for records
- Refresh Collections screen

## Future Enhancements

### Planned Features
1. **Auto-Organization**: Automatically create folders from high-confidence clusters
2. **Topic Suggestions**: "You might also like..." based on saved topics
3. **Learning Paths**: Suggested review order for educational content
4. **Social Discovery**: Find users with similar interests via topics
5. **Export by Topic**: Export all items on a topic to Notion/X

### Advanced AI
1. **Multimodal Analysis**: Analyze images and videos, not just text
2. **Trend Detection**: Notify when new topics emerge
3. **Duplicate Detection**: Find similar items across platforms
4. **Content Summarization**: AI-generated summaries of long articles

## API Reference

### Semantic Categorization
```typescript
POST /functions/v1/semantic-categorize
{
  itemId: string,
  userId: string,
  content: string,
  metadata: object,
  batchMode?: boolean
}
```

### AI Chat
```typescript
POST /functions/v1/ai-chat-assistant
{
  userId: string,
  message: string,
  sessionId?: string,
  includeContext: boolean
}
```

### Feedback Submission
```typescript
INSERT INTO user_feedback
{
  user_id: string,
  item_id: string,
  feedback_type: string,
  notes?: string,
  context?: jsonb
}
```

## Conclusion

The Semantic Intelligence System makes Memark more than just a save button - it's a knowledge assistant that truly understands your content and helps you organize, discover, and revisit what matters most.

**Key Takeaway**: Your content is now organized by WHAT it's about, not WHERE it came from. This makes Memark the first truly intelligent personal knowledge vault.

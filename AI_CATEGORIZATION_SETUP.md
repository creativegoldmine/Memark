# AI Categorization Setup

## Current Status

The categorization system is **deployed and working** but needs an OpenAI API key to provide intelligent link analysis and summaries.

### What Works NOW (Without OpenAI):
- ✅ Detects link types (article/video/note/task)
- ✅ Extracts basic metadata from HTML (title, description, images)
- ✅ Generates basic tags based on keywords
- ✅ Assigns categories based on content patterns
- ✅ Auto-assigns items to matching collections

### What Will Work BETTER (With OpenAI):
- 🎯 **Smart link analysis** - AI reads Twitter/X links and infers the topic
- 🎯 **Meaningful summaries** - Explains what value the content provides (150 chars)
- 🎯 **Contextual titles** - Describes what the link is about, not just "Article from x.com"
- 🎯 **Better tags** - 3-5 specific, relevant tags based on actual content
- 🎯 **Accurate categories** - Work/Personal/Finance/Learning/Tech/Entertainment/News/Social

## How to Enable AI Categorization

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create an account or sign in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Step 2: Configure in Supabase

The API key needs to be added as a secret in Supabase Edge Functions:

1. Go to your Supabase dashboard
2. Navigate to: Project Settings → Edge Functions → Secrets
3. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

**OR** use the Supabase CLI:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### Step 3: Test It

Send a text with a link to your MeMark number, and the AI will:
1. Fetch the link's metadata
2. Analyze the URL and content with GPT-4-mini
3. Generate a smart title, summary, tags, and category
4. Save it all to your database

## Cost Estimation

**Model:** GPT-4o-mini (fast and cheap)

**Cost per categorization:** ~$0.0001 (1/100th of a cent)

**Monthly estimate:**
- 100 links/month = $0.01
- 1000 links/month = $0.10
- 10000 links/month = $1.00

Essentially free for personal use.

## Example Output

### Without AI:
```json
{
  "title": "Article from x.com",
  "summary": "A article shared via MeMark",
  "tags": ["AI", "Creativity"],
  "category": "Tech"
}
```

### With AI:
```json
{
  "title": "Building AI agents with Claude",
  "summary": "A guide on creating autonomous AI agents using Claude's API and function calling capabilities for task automation.",
  "tags": ["AI", "Development", "Automation", "Claude", "Tutorial"],
  "category": "Learning"
}
```

## Technical Details

### Edge Function: `categorize-item`

**Flow:**
1. Extract URL from content (if present)
2. Fetch HTML metadata (Open Graph, Twitter Cards, JSON-LD)
3. If OpenAI key exists → Call GPT-4o-mini for intelligent analysis
4. Update item with type, title, summary, tags, category, score, image
5. Auto-assign to matching collections
6. Log AI action to `ai_event_log` table

### Supported Sites

Works with ANY website that has proper meta tags:
- ✅ Twitter/X posts
- ✅ YouTube videos
- ✅ News articles
- ✅ Blog posts
- ✅ GitHub repos
- ✅ Product pages
- ✅ Documentation sites

### Fallback Behavior

Without OpenAI API key:
- Uses regex patterns to detect content type
- Generates title from domain name
- Creates basic summary from text
- Tags based on keyword matching
- Category based on simple rules

Still functional, just not as smart!

## Testing

### Test the categorize function directly:

```bash
curl -X POST https://ckhzhabcvxyawhjcjsfu.supabase.co/functions/v1/categorize-item \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "YOUR_ITEM_ID",
    "content": "https://example.com/article",
    "userId": "YOUR_USER_ID"
  }'
```

### Or just text a link to your MeMark number:

Text: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

The webhook will automatically trigger categorization.

## Troubleshooting

**No summaries appearing?**
- Check if OPENAI_API_KEY is set in Supabase secrets
- Verify the API key is valid and has credits
- Check Edge Function logs in Supabase dashboard

**Generic titles like "Article from x.com"?**
- This means AI categorization failed or isn't enabled
- The system falls back to basic title generation
- Enable OpenAI for better results

**Images not showing?**
- Some sites block metadata scraping
- Twitter/X requires authentication for full data
- The system tries Open Graph, Twitter Cards, and JSON-LD

## Future Enhancements

Potential improvements:
- Use Claude API instead of OpenAI for better reasoning
- Add support for extracting key quotes from articles
- Generate reading time estimates
- Detect and extract action items from content
- Support for audio content (podcasts)
- Multi-language summarization

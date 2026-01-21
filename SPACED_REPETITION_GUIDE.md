# Spaced Repetition Review System Guide

## Overview

The Spaced Repetition Review System is Memark's core feature that solves the "90% never go back" problem. It uses scientifically-backed spaced repetition intervals to ensure users actually revisit and retain their saved content.

## Features Implemented

### 1. Review Feed Component (`components/ReviewFeed.tsx`)

**Smart Priority Algorithm**
- Calculates review priority based on multiple factors:
  - Days overdue (highest weight: +10 per day)
  - Review stage (+5 per stage)
  - Relevance score (+2 per point)
  - Review frequency (reduces priority after 3+ reviews)
  - Time since last review (boosts priority after 30+ days)

**Stats Dashboard**
- Due Today count
- Overdue count
- Total reviewed count
- Review streak (days)

**Empty State**
- Encouraging "All Caught Up!" message when no items due

### 2. Review Tab (`app/(tabs)/review.tsx`)

- Dedicated tab in bottom navigation with RotateCcw icon
- Full-screen review interface
- Integrated with LinkPreviewModal for detailed view

### 3. Spaced Repetition Intervals

The system uses 7 stages with scientifically-backed intervals:

| Stage | Interval | Description |
|-------|----------|-------------|
| 1 | 1 day | Initial review |
| 2 | 3 days | Short-term retention |
| 3 | 7 days | Weekly check |
| 4 | 14 days | Bi-weekly |
| 5 | 30 days | Monthly |
| 6 | 60 days | Bi-monthly |
| 7 | 120 days | Long-term retention |

### 4. Review Actions

**Mark as Reviewed**
- Advances to next review stage
- Increments `times_reviewed` counter
- Updates `last_reviewed_at` timestamp
- Calculates next review date
- Removes from current review queue
- Success haptic feedback

**Skip (2 hours)**
- Temporarily postpones review by 2 hours
- Doesn't affect review stage
- Good for "not right now" situations
- Quick action for busy users

**Snooze (7 days)**
- Postpones review by 7 days
- Useful for items that aren't relevant right now
- Doesn't advance review stage
- Warning color to indicate temporary action

### 5. Review Badges on Items

- Orange "Review" badge displayed on items due for review
- Visible in all view modes (list, grid, compact)
- Uses RotateCcw icon for consistency
- Positioned top-left of item card

### 6. Daily Digest Edge Function

**Purpose**: Prepares personalized daily review digests for users

**Features**:
- Runs for all Pro users (or specific user_id)
- Checks notification preferences before sending
- Calculates review streak
- Groups items into:
  - Due Today (items due today specifically)
  - Overdue (items past their review date)
  - High Priority (score 80+ or 7+ days overdue)

**Response Format**:
```json
{
  "success": true,
  "digests_prepared": 25,
  "total_users": 50,
  "digests": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "due_today": [...],
      "overdue": [...],
      "high_priority": [...],
      "stats": {
        "total_due": 15,
        "total_overdue": 8,
        "streak": 7
      }
    }
  ]
}
```

**Scheduling**: Should be run daily via cron job (typically 8 AM user local time)

## How It Works

### Initial Save
1. User saves an item (via SMS, share-sheet, or manual entry)
2. System sets `review_stage = 1`
3. System sets `next_review_date = now + 1 day`
4. System sets `times_reviewed = 0`

### Review Flow
1. User opens Review tab
2. System queries items where `next_review_date <= now`
3. Items sorted by priority algorithm
4. User sees top items with review actions
5. User marks item as reviewed:
   - Stage advances (1 → 2, 2 → 3, etc.)
   - Next review date calculated using interval table
   - Times reviewed increments
   - Item removed from review queue

### Priority Calculation Example
```
Item A:
- 5 days overdue = +50 points
- Stage 2 = +10 points
- Relevance score 85 = +170 points
- Reviewed 1 time = 0 adjustment
Total: 230 points (HIGH PRIORITY)

Item B:
- 1 day overdue = +10 points
- Stage 1 = +5 points
- Relevance score 60 = +120 points
- Reviewed 5 times = -20 points
Total: 115 points (MEDIUM PRIORITY)
```

### Streak Calculation
- Checks last 365 days of review history
- Consecutive days with at least 1 review = streak
- Skips today if no reviews yet (allows checking streak at start of day)
- Resets if a day is missed

## Database Schema

### Items Table Fields Used

```sql
-- Review tracking fields
last_reviewed_at TIMESTAMPTZ       -- When item was last reviewed
review_stage INTEGER DEFAULT 1     -- Current spaced repetition stage (1-7)
next_review_date TIMESTAMPTZ       -- When item should be reviewed next
times_reviewed INTEGER DEFAULT 0   -- Total number of reviews

-- Priority calculation fields
relevance_score FLOAT             -- AI-generated relevance (0-100)
score FLOAT                       -- User engagement score (0-100)
```

### Notification Preferences Table

```sql
notification_preferences (
  user_id UUID PRIMARY KEY
  enable_daily_digest BOOLEAN DEFAULT true
  enable_review_reminders BOOLEAN DEFAULT true
  enable_weekly_digest BOOLEAN DEFAULT true
  enable_collection_updates BOOLEAN DEFAULT false
)
```

## User Benefits

1. **Never Forget**: Systematic review ensures important content stays fresh
2. **Optimized Learning**: Science-backed intervals maximize retention
3. **Smart Prioritization**: High-value content gets attention first
4. **Gamification**: Streak tracking motivates daily engagement
5. **Flexible Actions**: Skip, snooze, or review based on context
6. **Progress Tracking**: Clear stats show review habits

## Admin/Power User Features

### Manual Digest Trigger
```bash
curl -X POST https://your-project.supabase.co/functions/v1/prepare-daily-digest \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "specific-user-uuid", "send_email": true}'
```

### Bulk Review Reset
Admin can reset review stages for all items if algorithm needs adjustment

### Review Analytics
Track user engagement:
- Average reviews per day
- Streak distribution
- Stage progression rates
- Skip vs Review ratio

## Future Enhancements

1. **Adaptive Intervals**: Adjust intervals based on user performance
2. **Review Reminders**: Push notifications at optimal times
3. **Review Insights**: Show retention rates per category
4. **Social Reviews**: Share review streaks with friends
5. **Smart Scheduling**: ML-based optimal review time prediction
6. **Review Templates**: Different algorithms for different content types
7. **Bulk Actions**: Mark multiple items as reviewed at once
8. **Review Calendar**: Visual calendar showing review history

## Testing the System

### Manual Testing Steps

1. **Create Test Items**:
   ```sql
   -- Insert items with past review dates
   UPDATE items
   SET next_review_date = NOW() - INTERVAL '5 days',
       review_stage = 2
   WHERE user_id = 'your-user-id'
   LIMIT 5;
   ```

2. **Open Review Tab**: Should see items in priority order

3. **Test Actions**:
   - Mark as Reviewed: Check next_review_date advances properly
   - Skip: Check item reappears in 2 hours
   - Snooze: Check item reappears in 7 days

4. **Check Stats**: Verify counts match database

5. **Test Streak**: Review items on consecutive days

6. **Test Daily Digest**:
   ```bash
   # Call function manually
   curl -X POST $SUPABASE_URL/functions/v1/prepare-daily-digest \
     -H "Authorization: Bearer $YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "your-user-id"}'
   ```

## Best Practices

1. **Review Daily**: Even 5 minutes maintains streaks
2. **Don't Skip Too Much**: Builds backlog
3. **Use Snooze Wisely**: For temporarily irrelevant content
4. **Check Stats**: Monitor your review habits
5. **Trust the Algorithm**: Don't force reviews early
6. **Archive When Done**: Remove permanently mastered content

## Troubleshooting

**Items not appearing in review feed?**
- Check `next_review_date <= now()`
- Verify `status = 'active'`
- Check `is_archived = false`

**Streak not calculating correctly?**
- Verify `last_reviewed_at` timestamps
- Check timezone consistency
- Ensure consecutive days (no gaps)

**Priority seems wrong?**
- Review priority calculation weights
- Check relevance_score values
- Verify days_overdue calculation

**Daily digest not sending?**
- Check notification preferences
- Verify Pro subscription status
- Check digest preparation logs

---

The Spaced Repetition Review System transforms Memark from a passive bookmark vault into an active learning and retention tool, ensuring users actually benefit from the content they save!

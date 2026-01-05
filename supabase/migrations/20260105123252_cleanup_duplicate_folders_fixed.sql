/*
  # Clean Up Duplicate Folders

  1. Changes
    - Delete duplicate folders, keeping only the oldest one for each (user_id, path)
    - Update item_folders references to point to the kept folders
    - Add unique constraint to prevent future duplicates
  
  2. Security
    - Maintains data integrity by preserving item-folder relationships
*/

-- First, update all item_folders to point to the oldest folder for each path
WITH folder_dedupe AS (
  SELECT 
    id,
    user_id,
    path,
    ROW_NUMBER() OVER (PARTITION BY user_id, path ORDER BY created_at ASC) as rn
  FROM folders
)
, folders_to_keep AS (
  SELECT id FROM folder_dedupe WHERE rn = 1
)
, folders_to_delete AS (
  SELECT id FROM folder_dedupe WHERE rn > 1
)
, path_mapping AS (
  SELECT 
    f_delete.id as old_id,
    f_keep.id as new_id
  FROM folders f_delete
  JOIN folders f_keep ON f_delete.user_id = f_keep.user_id AND f_delete.path = f_keep.path
  WHERE f_delete.id IN (SELECT id FROM folders_to_delete)
    AND f_keep.id IN (SELECT id FROM folders_to_keep)
)
UPDATE item_folders
SET folder_id = path_mapping.new_id
FROM path_mapping
WHERE item_folders.folder_id = path_mapping.old_id;

-- Delete duplicate item_folders entries (same item in same folder after merge)
DELETE FROM item_folders a
USING item_folders b
WHERE a.created_at > b.created_at
  AND a.item_id = b.item_id
  AND a.folder_id = b.folder_id;

-- Now delete the duplicate folders
WITH folder_dedupe AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, path ORDER BY created_at ASC) as rn
  FROM folders
)
DELETE FROM folders
WHERE id IN (SELECT id FROM folder_dedupe WHERE rn > 1);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS folders_user_path_unique 
ON folders(user_id, path);

/*
  # Clean Up Duplicate Folders

  1. Purpose
    - Remove duplicate folders with same name (case-insensitive)
    - Consolidate all items into the folder with most items
    - Preserve user data and folder structure

  2. Process
    - Identify duplicate folder groups by user_id and lowercase name
    - For each group, keep the folder with most item associations
    - Migrate all items from duplicate folders to the kept folder
    - Remove duplicate folders

  3. Safety
    - Uses DO blocks for safe execution
    - Preserves all item associations
    - No data loss
*/

DO $$
DECLARE
  duplicate_group RECORD;
  keeper_folder_id UUID;
  duplicate_folder RECORD;
BEGIN
  -- Loop through each set of duplicate folder names per user
  FOR duplicate_group IN
    SELECT 
      user_id,
      LOWER(name) as lower_name,
      ARRAY_AGG(id ORDER BY created_at ASC) as folder_ids
    FROM folders
    GROUP BY user_id, LOWER(name)
    HAVING COUNT(*) > 1
  LOOP
    -- Find the folder with the most items
    SELECT f.id INTO keeper_folder_id
    FROM folders f
    LEFT JOIN item_folders if ON if.folder_id = f.id
    WHERE f.id = ANY(duplicate_group.folder_ids)
    GROUP BY f.id
    ORDER BY COUNT(if.item_id) DESC, f.created_at ASC
    LIMIT 1;

    -- If no keeper found (shouldn't happen), use the first one
    IF keeper_folder_id IS NULL THEN
      keeper_folder_id := duplicate_group.folder_ids[1];
    END IF;

    -- Loop through duplicate folders
    FOR duplicate_folder IN
      SELECT id FROM folders WHERE id = ANY(duplicate_group.folder_ids) AND id != keeper_folder_id
    LOOP
      -- Migrate items from duplicate to keeper
      UPDATE item_folders
      SET folder_id = keeper_folder_id
      WHERE folder_id = duplicate_folder.id
        AND item_id NOT IN (
          SELECT item_id FROM item_folders WHERE folder_id = keeper_folder_id
        );

      -- Delete remaining duplicate associations
      DELETE FROM item_folders WHERE folder_id = duplicate_folder.id;

      -- Delete the duplicate folder
      DELETE FROM folders WHERE id = duplicate_folder.id;
    END LOOP;
  END LOOP;
END $$;
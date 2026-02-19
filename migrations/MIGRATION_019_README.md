# Schema Migration Instructions

## Problem
The database has the **old schema** (with columns like `date`, `logDate`, `hours_worked`, `photos`, `status`), but the code models expect the **new schema** (with columns like `log_date`, `day_no`, `time_in`, `time_out`, `photo_path`, `supervisor_status`, `adviser_status`).

This mismatch causes:
- CONSTRAINT errors when creating daily logs
- Column not found errors when reading data
- Type mismatches between database and ORM

## Solution
Run the migration script `019_migrate_to_new_schema.js` which will:

1. ✅ Create a backup of the old table (in case something goes wrong)
2. ✅ Drop the old table structure
3. ✅ Create the new table with the correct schema
4. ✅ Migrate data from backup to new table with proper transformations:
   - Convert old columns to new format
   - Map approval status from `status` → `adviser_status`
   - Store photos as JSON array instead of VARCHAR
   - Set d default time_in/time_out values
   - Calculate day_no based on sequence

## How to Run

**From the Node.js environment:**
```bash
node migrations/019_migrate_to_new_schema.js
```

**From npm scripts (add to package.json):**
```bash
npm run migrate:schema
```

## What Gets Migrated

| Old Column | New Column | Transformation |
|-----------|-----------|-----------------|
| `date` / `logDate` | `log_date` | No change (DATE → DATE) |
| `hours_worked` | `total_hours` | No change (DECIMAL) |
| `task_description` | `tasks_accomplished` | No change (TEXT) |
| `notes` | `skills_enhanced` | Moved to this column |
| `photos` | `photo_path` | Wrapped in JSON array |
| `status` | `adviser_status` | Status mapped ('Approved' → 'Approved') |
| NEW | `day_no` | Auto-assigned based on sequence |
| NEW | `supervisor_status` | Set to 'Pending' (default) |
| NEW | `time_in` | Set to '08:00:00' (default) |
| NEW | `time_out` | Calculated from `hours_worked` |

## Rollback (if needed)

If something goes wrong, the script will automatically try to restore from the backup table. If automatic restore fails, you can manually run:

```sql
DROP TABLE intern_daily_logs;
RENAME TABLE intern_daily_logs_backup TO intern_daily_logs;
```

## After Migration

Once the migration completes successfully:

1. ✅ Remove fallback query logic from `controllers/internDailyLogController.js` (optional, it will still work)
2. ✅ The ORM will work seamlessly without requiring legacy schema support
3. ✅ All new daily log operations will use the proper schema
4. ✅ Delete backup if you're confident migration was successful: `DROP TABLE intern_daily_logs_backup;`

## Testing

After migration, verify the table structure:
```sql
DESCRIBE intern_daily_logs;
```

You should see these columns:
- id, intern_id, day_no, log_date, time_in, time_out, total_hours
- tasks_accomplished, skills_enhanced, learning_applied
- photo_path (JSON)
- supervisor_status, adviser_status, supervisor_comment, adviser_comment
- supervisor_approved_at, adviser_approved_at
- createdAt, updatedAt

-- Add day_no column to intern_daily_logs if it doesn't exist
-- This column tracks the day number of the intern's daily log entries

ALTER TABLE intern_daily_logs 
ADD COLUMN day_no INT NOT NULL DEFAULT 0;

-- Update existing rows with sequential day_no values per intern
SET @intern_id := 0;
SET @day_number := 0;

UPDATE intern_daily_logs 
SET day_no = (
  CASE 
    WHEN @intern_id = intern_id THEN @day_number := @day_number + 1
    ELSE @day_number := 1 AND @intern_id := intern_id
  END
)
ORDER BY intern_id, log_date ASC;

-- Add unique constraint for intern_id and day_no
ALTER TABLE intern_daily_logs 
ADD CONSTRAINT unique_intern_day_no UNIQUE (intern_id, day_no);

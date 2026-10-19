-- Daily totals only. No raw hits, user/session identifiers, IPs or device fields.
CREATE TABLE IF NOT EXISTS traffic_daily (
 day TEXT NOT NULL,
 page TEXT NOT NULL,
 views INTEGER NOT NULL CHECK (views >= 0),
 PRIMARY KEY (day,page)
) WITHOUT ROWID;

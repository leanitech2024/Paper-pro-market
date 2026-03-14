-- Index for watchlist ownership lookups (used on every page load)
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id 
  ON watchlists(user_id);

-- Index for watchlist item lookups (used in every watchlist JOIN)
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id 
  ON watchlist_items(watchlist_id);

-- Index for instrument token lookups (used in JOIN with 51k row table)
CREATE INDEX IF NOT EXISTS idx_watchlist_items_instrument_token 
  ON watchlist_items(instrument_token);

-- Index for position lookups by user (used in snapshot route)
CREATE INDEX IF NOT EXISTS idx_positions_user_id 
  ON positions(user_id);

-- Index for instrument token on positions (used in snapshot JOIN)
CREATE INDEX IF NOT EXISTS idx_positions_instrument_token 
  ON positions(instrument_token);

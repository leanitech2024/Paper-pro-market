-- C-4 FIX: Add CHECK constraint to prevent wallet balance from going negative.
-- Without this, concurrent orders can both pass the balance check and both debit,
-- leaving the wallet at a negative value with no DB-level guard.
-- The constraint acts as a last line of defence even if application logic has a race.

ALTER TABLE wallets
    ADD CONSTRAINT wallets_balance_non_negative
        CHECK (balance::numeric >= 0);

ALTER TABLE wallets
    ADD CONSTRAINT wallets_blocked_balance_non_negative
        CHECK ("blockedBalance"::numeric >= 0);

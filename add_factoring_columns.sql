-- Add factoring columns to reg_ventas table
-- This allows marking invoices as factored with a specific factoring date

ALTER TABLE reg_ventas
ADD COLUMN is_factored BOOLEAN DEFAULT FALSE,
ADD COLUMN factoring_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN reg_ventas.is_factored IS 'Indicates if this invoice has been factored (sold to a factoring company)';
COMMENT ON COLUMN reg_ventas.factoring_date IS 'Date when the invoice was factored - this date overrides fecha_recepcion for cash flow calculations';

-- Create index for better query performance on factoring status
CREATE INDEX idx_reg_ventas_is_factored ON reg_ventas(is_factored);
CREATE INDEX idx_reg_ventas_factoring_date ON reg_ventas(factoring_date);

-- Add constraint to ensure factoring_date is only set when is_factored is true
ALTER TABLE reg_ventas
ADD CONSTRAINT chk_factoring_date
CHECK (
  (is_factored = FALSE AND factoring_date IS NULL) OR
  (is_factored = TRUE AND factoring_date IS NOT NULL)
);

-- Add trigger to automatically update factoring_date when is_factored changes
CREATE OR REPLACE FUNCTION manage_factoring_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_factored is being set to FALSE, clear factoring_date
  IF NEW.is_factored = FALSE THEN
    NEW.factoring_date := NULL;
  END IF;

  -- If is_factored is being set to TRUE but factoring_date is NULL, use current date
  IF NEW.is_factored = TRUE AND NEW.factoring_date IS NULL THEN
    NEW.factoring_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_factoring_date
  BEFORE INSERT OR UPDATE ON reg_ventas
  FOR EACH ROW
  EXECUTE FUNCTION manage_factoring_date();

-- Optional: Backfill existing data (uncomment if needed)
-- UPDATE reg_ventas SET is_factored = FALSE WHERE is_factored IS NULL;
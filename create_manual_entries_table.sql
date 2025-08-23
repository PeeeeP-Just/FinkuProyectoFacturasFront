-- Create manual_entries table for expenses and income that don't come from invoices
CREATE TABLE manual_entries (
  id SERIAL PRIMARY KEY,
  entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('expense', 'income')),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_manual_entries_date ON manual_entries(entry_date);
CREATE INDEX idx_manual_entries_type ON manual_entries(entry_type);
CREATE INDEX idx_manual_entries_date_type ON manual_entries(entry_date, entry_type);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_manual_entries_updated_at
    BEFORE UPDATE ON manual_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for the table
ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust based on your authentication requirements)
-- For now, allowing all operations (you may want to restrict based on user authentication)
CREATE POLICY "Allow all operations on manual_entries" ON manual_entries
    FOR ALL USING (true);
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- Basic RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin can modify categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Insert initial
INSERT INTO categories (name) VALUES ('Vegetables'), ('Fish & Meat'), ('Fruits'), ('Spices'), ('Other');

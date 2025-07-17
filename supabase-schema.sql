-- AutoParts Pro Database Schema for Supabase
-- Copy and paste this entire script into Supabase SQL Editor

-- Enable Row Level Security (RLS) extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Counters table for Pro No and Job No tracking
CREATE TABLE IF NOT EXISTS public.counters (
    id TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default counters
INSERT INTO public.counters (id, current_value) VALUES 
    ('pro_no', 0),
    ('job_no', 0),
    ('estimate_invoice', 0),
    ('invoice_no', 0)
ON CONFLICT (id) DO NOTHING;

-- 2. Parts table with all fields
CREATE TABLE IF NOT EXISTS public.parts (
    id SERIAL PRIMARY KEY,
    pro_no TEXT UNIQUE,
    part_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    item_name TEXT,
    description TEXT,
    part_type TEXT DEFAULT 'new' CHECK (part_type IN ('new', 'used')),
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    final_selling_price DECIMAL(10,2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    supplier TEXT,
    item_code TEXT,
    cost_code TEXT,
    reorder_level INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'NOS',
    location TEXT,
    photo TEXT, -- Base64 encoded image
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Job Cards table
CREATE TABLE IF NOT EXISTS public.job_cards (
    id SERIAL PRIMARY KEY,
    job_no TEXT UNIQUE NOT NULL,
    job_date DATE NOT NULL,
    in_time TIME NOT NULL,
    vehicle_no TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'CAR',
    make TEXT,
    model TEXT,
    color TEXT,
    engine_no TEXT,
    chassis_no TEXT,
    man_year TEXT,
    in_milage TEXT,
    insurance_company TEXT,
    claim_no TEXT,
    date_of_accident DATE,
    customer_type TEXT DEFAULT 'existing',
    customer_name TEXT NOT NULL,
    id_no TEXT,
    address TEXT,
    mob_no TEXT,
    tel_no TEXT,
    fax_no TEXT,
    email TEXT,
    vat_no TEXT,
    technician TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    total_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Stock movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL,
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    final_selling_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Job Card Parts table (parts used in job cards)
CREATE TABLE IF NOT EXISTS public.job_card_parts (
    id SERIAL PRIMARY KEY,
    job_card_id INTEGER NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    part_id INTEGER NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Low stock alerts table
CREATE TABLE IF NOT EXISTS public.low_stock_alerts (
    id SERIAL PRIMARY KEY,
    part_id INTEGER NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    alert_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Estimates table
CREATE TABLE IF NOT EXISTS public.estimates (
    id SERIAL PRIMARY KEY,
    invoice_no TEXT UNIQUE,
    job_no TEXT,
    job_date TEXT,
    vehicle_no TEXT,
    customer TEXT,
    ins_company TEXT,
    remarks TEXT,
    total_amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Estimate items table
CREATE TABLE IF NOT EXISTS public.estimate_items (
    id SERIAL PRIMARY KEY,
    estimate_id INTEGER REFERENCES public.estimates(id) ON DELETE CASCADE,
    type TEXT,
    description TEXT,
    price DECIMAL(10,2),
    quantity INTEGER,
    value DECIMAL(10,2),
    fb TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_part_number ON public.parts(part_number);
CREATE INDEX IF NOT EXISTS idx_parts_pro_no ON public.parts(pro_no);
CREATE INDEX IF NOT EXISTS idx_parts_current_stock ON public.parts(current_stock);
CREATE INDEX IF NOT EXISTS idx_job_cards_job_no ON public.job_cards(job_no);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON public.job_cards(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_part_id ON public.stock_movements(part_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- Create updated_at triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_parts_updated_at 
    BEFORE UPDATE ON public.parts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_cards_updated_at 
    BEFORE UPDATE ON public.job_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at 
    BEFORE UPDATE ON public.estimates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at 
    BEFORE UPDATE ON public.counters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - Optional, for future multi-user support
-- ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.job_card_parts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;


COMMIT;
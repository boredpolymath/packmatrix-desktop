-- PackMatrix Desktop Initial SQLite Schema (WAL Mode Enabled)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 1. Luggage Shells
CREATE TABLE IF NOT EXISTS luggage_shells (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    length_cm REAL NOT NULL,
    width_cm REAL NOT NULL,
    depth_cm REAL NOT NULL,
    tare_weight_g REAL NOT NULL,
    nominal_volume_l REAL NOT NULL,
    expansion_gusset_cm REAL DEFAULT 0.0,
    is_expanded INTEGER DEFAULT 0,
    corner_radius_cm REAL DEFAULT 0.0,
    taper_ratio REAL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Sub-Containers (Compression Cubes, Pouches, Sleeves)
CREATE TABLE IF NOT EXISTS sub_containers (
    id TEXT PRIMARY KEY NOT NULL,
    luggage_shell_id TEXT,
    parent_sub_container_id TEXT,
    name TEXT NOT NULL,
    container_type TEXT NOT NULL, -- 'cube', 'pouch', 'sleeve', 'organizer', 'pocket'
    length_cm REAL NOT NULL,
    width_cm REAL NOT NULL,
    depth_cm REAL NOT NULL,
    max_volume_l REAL NOT NULL,
    tare_weight_g REAL DEFAULT 0.0,
    compression_ratio REAL DEFAULT 1.0,
    zone_layer TEXT DEFAULT 'main', -- 'top_lid', 'center_layer', 'heavy_base', 'bottom_floor'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(luggage_shell_id) REFERENCES luggage_shells(id) ON DELETE CASCADE,
    FOREIGN KEY(parent_sub_container_id) REFERENCES sub_containers(id) ON DELETE CASCADE
);

-- 3. Inventory Items (Master Gear Library)
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL, -- 'Tech', 'Clothing', 'Toiletries', 'Footwear', 'Documents', 'Misc'
    weight_g REAL NOT NULL,
    length_cm REAL DEFAULT 0.0,
    width_cm REAL DEFAULT 0.0,
    depth_cm REAL DEFAULT 0.0,
    compressibility_factor REAL DEFAULT 1.0, -- 1.0 = rigid, 0.5 = 50% compressible
    is_liquid INTEGER DEFAULT 0,
    liquid_volume_ml REAL DEFAULT 0.0,
    monetary_value REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    serial_number TEXT,
    readiness_state TEXT DEFAULT 'clean', -- 'clean', 'worn', 'laundered', 'packed', 'staged', 'missing'
    tags TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Full-Text Search Virtual Table for instant gear searching
CREATE VIRTUAL TABLE IF NOT EXISTS inventory_fts USING fts5(
    name,
    brand,
    category,
    tags,
    content='inventory_items',
    content_rowid='rowid'
);

-- Triggers to keep FTS5 synchronized with inventory_items table
CREATE TRIGGER IF NOT EXISTS inventory_items_ai AFTER INSERT ON inventory_items BEGIN
    INSERT INTO inventory_fts(rowid, name, brand, category, tags)
    VALUES (new.rowid, new.name, new.brand, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS inventory_items_ad AFTER DELETE ON inventory_items BEGIN
    INSERT INTO inventory_fts(inventory_fts, rowid, name, brand, category, tags)
    VALUES('delete', old.rowid, old.name, old.brand, old.category, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS inventory_items_au AFTER UPDATE ON inventory_items BEGIN
    INSERT INTO inventory_fts(inventory_fts, rowid, name, brand, category, tags)
    VALUES('delete', old.rowid, old.name, old.brand, old.category, old.tags);
    INSERT INTO inventory_fts(rowid, name, brand, category, tags)
    VALUES (new.rowid, new.name, new.brand, new.category, new.tags);
END;

-- 4. Airline Baggage Rules
CREATE TABLE IF NOT EXISTS airline_rules (
    id TEXT PRIMARY KEY NOT NULL,
    carrier_name TEXT NOT NULL,
    carrier_code TEXT NOT NULL,
    fare_class TEXT NOT NULL, -- 'Economy', 'Premium Economy', 'Business', 'First'
    carry_on_length_cm REAL NOT NULL,
    carry_on_width_cm REAL NOT NULL,
    carry_on_depth_cm REAL NOT NULL,
    carry_on_max_weight_kg REAL,
    personal_item_length_cm REAL,
    personal_item_width_cm REAL,
    personal_item_depth_cm REAL,
    personal_item_max_weight_kg REAL,
    tsa_liquids_compliant INTEGER DEFAULT 1,
    verified_at TEXT NOT NULL,
    source_url TEXT
);

-- 5. Trip Plans
CREATE TABLE IF NOT EXISTS trip_plans (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    origin_airport TEXT,
    destination_airport TEXT,
    departure_date TEXT,
    return_date TEXT,
    target_airline_rule_id TEXT,
    active_luggage_shell_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(target_airline_rule_id) REFERENCES airline_rules(id) ON DELETE SET NULL,
    FOREIGN KEY(active_luggage_shell_id) REFERENCES luggage_shells(id) ON DELETE SET NULL
);

-- 6. Allocations (Items packed into Luggage / Sub-Containers)
CREATE TABLE IF NOT EXISTS allocations (
    id TEXT PRIMARY KEY NOT NULL,
    trip_plan_id TEXT NOT NULL,
    inventory_item_id TEXT NOT NULL,
    luggage_shell_id TEXT,
    sub_container_id TEXT,
    quantity INTEGER DEFAULT 1,
    is_packed INTEGER DEFAULT 0,
    packed_at TEXT,
    custom_override_weight_g REAL,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    pos_z REAL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(trip_plan_id) REFERENCES trip_plans(id) ON DELETE CASCADE,
    FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    FOREIGN KEY(luggage_shell_id) REFERENCES luggage_shells(id) ON DELETE CASCADE,
    FOREIGN KEY(sub_container_id) REFERENCES sub_containers(id) ON DELETE CASCADE
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_sub_containers_shell ON sub_containers(luggage_shell_id);
CREATE INDEX IF NOT EXISTS idx_allocations_trip ON allocations(trip_plan_id);
CREATE INDEX IF NOT EXISTS idx_allocations_item ON allocations(inventory_item_id);

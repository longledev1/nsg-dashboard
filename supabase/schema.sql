-- Script khởi tạo Database & Storage Policies cho NSG Document Portal trên Supabase

-- 1. Bảng Categories (Danh mục chính)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#d0aa61',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Thêm 3 danh mục mặc định bảo vệ
INSERT INTO categories (id, name, slug, is_default, color)
VALUES 
  ('cat-fnb', 'FNB', 'fnb', TRUE, '#059669'),
  ('cat-estate', 'Estate', 'estate', TRUE, '#b45309'),
  ('cat-general', 'General', 'general', TRUE, '#d0aa61')
ON CONFLICT (id) DO NOTHING;

-- 2. Bảng SubFolders (Folder dự án con)
CREATE TABLE IF NOT EXISTS subfolders (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Thêm subfolder General mặc định
INSERT INTO subfolders (id, category_id, name, description, is_default)
VALUES
  ('sub-general', 'cat-general', 'General', 'Folder General mặc định', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Bảng Documents (File PDF & metadata)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id),
  subfolder_id TEXT REFERENCES subfolders(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Bật Row Level Security (RLS) cho các bảng
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subfolders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy cho phép đọc dữ liệu nội bộ
DROP POLICY IF EXISTS "Cho phép đọc dữ liệu nội bộ" ON categories;
CREATE POLICY "Cho phép đọc dữ liệu nội bộ" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép đọc subfolders nội bộ" ON subfolders;
CREATE POLICY "Cho phép đọc subfolders nội bộ" ON subfolders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép đọc tài liệu nội bộ" ON documents;
CREATE POLICY "Cho phép đọc tài liệu nội bộ" ON documents FOR SELECT USING (true);

-- Policy cho phép thêm/sửa/xóa tài liệu
DROP POLICY IF EXISTS "Cho phép quản lý tài liệu" ON documents;
CREATE POLICY "Cho phép quản lý tài liệu" ON documents FOR ALL USING (true);

DROP POLICY IF EXISTS "Cho phép quản lý categories" ON categories;
CREATE POLICY "Cho phép quản lý categories" ON categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Cho phép quản lý subfolders" ON subfolders;
CREATE POLICY "Cho phép quản lý subfolders" ON subfolders FOR ALL USING (true);

-- 5. PHÂN QUYỀN UPLOAD CHO SUPABASE STORAGE BUCKET ('nsg-documents')
-- Cho phép Upload (INSERT) file PDF vào Bucket nsg-documents
DROP POLICY IF EXISTS "Cho phép Upload vào nsg-documents" ON storage.objects;
CREATE POLICY "Cho phép Upload vào nsg-documents" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'nsg-documents');

-- Cho phép Đọc (SELECT) file PDF từ Bucket nsg-documents
DROP POLICY IF EXISTS "Cho phép Đọc từ nsg-documents" ON storage.objects;
CREATE POLICY "Cho phép Đọc từ nsg-documents" ON storage.objects 
FOR SELECT USING (bucket_id = 'nsg-documents');

-- Cho phép Xóa (DELETE) file PDF trong Bucket nsg-documents
DROP POLICY IF EXISTS "Cho phép Xóa từ nsg-documents" ON storage.objects;
CREATE POLICY "Cho phép Xóa từ nsg-documents" ON storage.objects 
FOR DELETE USING (bucket_id = 'nsg-documents');

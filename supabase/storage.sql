-- Run once in Supabase SQL Editor before using order photo uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-media',
  'order-media',
  true,
  12582912,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "order_media_read" ON storage.objects;
CREATE POLICY "order_media_read" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'order-media');

DROP POLICY IF EXISTS "order_media_insert" ON storage.objects;
CREATE POLICY "order_media_insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'order-media' AND public.is_authed()
);

DROP POLICY IF EXISTS "order_media_update" ON storage.objects;
CREATE POLICY "order_media_update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'order-media' AND public.is_authed()
);

DROP POLICY IF EXISTS "order_media_delete" ON storage.objects;
CREATE POLICY "order_media_delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'order-media' AND public.is_admin()
);

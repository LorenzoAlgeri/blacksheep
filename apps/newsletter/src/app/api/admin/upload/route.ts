import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "Nessun file" }, { status: 400 });
  }

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return Response.json(
      { error: "Formato non supportato. Usa JPG, PNG, WebP o GIF." },
      { status: 400 },
    );
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "File troppo grande. Max 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes to prevent spoofed Content-Type
  const magicBytes: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
    "image/gif": [0x47, 0x49, 0x46], // GIF
  };

  const expected = magicBytes[file.type];
  if (expected && !expected.every((b, i) => buffer[i] === b)) {
    console.warn("[UPLOAD] Magic bytes mismatch for claimed type:", file.type);
    return Response.json(
      { error: "Il file non corrisponde al formato dichiarato." },
      { status: 400 },
    );
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = mimeToExt[file.type] ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("newsletter-images")
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("[UPLOAD] Supabase storage error:", uploadError);
    return Response.json(
      { error: "Errore upload. Verifica che il bucket 'newsletter-images' esista." },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage.from("newsletter-images").getPublicUrl(fileName);

  return Response.json({ url: urlData.publicUrl });
}

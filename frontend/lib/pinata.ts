export async function uploadImage(file: File): Promise<string> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) throw new Error("NEXT_PUBLIC_PINATA_JWT not set");

  const form = new FormData();
  form.append("file", file);
  form.append("name", `pump-${Date.now()}-${file.name}`);
  // ✅ public qilib yuklash
  form.append("network", "public");

  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Pinata: ${await res.text()}`);
  const data = await res.json();
  console.log("Pinata response:", data);
  const cid = data?.data?.cid;
  if (!cid) throw new Error("No CID returned");
  return `ipfs://${cid}`;
}
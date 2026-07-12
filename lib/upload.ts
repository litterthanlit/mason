import type { GenericId } from "convex/values";

export async function uploadImageToConvex(
  generateUploadUrl: () => Promise<string>,
  localUri: string,
): Promise<GenericId<"_storage">> {
  const uploadUrl = await generateUploadUrl();

  const response = await fetch(localUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image");
  }

  const { storageId } = (await uploadResponse.json()) as { storageId: GenericId<"_storage"> };
  return storageId;
}

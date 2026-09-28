import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { setup, signIn, storeImage, type Test } from "./test.setup";

const garment = {
  category: "top" as const,
  subcategory: "merino crew",
  colors: ["#1A1A1A"],
  pattern: "solid",
  fit: "regular",
  season: ["winter"],
  occasions: ["casual"],
};

async function addItem(t: Test, as: Awaited<ReturnType<typeof signIn>>["as"]) {
  const storageId = await storeImage(t);
  const itemId = await as.mutation(api.wardrobe.create, { storageId, name: "Knit", ...garment });
  return { storageId, itemId };
}

describe("stylist threads", () => {
  test("another user cannot read or write a thread", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    const threadId = await alice.as.mutation(api.styling.createThread, {});

    const listArgs = {
      threadId,
      paginationOpts: { numItems: 10, cursor: null },
      streamArgs: undefined,
    };
    await expect(alice.as.query(api.styling.listThreadMessages, listArgs)).resolves.toBeDefined();
    await expect(bob.as.query(api.styling.listThreadMessages, listArgs)).rejects.toThrow(
      "Thread not found",
    );
    await expect(
      bob.as.mutation(api.styling.sendChatMessage, { threadId, prompt: "hi" }),
    ).rejects.toThrow("Thread not found");
  });
});

describe("uploads", () => {
  test("a file claimed by one user cannot be used by another", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    const { storageId } = await addItem(t, alice.as);

    await expect(
      bob.as.mutation(api.wardrobe.create, { storageId, name: "Stolen", ...garment }),
    ).rejects.toThrow("Image not found");
  });

  test("upload URLs are rate limited per user", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    for (let i = 0; i < 20; i++) {
      await alice.as.mutation(api.recognition.generateUploadUrl, {});
    }
    await expect(alice.as.mutation(api.recognition.generateUploadUrl, {})).rejects.toThrow();
    await expect(bob.as.mutation(api.recognition.generateUploadUrl, {})).resolves.toBeTypeOf(
      "string",
    );
  });
});

describe("closet", () => {
  test("confirming a garment twice saves it once", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const storageId = await storeImage(t);
    const jobId = await t.run((ctx) =>
      ctx.db.insert("recognitionJobs", {
        userId: alice.userId,
        storageId,
        type: "garment",
        status: "complete",
        result: { ...garment, confidence: 0.9 },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const first = await alice.as.mutation(api.recognition.confirmGarment, { jobId, name: "Knit", ...garment });
    const second = await alice.as.mutation(api.recognition.confirmGarment, { jobId, name: "Knit", ...garment });
    expect(second).toBe(first);
    const items = await alice.as.query(api.wardrobe.list, {});
    expect(items).toHaveLength(1);
  });

  test("an unfinished scan cannot be confirmed", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const storageId = await storeImage(t);
    const jobId = await t.run((ctx) =>
      ctx.db.insert("recognitionJobs", {
        userId: alice.userId,
        storageId,
        type: "garment",
        status: "running",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      alice.as.mutation(api.recognition.confirmGarment, { jobId, name: "Knit", ...garment }),
    ).rejects.toThrow("Recognition is not finished");
  });

  test("deleting an item removes its file and its place in outfits", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const knit = await addItem(t, alice.as);
    const trouser = await addItem(t, alice.as);
    const pair = await alice.as.mutation(api.outfits.create, {
      itemIds: [knit.itemId, trouser.itemId],
      occasion: "work",
    });
    const solo = await alice.as.mutation(api.outfits.create, { itemIds: [knit.itemId], occasion: "casual" });

    await alice.as.mutation(api.wardrobe.remove, { itemId: knit.itemId });

    await t.run(async (ctx) => {
      expect(await ctx.db.system.get("_storage", knit.storageId)).toBeNull();
      expect((await ctx.db.get("outfits", pair))?.itemIds).toEqual([trouser.itemId]);
      expect(await ctx.db.get("outfits", solo)).toBeNull();
    });
  });
});

describe("stylist outfits", () => {
  test("only the caller's own garments are saved", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    const mine = await addItem(t, alice.as);
    const theirs = await addItem(t, bob.as);

    const outfitId: Id<"outfits"> = await t.mutation(internal.stylingInternal.createOutfitInternal, {
      userId: alice.userId,
      itemIds: [mine.itemId, theirs.itemId, "not-an-id"],
      occasion: "work",
      rationale: "test",
    });
    const outfit = await t.run((ctx) => ctx.db.get("outfits", outfitId));
    expect(outfit?.itemIds).toEqual([mine.itemId]);

    await expect(
      t.mutation(internal.stylingInternal.createOutfitInternal, {
        userId: alice.userId,
        itemIds: [theirs.itemId],
        occasion: "work",
        rationale: "test",
      }),
    ).rejects.toThrow();
  });
});

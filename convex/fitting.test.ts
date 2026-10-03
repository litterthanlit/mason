import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { setup, signIn, storeImage, type Test } from "./test.setup";

type As = Awaited<ReturnType<typeof signIn>>["as"];

const base = {
  subcategory: "piece",
  colors: ["#1A1A1A"],
  pattern: "solid",
  fit: "regular",
  season: ["winter"],
  occasions: ["casual"],
};

async function addItem(t: Test, as: As, category: "top" | "bottom" | "dress" | "shoes" | "accessory" = "top") {
  const storageId = await storeImage(t);
  return await as.mutation(api.wardrobe.create, { storageId, name: category, category, ...base });
}

async function addLikeness(t: Test, as: As) {
  return await as.mutation(api.fitting.addLikeness, { storageId: await storeImage(t) });
}

// Scheduled renders stay queued unless a test runs them on purpose.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("fitting room ownership", () => {
  test("another user cannot use my photo, my pieces, or see my renders", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    const likenessId = await addLikeness(t, alice.as);
    const top = await addItem(t, alice.as);
    const bobsLikeness = await addLikeness(t, bob.as);

    const tryOnId = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top] });

    await expect(bob.as.mutation(api.fitting.start, { likenessId, itemIds: [top] })).rejects.toThrow(
      "Photo not found",
    );
    await expect(
      bob.as.mutation(api.fitting.start, { likenessId: bobsLikeness, itemIds: [top] }),
    ).rejects.toThrow("Invalid wardrobe item");
    expect(await bob.as.query(api.fitting.get, { tryOnId })).toBeNull();
    expect(await bob.as.query(api.fitting.list, {})).toEqual([]);
    expect(await bob.as.query(api.fitting.likeness, {})).toHaveLength(1);
    await expect(bob.as.mutation(api.fitting.remove, { tryOnId })).rejects.toThrow("Render not found");
    await expect(bob.as.mutation(api.fitting.removeLikeness, { likenessId })).rejects.toThrow("Photo not found");
  });
});

describe("try-on rules", () => {
  test("the same person and pieces reuse one render, in any order", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const top = await addItem(t, alice.as, "top");
    const bottom = await addItem(t, alice.as, "bottom");

    const first = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top, bottom] });
    const second = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [bottom, top, top] });
    expect(second).toBe(first);
    expect((await alice.as.query(api.fitting.allowance, {})).remaining).toBe(4);
  });

  test("one piece per slot, and a dress excludes top and bottom", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const [topA, topB, bottom, dress, ringA, ringB] = [
      await addItem(t, alice.as, "top"),
      await addItem(t, alice.as, "top"),
      await addItem(t, alice.as, "bottom"),
      await addItem(t, alice.as, "dress"),
      await addItem(t, alice.as, "accessory"),
      await addItem(t, alice.as, "accessory"),
    ];

    await expect(alice.as.mutation(api.fitting.start, { likenessId, itemIds: [topA, topB] })).rejects.toThrow(
      "One piece per slot",
    );
    await expect(
      alice.as.mutation(api.fitting.start, { likenessId, itemIds: [dress, bottom] }),
    ).rejects.toThrow("A dress replaces");
    await expect(alice.as.mutation(api.fitting.start, { likenessId, itemIds: [] })).rejects.toThrow(
      "Pick at least one piece",
    );
    await expect(
      alice.as.mutation(api.fitting.start, { likenessId, itemIds: [dress, ringA, ringB] }),
    ).resolves.toBeDefined();
  });

  test("renders are metered per user per day", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const items: Id<"wardrobeItems">[] = [];
    for (let i = 0; i < 6; i++) items.push(await addItem(t, alice.as, "accessory"));

    for (let i = 0; i < 5; i++) {
      await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [items[i]] });
    }
    expect((await alice.as.query(api.fitting.allowance, {})).remaining).toBe(0);
    await expect(alice.as.mutation(api.fitting.start, { likenessId, itemIds: [items[5]] })).rejects.toThrow();
  });

  test("a failed render reports why and can be retried", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const top = await addItem(t, alice.as);

    const tryOnId = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top] });
    // No GEMINI_API_KEY in tests, so the render fails with a readable reason.
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const failed = await alice.as.query(api.fitting.get, { tryOnId });
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toMatch(/not set up/);

    const retry = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top] });
    expect(retry).toBe(tryOnId);
    expect((await alice.as.query(api.fitting.get, { tryOnId }))?.status).toBe("queued");
  });
});

describe("fitting room privacy", () => {
  test("removing a photo of me removes every render made from it", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const top = await addItem(t, alice.as);
    const tryOnId = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top] });
    const renderFile = await storeImage(t);
    await t.mutation(internal.fitting.complete, { tryOnId, storageId: renderFile });
    const photoFile = await t.run(async (ctx) => (await ctx.db.get("likenessPhotos", likenessId))!.storageId);

    await alice.as.mutation(api.fitting.removeLikeness, { likenessId });

    expect(await alice.as.query(api.fitting.list, {})).toEqual([]);
    await t.run(async (ctx) => {
      expect(await ctx.db.system.get("_storage", renderFile)).toBeNull();
      expect(await ctx.db.system.get("_storage", photoFile)).toBeNull();
    });
  });

  test("a render that finishes after its photo was removed is discarded", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const likenessId = await addLikeness(t, alice.as);
    const top = await addItem(t, alice.as);
    const tryOnId = await alice.as.mutation(api.fitting.start, { likenessId, itemIds: [top] });
    await alice.as.mutation(api.fitting.removeLikeness, { likenessId });

    const late = await storeImage(t);
    await t.mutation(internal.fitting.complete, { tryOnId, storageId: late });
    await t.run(async (ctx) => {
      expect(await ctx.db.system.get("_storage", late)).toBeNull();
    });
  });

  test("at most three photos of me", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    for (let i = 0; i < 3; i++) await addLikeness(t, alice.as);
    await expect(addLikeness(t, alice.as)).rejects.toThrow("at most 3");
  });
});

describe("studio mockups", () => {
  test("the closet shows the mockup once it is rendered, and deleting the item deletes it", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const itemId = await addItem(t, alice.as);
    expect((await alice.as.query(api.wardrobe.get, { itemId }))?.mockupUrl).toBeNull();

    const mockup = await storeImage(t);
    await t.mutation(internal.mockups.complete, { itemId, storageId: mockup });
    const item = await alice.as.query(api.wardrobe.get, { itemId });
    expect(item?.mockupStatus).toBe("complete");
    expect(item?.mockupUrl).toBeTypeOf("string");

    await alice.as.mutation(api.wardrobe.remove, { itemId });
    await t.run(async (ctx) => {
      expect(await ctx.db.system.get("_storage", mockup)).toBeNull();
    });
  });

  test("a mockup for a deleted item is not kept", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const itemId = await addItem(t, alice.as);
    await alice.as.mutation(api.wardrobe.remove, { itemId });

    const late = await storeImage(t);
    await t.mutation(internal.mockups.complete, { itemId, storageId: late });
    await t.run(async (ctx) => {
      expect(await ctx.db.system.get("_storage", late)).toBeNull();
    });
  });

  test("only the owner can request a mockup", async () => {
    const t = setup();
    const alice = await signIn(t, "alice");
    const bob = await signIn(t, "bob");
    const itemId = await addItem(t, alice.as);

    await expect(bob.as.mutation(api.mockups.request, { itemId })).rejects.toThrow("Item not found");
    await alice.as.mutation(api.mockups.request, { itemId });
    expect((await alice.as.query(api.wardrobe.get, { itemId }))?.mockupStatus).toBe("queued");
  });
});

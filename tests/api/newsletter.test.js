import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../helpers/fixtures.js";

let app;
let store;

beforeEach(() => {
  ({ app, store } = buildApp());
});

describe("POST /api/newsletter", () => {
  it("subscribes a new address", async () => {
    const response = await request(app)
      .post("/api/newsletter")
      .send({ email: "ama@example.com" })
      .expect(201);

    expect(response.body).toMatchObject({ email: "ama@example.com", created: true });
    expect(store.listSubscribers()).toHaveLength(1);
  });

  it("normalises the address before storing it", async () => {
    await request(app).post("/api/newsletter").send({ email: "  Ama@Example.COM " }).expect(201);
    expect(store.listSubscribers()[0].email).toBe("ama@example.com");
  });

  it("is idempotent — a repeat signup reports created: false", async () => {
    await request(app).post("/api/newsletter").send({ email: "ama@example.com" }).expect(201);

    const response = await request(app)
      .post("/api/newsletter")
      .send({ email: "AMA@example.com" })
      .expect(200);

    expect(response.body.created).toBe(false);
    expect(response.body.message).toMatch(/already subscribed/i);
    expect(store.listSubscribers()).toHaveLength(1);
  });

  it("rejects an invalid address", async () => {
    const response = await request(app)
      .post("/api/newsletter")
      .send({ email: "not-an-email" })
      .expect(400);

    expect(response.body.error.fields.email).toBeDefined();
    expect(store.listSubscribers()).toEqual([]);
  });

  it("rejects a missing body", async () => {
    await request(app).post("/api/newsletter").send({}).expect(400);
  });
});

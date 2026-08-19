import { Router } from "express";

import { validateSubscription } from "../../shared/validation.js";

/**
 * Mailing list signup.
 * @param {ReturnType<import("../store.js").createStore>} store
 */
export function newsletterRouter(store) {
  const router = Router();

  router.post("/newsletter", (req, res) => {
    const { valid, errors, value } = validateSubscription(req.body);
    if (!valid) {
      return res.status(400).json({
        error: { message: "Check your email address.", fields: errors },
      });
    }

    const { created } = store.addSubscriber(value.email);
    res.status(created ? 201 : 200).json({
      email: value.email,
      created,
      message: created
        ? "You're on the list — deals land in your inbox once a month."
        : "You're already subscribed. Nothing else to do!",
    });
  });

  return router;
}

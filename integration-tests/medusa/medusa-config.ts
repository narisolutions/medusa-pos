import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import PosPlugin from "@narisolutions/medusa-plugin-pos"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:1420",
      adminCors: process.env.ADMIN_CORS || "http://localhost:1420",
      authCors: process.env.AUTH_CORS || "http://localhost:1420",
      jwtSecret: process.env.JWT_SECRET || "test-jwt-secret",
      cookieSecret: process.env.COOKIE_SECRET || "test-cookie-secret",
    },
  },
  admin: {
    disable: true,
  },
  plugins: [
    PosPlugin({ defaultCurrencyCode: "usd" }),
  ],
  modules: [
    {
      // The till's own tenders, as on a real backend: pp_cash_pos, pp_card_pos,
      // pp_banktransfer_pos. Each records a payment taken at the counter as settled.
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: ["cash", "card", "banktransfer"].map((tender) => ({
          resolve: `./src/modules/payment/pos/${tender}`,
          id: "pos",
          options: {},
        })),
      },
    },
  ],
})

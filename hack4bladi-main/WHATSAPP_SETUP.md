# BENNA on WhatsApp — setup

Meta WhatsApp Cloud API, test phone number, local dev server behind a Cloudflare quick tunnel.

## Pieces

| What | Where |
|---|---|
| Webhook (GET verify, POST messages/statuses) | `src/app/api/whatsapp/webhook/route.ts` |
| Signature check + Graph API sender | `src/lib/whatsapp/client.ts` |
| Webhook → flow → DB glue, status notifications | `src/lib/whatsapp/agent.ts` |
| Ordering conversation (pure, deterministic) | `src/features/benna/whatsapp-flow.ts` |
| Orders, sessions, dedupe (Supabase, service role) | `src/lib/benna/orders.ts`, `supabase/migrations/20261021160000_benna_orders_whatsapp.sql` |
| Kitchen/admin dashboard | `/admin/commandes?token=$BENNA_ADMIN_TOKEN` |
| Simulator | `node scripts/whatsapp-sim.mts` |

Orders are saved as `pending` and only become `confirmed` when someone clicks **Accepter** in the
admin; each status change is sent to the customer on WhatsApp. Payment: cash at pickup (test).

## Environment (`.env.local`, never committed)

See `.env.example`. `WHATSAPP_VERIFY_TOKEN` is any random string you also paste into Meta.
With `WHATSAPP_ACCESS_TOKEN` or `WHATSAPP_PHONE_NUMBER_ID` empty, replies are logged
(`[whatsapp] dry-run →`) instead of sent. `META_GRAPH_API_VERSION` defaults to `v26.0`.

## Meta dashboard (developers.facebook.com/apps)

1. **Create app** → use case **Connect with customers through WhatsApp** → business portfolio → Create.
2. **WhatsApp → API Setup**: Meta creates a test WhatsApp Business Account and a **test phone number**.
   Copy **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`, **WhatsApp Business Account ID** →
   `WHATSAPP_BUSINESS_ACCOUNT_ID`.
3. **Generate access token** (temporary, 24 h) → `WHATSAPP_ACCESS_TOKEN`.
4. **To** → *Manage phone number list* → add your number, enter the code WhatsApp sends you
   (max 5 test recipients).
5. **Send message** (hello_world template) → it arrives on your phone. This opens nothing:
   the 24 h window opens when *you* message the test number.
6. **App settings → Basic → App secret → Show** → `META_APP_SECRET`.
7. **WhatsApp → Configuration → Webhook → Edit**: Callback URL
   `https://<tunnel>/api/whatsapp/webhook`, Verify token = `WHATSAPP_VERIFY_TOKEN` → **Verify and save**.
8. **Webhook fields → messages → Subscribe**.

## Run locally

```sh
supabase start && supabase migration up --local
pnpm dev
cloudflared tunnel --url http://localhost:3000   # prints https://<random>.trycloudflare.com
```

The quick-tunnel URL changes on every restart: repeat step 7 when it does.

Test without a phone:

```sh
node scripts/whatsapp-sim.mts "Salam BENNA" "#menu" "#wp:casanearshore-2b" "1" "2"   # then "#slot:<id>" "#confirm"
node scripts/whatsapp-sim.mts --dup "Salam"     # second delivery is ignored
node scripts/whatsapp-sim.mts --bad-sig "Salam" # 401
pnpm test src/features/benna/__tests__/whatsapp-flow.test.ts
```

## Meta rules that apply

- Free-form replies only within **24 h of the customer's last message**; outside it Meta answers
  error 131047 and only an approved template can be sent. Status notifications from the admin
  are free-form, so accept orders the same day.
- The test number can only message the numbers on its recipient list (error 131030 otherwise).
- Temporary tokens expire after 24 h (error 190): generate a new one, or create a System User
  token in Business Settings for longer tests.
- Human hand-off: `BENNA_SUPPORT_PHONE` gets a wa.me link; the bot stays silent until "menu".

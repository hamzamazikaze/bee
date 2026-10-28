/**
 * POST /api/route — batched segment routing.
 *
 * Returns exactly one result per requested segment, in order, always. A dead routing
 * provider is not an error state: the response is the straight-line fallback and the
 * map draws straight lines (docs/FALLBACKS.md).
 */
import { z } from "zod";
import { osrmProvider } from "@/lib/routing/osrm";
import { TRIP_SEGMENT_COUNT } from "@/types/trip";

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const BodySchema = z.object({
  segments: z
    .array(
      z.object({
        from: CoordinatesSchema,
        to: CoordinatesSchema,
        mode: z.enum(["walking", "car"]),
      }),
    )
    .min(1)
    // A trip is TRIP_SEGMENT_COUNT segments; the ceiling is slack, not an invitation.
    .max(TRIP_SEGMENT_COUNT * 3),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const segments = await osrmProvider.calculateRoute(parsed.data.segments, request.signal);
  return Response.json({ segments });
}

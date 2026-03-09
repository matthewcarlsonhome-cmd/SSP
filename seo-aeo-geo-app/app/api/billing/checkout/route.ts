import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Stripe checkout session creation
// TODO: Implement when STRIPE_SECRET_KEY is configured
export async function POST(request: NextRequest) {
  try {
    const { packageName } = await request.json();

    // Stripe integration placeholder
    // When STRIPE_SECRET_KEY is set, this will create a Checkout Session:
    //
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({
    //   mode: "payment",
    //   line_items: [{ price: package.stripe_price_id, quantity: 1 }],
    //   success_url: `${origin}/billing?success=true`,
    //   cancel_url: `${origin}/billing?cancelled=true`,
    //   metadata: { packageName, userId },
    // });
    // return NextResponse.json({ url: session.url });

    return NextResponse.json(
      {
        error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your environment.",
        packageName,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

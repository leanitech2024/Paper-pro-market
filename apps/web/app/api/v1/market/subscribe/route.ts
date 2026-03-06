import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    return NextResponse.json(
        { success: false, error: "Gone", message: "Subscriptions are now handled client-side via WebSocket." },
        { status: 410 }
    );
}

export async function DELETE(req: NextRequest) {
    return NextResponse.json(
        { success: false, error: "Gone", message: "Subscriptions are now handled client-side via WebSocket." },
        { status: 410 }
    );
}

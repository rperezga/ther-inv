import { NextRequest, NextResponse } from "next/server";
import { verifyUserHasRole } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await verifyUserHasRole(req, [
      "admin",
      "manager",
    ]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { imageBase64, customApiKey } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image is required for AI extraction" },
        { status: 400 }
      );
    }

    // Determine API Key from custom input or environment variable
    const apiKey = customApiKey?.trim() || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No OpenAI API key provided. Please provide an API Key in the UI input or configure OPENAI_API_KEY in .env.local",
          missingKey: true,
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Format base64 data URL
    const imageUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const promptText = `
You are an expert medical billing assistant analyzing handwritten/printed healthcare agency visit summary sheets (such as therapy visit invoices like 'INVOICE 10/4/26 ODALYS' or 'ALC Weekly').
Carefully read the image and extract the agency name, staff/worker name, and each patient visit record.

IMPORTANT INSTRUCTION FOR MULTIPLE VISIT DATES PER PATIENT:
Often therapists (especially PTAs or PTs) write multiple visit dates on a single line next to a patient name separated by arrows, hyphens, slashes, or spaces!
Example from handwritten sheet:
"Fourz Gustavo -> 9/15 - 9/24" means TWO visits for patient "Fourz Gustavo": one on "9/15/26" and one on "9/24/26".
"Makan-Ingrah Veronica -> 9/15 - 9/17 - 9/22 - 9/24" means FOUR distinct visits for patient "Makan-Ingrah Veronica": "9/15", "9/17", "9/22", and "9/24".
"Castillos Marieta -> 9/14 - 9/18 - 9/24 - 9/25" means FOUR distinct visits: "9/14", "9/18", "9/24", and "9/25".

You MUST SPLIT each distinct date into its own separate record in the "records" array so every visit can be billed individually!
If a patient has 3 dates written, output 3 records in the "records" array for that patient.

Return a strictly valid JSON object matching this schema:
{
  "agencyName": string (e.g. "ALC" or "A&A HEALTH SERVICE" or what appears at top, or empty string),
  "staffName": string (if visible at top, e.g. "ODALYS", "Shirley Estor" or empty string),
  "records": [
    {
      "patientName": string (the patient full name, clean and without dates/arrows),
      "visitDate": string (the specific date for this visit, e.g. "9-15-26" or "9/15/26"),
      "suggestedService": string (if PTA: usually "Visit", or "Special Rate" if marked (SR), or "Missed Visit"; if PT: "SOC", "Eval", "ReCert", "ReEval", "Disch", "Visit", "Special Rate", "Missed Visit"),
      "notes": string (any extra info written next to the name, e.g. "(SR)")
    }
  ]
}

Instructions:
1. Examine each patient line and detect every individual date listed.
2. Note if any special code like (SR) or (Eval) or missed visit is written beside the patient name. If (SR), suggest "Special Rate".
3. Return ONLY pure JSON without markdown code fences or conversational text.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI vision model");
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("AI Extraction error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to process image with AI",
      },
      { status: 500 }
    );
  }
}

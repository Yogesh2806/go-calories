// Retired: Describe now calls Gemini directly from the browser with the user's own
// key (Settings → AI Food Parsing), so no server-side key is needed. This stub only
// exists so old clients get a clear answer; you can delete the whole src/app/api folder.
export function POST() {
  return Response.json(
    { error: "Server-side AI parsing was removed. Add your own Gemini key in Settings → AI Food Parsing." },
    { status: 410 },
  );
}

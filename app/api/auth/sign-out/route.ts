export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": "brightside_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      },
    },
  );
}
